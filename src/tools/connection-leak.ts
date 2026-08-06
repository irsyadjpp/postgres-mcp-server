import { sql } from "kysely";
import { getDb } from "../db.js";
import { ConnectionLeakInputSchema, validateInput } from "../validation.js";

export interface LeakedConnection {
  pid: number;
  application_name: string;
  state: string;
  backend_start: string;
  query_start: string | null;
  duration_ms: number;
  query: string | null;
  leak_severity: string;
  recommendation: string;
}

export interface ConnectionAcquisitionPattern {
  application_name: string;
  total_connections: number;
  avg_hold_time_ms: number;
  max_hold_time_ms: number;
  leak_probability: string;
}

export interface ConnectionLeakOutput {
  leaked_connections?: LeakedConnection[];
  acquisition_patterns?: ConnectionAcquisitionPattern[];
  recommendations?: string[];
  error?: string;
  timestamp?: string;
}

export async function connectionLeakTool(input: unknown): Promise<ConnectionLeakOutput> {
  try {
    const validation = validateInput(ConnectionLeakInputSchema, input);
    if (!validation.success) {
      return { error: `Input validation failed: ${validation.error}` };
    }

    const { database_name } = validation.data;
    const db = getDb(database_name);

    const leakedQuery = sql<LeakedConnection>`
      SELECT
        pid,
        application_name,
        state,
        backend_start::text,
        query_start::text,
        ROUND(EXTRACT(EPOCH FROM (NOW() - backend_start)) * 1000) as duration_ms,
        LEFT(query, 200) as query,
        CASE
          WHEN EXTRACT(EPOCH FROM (NOW() - backend_start)) > 3600000 THEN 'CRITICAL'
          WHEN EXTRACT(EPOCH FROM (NOW() - backend_start)) > 300000 THEN 'HIGH'
          WHEN EXTRACT(EPOCH FROM (NOW() - backend_start)) > 60000 THEN 'MEDIUM'
          ELSE 'LOW'
        END as leak_severity,
        CASE
          WHEN EXTRACT(EPOCH FROM (NOW() - backend_start)) > 3600000 THEN
            'Critical leak - investigate application code immediately'
          WHEN EXTRACT(EPOCH FROM (NOW() - backend_start)) > 300000 THEN
            'High severity - check for unclosed connections'
          WHEN EXTRACT(EPOCH FROM (NOW() - backend_start)) > 60000 THEN
            'Medium severity - review connection handling'
          ELSE 'No immediate action needed'
        END as recommendation
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND state IN ('active', 'idle in transaction')
        AND application_name NOT IN ('pg_stat_statements', 'autovacuum worker')
      ORDER BY backend_start
      LIMIT 50
    `.execute(db);

    const patternQuery = sql<ConnectionAcquisitionPattern>`
      SELECT
        application_name,
        COUNT(*) as total_connections,
        ROUND(AVG(EXTRACT(EPOCH FROM (NOW() - backend_start)) * 1000)) as avg_hold_time_ms,
        ROUND(MAX(EXTRACT(EPOCH FROM (NOW() - backend_start)) * 1000)) as max_hold_time_ms,
        CASE
          WHEN MAX(EXTRACT(EPOCH FROM (NOW() - backend_start))) > 300000 THEN 'HIGH'
          WHEN MAX(EXTRACT(EPOCH FROM (NOW() - backend_start))) > 60000 THEN 'MEDIUM'
          ELSE 'LOW'
        END as leak_probability
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND state IN ('active', 'idle in transaction')
        AND application_name NOT IN ('pg_stat_statements', 'autovacuum worker')
      GROUP BY application_name
      ORDER BY max_hold_time_ms DESC
      LIMIT 20
    `.execute(db);

    const recommendations: string[] = [];
    const leaked = leakedQuery.rows;
    const patterns = patternQuery.rows;

    const critical = leaked.filter((l) => l.leak_severity === 'CRITICAL');
    if (critical.length > 0) {
      recommendations.push(
        `${critical.length} critical connection leaks detected - immediate action required`
      );
    }

    const high = leaked.filter((l) => l.leak_severity === 'HIGH');
    if (high.length > 0) {
      recommendations.push(
        `${high.length} high-severity connection leaks - investigate application code`
      );
    }

    const highRiskApps = patterns.filter((p) => p.leak_probability === 'HIGH');
    if (highRiskApps.length > 0) {
      recommendations.push(
        `${highRiskApps.length} applications with high leak probability - review connection handling`
      );
    }

    recommendations.push(
      'Use try-with-resources or try-finally for connection cleanup in Java'
    );
    recommendations.push(
      'Set connection timeout in HikariCP: setConnectionTimeout(30000)'
    );
    recommendations.push(
      'Enable leak detection threshold: setLeakDetectionThreshold(2000)'
    );
    recommendations.push(
      'Monitor connection pool metrics via JMX or Micrometer'
    );
    recommendations.push(
      'Review @Transactional annotation usage and ensure proper rollback handling'
    );
    recommendations.push(
      'Check for unclosed ResultSet and Statement objects'
    );

    return {
      leaked_connections: leaked,
      acquisition_patterns: patterns,
      recommendations,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
