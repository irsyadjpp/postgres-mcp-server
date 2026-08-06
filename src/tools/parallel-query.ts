import { sql } from "kysely";
import { getDb } from "../db.js";
import { ParallelQueryInputSchema, validateInput } from "../validation.js";

export interface ParallelQueryInfo {
  query_id: string;
  database: string;
  user: string;
  query_preview: string;
  planned_workers: number;
  launched_workers: number;
  total_workers: number;
  leader_pid: number;
  duration_seconds: number;
  state: string;
}

export interface ParallelWorkerStats {
  total_parallel_queries: number;
  total_workers_launched: number;
  avg_workers_per_query: number;
  max_parallel_degree: number;
  parallel_workers_available: number;
}

export interface ParallelQueryOutput {
  parallel_queries?: ParallelQueryInfo[];
  worker_stats?: ParallelWorkerStats;
  error?: string;
  timestamp?: string;
}

export async function parallelQueryTool(input: unknown): Promise<ParallelQueryOutput> {
  try {
    const validation = validateInput(ParallelQueryInputSchema, input);
    if (!validation.success) {
      return { error: `Input validation failed: ${validation.error}` };
    }

    const { database_name } = validation.data;
    const db = getDb(database_name);

    const queriesQuery = sql<ParallelQueryInfo>`
      SELECT
        queryid::text as query_id,
        datname as database,
        usename as user,
        LEFT(query, 200) as query_preview,
        COALESCE(plan_total_time, 0) as planned_workers,
        COALESCE(plans, 0) as launched_workers,
        COALESCE(total_plan_time, 0) as total_workers,
        0 as leader_pid,
        COALESCE(mean_exec_time, 0) as duration_seconds,
        'active' as state
      FROM pg_stat_statements
      WHERE COALESCE(plan_total_time, 0) > 0
      ORDER BY COALESCE(total_plan_time, 0) DESC
      LIMIT 20
    `.execute(db);

    const statsQuery = sql<ParallelWorkerStats>`
      SELECT
        COUNT(*) as total_parallel_queries,
        COALESCE(SUM(COALESCE(plan_total_time, 0)), 0) as total_workers_launched,
        COALESCE(AVG(COALESCE(plan_total_time, 0)), 0) as avg_workers_per_query,
        COALESCE(MAX(COALESCE(plan_total_time, 0)), 0) as max_parallel_degree,
        current_setting('max_parallel_workers')::int as parallel_workers_available
      FROM pg_stat_statements
      WHERE COALESCE(plan_total_time, 0) > 0
    `.execute(db);

    const [queriesResult, statsResult] = await Promise.all([queriesQuery, statsQuery]);

    const statsRow = statsResult.rows[0];
    const workerStats: ParallelWorkerStats = {
      total_parallel_queries: Number(statsRow?.total_parallel_queries || 0),
      total_workers_launched: Number(statsRow?.total_workers_launched || 0),
      avg_workers_per_query: Number(statsRow?.avg_workers_per_query || 0),
      max_parallel_degree: Number(statsRow?.max_parallel_degree || 0),
      parallel_workers_available: Number(statsRow?.parallel_workers_available || 0),
    };

    return {
      parallel_queries: queriesResult.rows,
      worker_stats: workerStats,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
