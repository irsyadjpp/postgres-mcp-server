import { sql } from "kysely";
import { getDb } from "../db.js";

export interface EnhancedStatementInfo {
  query_id: string;
  database: string;
  user: string;
  query_preview: string;
  calls: number;
  total_exec_time_ms: number;
  mean_exec_time_ms: number;
  max_exec_time_ms: number;
  total_plan_time_ms: number;
  mean_plan_time_ms: number;
  parallel_workers_launched: number;
  wal_bytes: number;
  wal_bytes_pretty: string;
  shared_blks_hit: number;
  shared_blks_read: number;
  local_blks_hit: number;
  local_blks_read: number;
  temp_blks_read: number;
  temp_blks_written: number;
}

export interface EnhancedStatementsOutput {
  statements?: EnhancedStatementInfo[];
  error?: string;
  timestamp?: string;
}

export async function statementsEnhancedTool(input: unknown): Promise<EnhancedStatementsOutput> {
  try {
    const db = getDb();

    const query = sql<EnhancedStatementInfo>`
      SELECT
        queryid::text as query_id,
        datname as database,
        usename as user,
        LEFT(query, 200) as query_preview,
        calls,
        total_exec_time as total_exec_time_ms,
        mean_exec_time as mean_exec_time_ms,
        max_exec_time as max_exec_time_ms,
        total_plan_time as total_plan_time_ms,
        mean_plan_time as mean_plan_time_ms,
        COALESCE(parallel_workers_launched, 0) as parallel_workers_launched,
        COALESCE(wal_bytes, 0) as wal_bytes,
        pg_size_pretty(COALESCE(wal_bytes, 0)) as wal_bytes_pretty,
        shared_blks_hit,
        shared_blks_read,
        local_blks_hit,
        local_blks_read,
        temp_blks_read,
        temp_blks_written
      FROM pg_stat_statements
      ORDER BY total_exec_time DESC
      LIMIT 50
    `.execute(db);

    return {
      statements: query.rows,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
