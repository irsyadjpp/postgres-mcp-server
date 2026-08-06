import { sql } from "kysely";
import { getDb } from "../db.js";
import { PreparedStatementInputSchema, validateInput } from "../validation.js";

export interface PreparedStatementStats {
  total_prepared_statements: number;
  cache_hit_ratio: number;
  cache_misses: number;
  avg_prep_time_ms: number;
  total_prep_time_ms: number;
}

export interface FrequentQuery {
  query_id: string;
  query_preview: string;
  calls: number;
  total_exec_time_ms: number;
  mean_exec_time_ms: number;
  rows_per_call: number;
  is_prepared: boolean;
  recommendation: string;
}

export interface PreparedStatementOutput {
  statement_stats?: PreparedStatementStats;
  frequent_queries?: FrequentQuery[];
  recommendations?: string[];
  error?: string;
  timestamp?: string;
}

export async function preparedStatementTool(input: unknown): Promise<PreparedStatementOutput> {
  try {
    const validation = validateInput(PreparedStatementInputSchema, input);
    if (!validation.success) {
      return { error: `Input validation failed: ${validation.error}` };
    }

    const { database_name } = validation.data;
    const db = getDb(database_name);

    const statsQuery = sql<PreparedStatementStats>`
      SELECT
        COUNT(*) as total_prepared_statements,
        0 as cache_hit_ratio,
        0 as cache_misses,
        0 as avg_prep_time_ms,
        0 as total_prep_time_ms
      FROM pg_prepared_statements
    `.execute(db);

    const frequentQuery = sql<FrequentQuery>`
      SELECT
        queryid::text as query_id,
        LEFT(query, 200) as query_preview,
        calls,
        total_exec_time as total_exec_time_ms,
        mean_exec_time as mean_exec_time_ms,
        ROUND(COALESCE(rows::float / NULLIF(calls, 0), 0), 2) as rows_per_call,
        CASE
          WHEN query ILIKE '%$%' THEN true
          ELSE false
        END as is_prepared,
        CASE
          WHEN calls > 1000 AND query NOT ILIKE '%$%' THEN
            'Consider using prepared statement for this frequently executed query'
          ELSE 'No issue detected'
        END as recommendation
      FROM pg_stat_statements
      WHERE calls > 10
        AND query NOT ILIKE '%pg_%'
      ORDER BY calls DESC
      LIMIT 30
    `.execute(db);

    const [statsResult, frequentResult] = await Promise.all([statsQuery, frequentQuery]);

    const recommendations: string[] = [];
    const stats = statsResult.rows[0];
    const queries = frequentResult.rows;

    const notPrepared = queries.filter((q) => !q.is_prepared && q.calls > 1000);
    if (notPrepared.length > 0) {
      recommendations.push(
        `${notPrepared.length} frequently executed queries not using prepared statements - consider JDBC PreparedStatement`,
      );
    }

    const slowPrepared = queries.filter((q) => q.is_prepared && q.mean_exec_time_ms > 100);
    if (slowPrepared.length > 0) {
      recommendations.push(
        `${slowPrepared.length} prepared statements with slow execution - review query plans and indexes`,
      );
    }

    recommendations.push(
      "Enable prepared statement cache in HikariCP: dataSource.setCachePrepStmts(true)",
    );
    recommendations.push("Set prepStmtCacheSize in HikariCP (default: 256)");
    recommendations.push("Use @Query annotations with parameterized queries in Spring Data JPA");
    recommendations.push(
      "Monitor pg_stat_statements for query patterns and optimization opportunities",
    );

    return {
      statement_stats: stats,
      frequent_queries: queries,
      recommendations,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
