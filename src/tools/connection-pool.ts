import { sql } from "kysely";
import { getDb } from "../db.js";
import { ConnectionPoolInputSchema, validateInput } from "../validation.js";

export interface ConnectionPoolMetrics {
  total_connections: number;
  active_connections: number;
  idle_connections: number;
  waiting_connections: number;
  max_connections: number;
  connection_utilization_pct: number;
  avg_connection_age_ms: number;
  max_connection_age_ms: number;
  total_connection_time_ms: number;
}

export interface ConnectionLeakInfo {
  pid: number;
  application_name: string;
  state: string;
  backend_start: string;
  query_start: string | null;
  duration_ms: number;
  query: string | null;
  is_potential_leak: boolean;
}

export interface ConnectionPoolOutput {
  pool_metrics?: ConnectionPoolMetrics;
  potential_leaks?: ConnectionLeakInfo[];
  recommendations?: string[];
  error?: string;
  timestamp?: string;
}

export async function connectionPoolTool(input: unknown): Promise<ConnectionPoolOutput> {
  try {
    const validation = validateInput(ConnectionPoolInputSchema, input);
    if (!validation.success) {
      return { error: `Input validation failed: ${validation.error}` };
    }

    const { database_name } = validation.data;
    const db = getDb(database_name);

    const metricsQuery = sql<ConnectionPoolMetrics>`
      SELECT
        COUNT(*) as total_connections,
        COUNT(*) FILTER (WHERE state = 'active') as active_connections,
        COUNT(*) FILTER (WHERE state = 'idle') as idle_connections,
        COUNT(*) FILTER (WHERE state = 'idle in transaction') as waiting_connections,
        current_setting('max_connections')::int as max_connections,
        ROUND(
          (COUNT(*)::float / current_setting('max_connections')::int) * 100,
          2
        ) as connection_utilization_pct,
        ROUND(EXTRACT(EPOCH FROM (NOW() - backend_start)) * 1000) as avg_connection_age_ms,
        ROUND(EXTRACT(EPOCH FROM (NOW() - backend_start)) * 1000) as max_connection_age_ms,
        0 as total_connection_time_ms
      FROM pg_stat_activity
      WHERE datname = current_database()
    `.execute(db);

    const leakQuery = sql<ConnectionLeakInfo>`
      SELECT
        pid,
        application_name,
        state,
        backend_start::text,
        query_start::text,
        ROUND(EXTRACT(EPOCH FROM (NOW() - backend_start)) * 1000) as duration_ms,
        LEFT(query, 200) as query,
        CASE
          WHEN EXTRACT(EPOCH FROM (NOW() - backend_start)) > 300 THEN true
          ELSE false
        END as is_potential_leak
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND state IN ('active', 'idle in transaction')
        AND application_name NOT IN ('pg_stat_statements', 'autovacuum worker')
      ORDER BY backend_start
      LIMIT 20
    `.execute(db);

    const [metricsResult, leakResult] = await Promise.all([metricsQuery, leakQuery]);
    const recommendations: string[] = [];
    const metrics = metricsResult.rows[0];
    const leaks = leakResult.rows;

    if (metrics.connection_utilization_pct > 80) {
      recommendations.push(
        `Connection utilization is ${metrics.connection_utilization_pct}% - consider increasing max_connections or optimizing connection pool size`,
      );
    }

    if (metrics.waiting_connections > 5) {
      recommendations.push(
        `${metrics.waiting_connections} connections waiting - investigate long-running transactions or connection leaks`,
      );
    }

    const potentialLeaks = leaks.filter((l) => l.is_potential_leak);
    if (potentialLeaks.length > 0) {
      recommendations.push(
        `${potentialLeaks.length} potential connection leaks detected (connections held > 5 minutes)`,
      );
    }

    if (metrics.idle_connections > metrics.active_connections * 2) {
      recommendations.push(
        `High idle connection ratio - consider reducing connection pool size to save resources`,
      );
    }

    return {
      pool_metrics: metrics,
      potential_leaks: leaks,
      recommendations,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
