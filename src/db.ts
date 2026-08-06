import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { Kysely, PostgresDialect } from "kysely";
import { Pool, type PoolConfig } from "pg";

dotenv.config();

export interface Database {
  // biome-ignore lint/suspicious/noExplicitAny: required for Kysely dynamic schema access
  [key: string]: any;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  maxConnections: number;
  idleTimeoutMs: number;
  ssl: boolean | { rejectUnauthorized: boolean; ca?: string };
  connectionTimeoutMs: number;
  queryTimeoutMs: number;
}

export interface ConnectionConfig {
  host: string;
  port?: number;
  user: string;
  password: string;
  database: string;
  ssl?: boolean | { rejectUnauthorized: boolean; ca?: string };
}

interface DatabaseConnection {
  db: Kysely<Database>;
  pool: Pool;
  config: DatabaseConfig;
}

class DatabaseManager {
  private static instance: DatabaseManager | null = null;
  private connections: Map<string, DatabaseConnection> = new Map();
  private configurations: Map<string, DatabaseConfig> = new Map();

  private constructor() {
    this.loadConfigurations();
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  private loadConfigurations(): void {
    // Option B: Load from JSON config file if DB_CONFIG_PATH is set
    if (process.env.DB_CONFIG_PATH) {
      this.loadFromJsonConfig(process.env.DB_CONFIG_PATH);
      return;
    }

    // Option A: Load from environment variables
    this.loadFromEnvironmentVariables();
  }

  private loadFromJsonConfig(configPath: string): void {
    try {
      const absolutePath = path.resolve(configPath);
      const configContent = fs.readFileSync(absolutePath, "utf-8");
      const config = JSON.parse(configContent);

      if (!config.databases || !Array.isArray(config.databases)) {
        throw new Error("Invalid config format: 'databases' array is required");
      }

      for (const dbConfig of config.databases) {
        const name = dbConfig.name;
        if (!name || typeof name !== "string") {
          throw new Error("Each database config must have a 'name' field");
        }

        this.configurations.set(name, this.normalizeConfig(dbConfig));
      }
    } catch (error) {
      throw new Error(`Failed to load config from ${configPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private loadFromEnvironmentVariables(): void {
    // Load default database configuration
    if (!process.env.DB_PASSWORD) {
      throw new Error("DB_PASSWORD environment variable is required");
    }

    this.configurations.set("default", {
      host: process.env.DB_HOST || "127.0.0.1",
      port: parseInt(process.env.DB_PORT || "5432", 10),
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || "postgres",
      maxConnections: parseInt(process.env.DB_POOL_MAX || "5", 10),
      idleTimeoutMs: parseInt(process.env.DB_IDLE_TIMEOUT || "5000", 10),
      connectionTimeoutMs: parseInt(process.env.DB_CONNECTION_TIMEOUT || "10000", 10),
      queryTimeoutMs: parseInt(process.env.DB_QUERY_TIMEOUT || "30000", 10),
      ssl: this.buildSSLConfig(),
    });

    // Load additional database configurations
    const envVars = Object.keys(process.env);
    const databaseNames = new Set<string>();

    for (const envVar of envVars) {
      const match = envVar.match(/^DB_([A-Z0-9_]+)_HOST$/);
      if (match) {
        databaseNames.add(match[1]);
      }
    }

    for (const dbName of databaseNames) {
      if (dbName === "DEFAULT") continue; // Skip default as it's already loaded

      const prefix = `DB_${dbName}_`;
      const password = process.env[`${prefix}PASSWORD`];

      if (!password) {
        console.warn(`Skipping database '${dbName.toLowerCase()}': DB_${dbName}_PASSWORD is required`);
        continue;
      }

      this.configurations.set(dbName.toLowerCase(), {
        host: process.env[`${prefix}HOST`] || "127.0.0.1",
        port: parseInt(process.env[`${prefix}PORT`] || "5432", 10),
        user: process.env[`${prefix}USER`] || "postgres",
        password,
        database: process.env[`${prefix}DATABASE`] || dbName.toLowerCase(),
        maxConnections: parseInt(process.env[`${prefix}POOL_MAX`] || "5", 10),
        idleTimeoutMs: parseInt(process.env[`${prefix}IDLE_TIMEOUT`] || "5000", 10),
        connectionTimeoutMs: parseInt(process.env[`${prefix}CONNECTION_TIMEOUT`] || "10000", 10),
        queryTimeoutMs: parseInt(process.env[`${prefix}QUERY_TIMEOUT`] || "30000", 10),
        ssl: this.buildSSLConfigForPrefix(prefix),
      });
    }
  }

  private normalizeConfig(config: any): DatabaseConfig {
    return {
      host: config.host || "127.0.0.1",
      port: config.port || 5432,
      user: config.user || "postgres",
      password: config.password,
      database: config.database,
      maxConnections: config.maxConnections || 5,
      idleTimeoutMs: config.idleTimeoutMs || 5000,
      connectionTimeoutMs: config.connectionTimeoutMs || 10000,
      queryTimeoutMs: config.queryTimeoutMs || 30000,
      ssl: config.ssl !== undefined ? config.ssl : true,
    };
  }

  private buildSSLConfig(): boolean | { rejectUnauthorized: boolean; ca?: string } {
    return this.buildSSLConfigForPrefix("DB_");
  }

  private buildSSLConfigForPrefix(prefix: string): boolean | { rejectUnauthorized: boolean; ca?: string } {
    if (process.env[`${prefix}SSL`] === "false") {
      return false;
    }

    const sslConfig: { rejectUnauthorized: boolean; ca?: string } = {
      rejectUnauthorized: process.env[`${prefix}SSL_REJECT_UNAUTHORIZED`] !== "false",
    };

    // Add CA certificate if provided
    if (process.env[`${prefix}SSL_CA_CERT`]) {
      sslConfig.ca = process.env[`${prefix}SSL_CA_CERT`];
    }

    // For when explicitly allowing self-signed certs
    if (process.env[`${prefix}SSL_ALLOW_SELF_SIGNED`] === "true") {
      sslConfig.rejectUnauthorized = false;
    }

    return sslConfig;
  }

  public getDatabase(databaseName?: string): Kysely<Database> {
    const name = databaseName || "default";
    return this.getDb(name);
  }

  private getDb(databaseName: string): Kysely<Database> {
    // Check if connection already exists
    if (this.connections.has(databaseName)) {
      return this.connections.get(databaseName)!.db;
    }

    // Lazy initialization: create connection on first access
    this.createConnection(databaseName);
    return this.connections.get(databaseName)!.db;
  }

  public createConnection(name: string, config?: DatabaseConfig | ConnectionConfig): void {
    if (this.connections.has(name)) {
      return; // Connection already exists
    }

    const dbConfig = config ? this.normalizeConfig(config) : this.configurations.get(name);

    if (!dbConfig) {
      throw new Error(`Database configuration not found for '${name}'`);
    }

    const poolConfig: PoolConfig = {
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      max: dbConfig.maxConnections,
      idleTimeoutMillis: dbConfig.idleTimeoutMs,
      connectionTimeoutMillis: dbConfig.connectionTimeoutMs,
      statement_timeout: dbConfig.queryTimeoutMs,
      query_timeout: dbConfig.queryTimeoutMs,
      ssl: dbConfig.ssl,
    };

    const pool = new Pool(poolConfig);

    pool.on("error", (err) => {
      console.error(`Database pool error for '${name}':`, {
        message: err.message,
        // biome-ignore lint/suspicious/noExplicitAny: pg error object has code property not in Error type
        code: (err as any).code,
        timestamp: new Date().toISOString(),
      });
    });

    pool.on("connect", () => {
      if (process.env.NODE_ENV === "development") {
        // Database connection established
      }
    });

    const db = new Kysely<Database>({
      dialect: new PostgresDialect({
        pool,
      }),
    });

    this.connections.set(name, { db, pool, config: dbConfig });
  }


  public async close(): Promise<void> {
    const closePromises: Promise<void>[] = [];

    for (const [name, connection] of this.connections.entries()) {
      closePromises.push(
        (async () => {
          await connection.db.destroy();
          if (!connection.pool.ended) {
            await connection.pool.end();
          }
        })()
      );
    }

    await Promise.all(closePromises);
    this.connections.clear();
  }

  public async closeDatabase(name: string): Promise<void> {
    const connection = this.connections.get(name);
    if (!connection) {
      throw new Error(`No active connection found for database '${name}'`);
    }

    await connection.db.destroy();
    if (!connection.pool.ended) {
      await connection.pool.end();
    }

    this.connections.delete(name);
  }

  public async healthCheck(databaseName?: string): Promise<{ healthy: boolean; error?: string }> {
    try {
      const name = databaseName || "default";
      const db = this.getDb(name);

      await db.selectFrom("information_schema.tables")
        .select("table_name")
        .limit(1)
        .execute();

      return { healthy: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        healthy: false,
        error: errorMessage,
      };
    }
  }

  public getConfig(databaseName?: string): DatabaseConfig {
    const name = databaseName || "default";
    const config = this.configurations.get(name);
    if (!config) {
      throw new Error(`Configuration not found for database '${name}'`);
    }
    return { ...config }; // Return a copy to prevent modification
  }

  public isConnected(databaseName?: string): boolean {
    const name = databaseName || "default";
    return this.connections.has(name);
  }

  public listConfiguredDatabases(): string[] {
    return Array.from(this.configurations.keys());
  }

  public listActiveConnections(): string[] {
    return Array.from(this.connections.keys());
  }
}

export function getDb(databaseName?: string): Kysely<Database> {
  return DatabaseManager.getInstance().getDatabase(databaseName);
}

export async function closeDb(): Promise<void> {
  await DatabaseManager.getInstance().close();
}

export function getDbManager(): DatabaseManager {
  return DatabaseManager.getInstance();
}
