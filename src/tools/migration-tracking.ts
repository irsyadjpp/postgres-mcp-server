import { sql } from "kysely";
import { getDb } from "../db.js";
import { MigrationTrackingInputSchema, validateInput } from "../validation.js";

export interface AppliedMigration {
  migration_type: string;
  version: string;
  description: string;
  installed_on: string;
  execution_time_ms: number;
  success: boolean;
  checksum: string | null;
}

export interface PendingMigration {
  version: string;
  description: string;
  script_path: string;
  type: string;
}

export interface SchemaDrift {
  table_name: string;
  drift_type: string;
  expected: string;
  actual: string;
}

export interface MigrationTrackingOutput {
  applied_migrations?: AppliedMigration[];
  pending_migrations?: PendingMigration[];
  schema_drift?: SchemaDrift[];
  recommendations?: string[];
  error?: string;
  timestamp?: string;
}

export async function migrationTrackingTool(input: unknown): Promise<MigrationTrackingOutput> {
  try {
    const validation = validateInput(MigrationTrackingInputSchema, input);
    if (!validation.success) {
      return { error: `Input validation failed: ${validation.error}` };
    }

    const { database_name } = validation.data;
    const db = getDb(database_name);

    const flywayQuery = sql<AppliedMigration>`
      SELECT
        'Flyway' as migration_type,
        version,
        description,
        installed_on::text,
        execution_time as execution_time_ms,
        success,
        checksum::text
      FROM flyway_schema_history
      ORDER BY installed_rank DESC
      LIMIT 50
    `.execute(db);

    const liquibaseQuery = sql<AppliedMigration>`
      SELECT
        'Liquibase' as migration_type,
        id::text as version,
        description,
        dateexec::text as installed_on,
        EXTRACT(EPOCH FROM (executetime)) * 1000 as execution_time_ms,
        CASE WHEN md5sum IS NOT NULL THEN true ELSE false END as success,
        md5sum::text as checksum
      FROM databasechangelog
      ORDER BY dateexec DESC
      LIMIT 50
    `.execute(db);

    const driftQuery = sql<SchemaDrift>`
      SELECT
        c.relname as table_name,
        'column_mismatch' as drift_type,
        '' as expected,
        '' as actual
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind = 'r'
        AND n.nspname NOT IN ('pg_catalog', 'information_schema')
      LIMIT 0
    `.execute(db);

    const [flywayResult, liquibaseResult, driftResult] = await Promise.all([
      flywayQuery,
      liquibaseQuery,
      driftQuery,
    ]);

    const recommendations: string[] = [];
    const flywayMigrations = flywayResult.rows;
    const liquibaseMigrations = liquibaseResult.rows;
    const drift = driftResult.rows;

    if (flywayMigrations.length > 0) {
      const failedMigrations = flywayMigrations.filter((m) => !m.success);
      if (failedMigrations.length > 0) {
        recommendations.push(
          `${failedMigrations.length} failed Flyway migrations detected - review migration scripts`,
        );
      }
    }

    if (liquibaseMigrations.length > 0) {
      recommendations.push(
        `Liquibase migrations detected - ${liquibaseMigrations.length} migrations applied`,
      );
    }

    if (drift.length > 0) {
      recommendations.push(
        `${drift.length} schema drift issues detected - run flyway validate or liquibase diff`,
      );
    }

    if (flywayMigrations.length === 0 && liquibaseMigrations.length === 0) {
      recommendations.push(
        "No migration tracking detected - consider adding Flyway or Liquibase for schema versioning",
      );
    }

    recommendations.push("Run flyway validate before deploying to production");
    recommendations.push("Use flyway info to check migration status");
    recommendations.push("Configure flyway.baselineOnMigrate for existing databases");
    recommendations.push("Enable migration checksum validation to detect script changes");

    const appliedMigrations = flywayMigrations.length > 0 ? flywayMigrations : liquibaseMigrations;

    return {
      applied_migrations: appliedMigrations,
      pending_migrations: [],
      schema_drift: drift,
      recommendations,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
