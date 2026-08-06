import { sql } from "kysely";
import { getDb } from "../db.js";
import { ProgressReportInputSchema, validateInput } from "../validation.js";

export interface VacuumProgress {
  pid: number;
  database: string;
  relation: string;
  phase: string;
  heap_blks_total: number;
  heap_blks_scanned: number;
  heap_blks_vacuumed: number;
  index_vacuum_count: number;
  max_dead_tuples: number;
  num_dead_tuples: number;
  progress_pct: number;
}

export interface AnalyzeProgress {
  pid: number;
  database: string;
  relation: string;
  phase: string;
  sample_blks_total: number;
  sample_blks_scanned: number;
  ext_stats_total: number;
  ext_stats_computed: number;
  child_tables_total: number;
  child_tables_done: number;
  current_child_table: string;
  progress_pct: number;
}

export interface ClusterProgress {
  pid: number;
  database: string;
  relation: string;
  phase: string;
  heap_blks_total: number;
  heap_blks_scanned: number;
  heap_tuples_total: number;
  heap_tuples_scanned: number;
  index_rebuild_count: number;
  progress_pct: number;
}

export interface CreateIndexProgress {
  pid: number;
  database: string;
  relation: string;
  index_name: string;
  phase: string;
  lockers_total: number;
  lockers_done: number;
  current_locker_pid: number;
  blocks_total: number;
  blocks_done: number;
  tuples_total: number;
  tuples_done: number;
  partitions_total: number;
  partitions_done: number;
  progress_pct: number;
}

export interface ProgressReportOutput {
  vacuum?: VacuumProgress[];
  analyze?: AnalyzeProgress[];
  cluster?: ClusterProgress[];
  create_index?: CreateIndexProgress[];
  error?: string;
  timestamp?: string;
}

export async function progressReportTool(input: unknown): Promise<ProgressReportOutput> {
  try {
    const validation = validateInput(ProgressReportInputSchema, input);
    if (!validation.success) {
      return { error: `Input validation failed: ${validation.error}` };
    }

    const { database_name } = validation.data;
    const db = getDb(database_name);

    const vacuumQuery = sql<VacuumProgress>`
      SELECT
        pid,
        datname as database,
        relid::regclass as relation,
        phase,
        heap_blks_total,
        heap_blks_scanned,
        heap_blks_vacuumed,
        index_vacuum_count,
        max_dead_tuples,
        num_dead_tuples,
        CASE
          WHEN heap_blks_total > 0 THEN
            ROUND((heap_blks_scanned::numeric / heap_blks_total * 100), 2)
          ELSE 0
        END as progress_pct
      FROM pg_stat_progress_vacuum
    `.execute(db);

    const analyzeQuery = sql<AnalyzeProgress>`
      SELECT
        pid,
        datname as database,
        relid::regclass as relation,
        phase,
        sample_blks_total,
        sample_blks_scanned,
        ext_stats_total,
        ext_stats_computed,
        child_tables_total,
        child_tables_done,
        current_child_table_relid::regclass as current_child_table,
        CASE
          WHEN sample_blks_total > 0 THEN
            ROUND((sample_blks_scanned::numeric / sample_blks_total * 100), 2)
          ELSE 0
        END as progress_pct
      FROM pg_stat_progress_analyze
    `.execute(db);

    const clusterQuery = sql<ClusterProgress>`
      SELECT
        pid,
        datname as database,
        relid::regclass as relation,
        phase,
        heap_blks_total,
        heap_blks_scanned,
        heap_tuples_total,
        heap_tuples_scanned,
        index_rebuild_count,
        CASE
          WHEN heap_blks_total > 0 THEN
            ROUND((heap_blks_scanned::numeric / heap_blks_total * 100), 2)
          ELSE 0
        END as progress_pct
      FROM pg_stat_progress_cluster
    `.execute(db);

    const createIndexQuery = sql<CreateIndexProgress>`
      SELECT
        pid,
        datname as database,
        relid::regclass as relation,
        index_relid::regclass as index_name,
        phase,
        lockers_total,
        lockers_done,
        current_locker_pid,
        blocks_total,
        blocks_done,
        tuples_total,
        tuples_done,
        partitions_total,
        partitions_done,
        CASE
          WHEN blocks_total > 0 THEN
            ROUND((blocks_done::numeric / blocks_total * 100), 2)
          ELSE 0
        END as progress_pct
      FROM pg_stat_progress_create_index
    `.execute(db);

    const [vacuumResult, analyzeResult, clusterResult, createIndexResult] = await Promise.all([
      vacuumQuery,
      analyzeQuery,
      clusterQuery,
      createIndexQuery,
    ]);

    return {
      vacuum: vacuumResult.rows,
      analyze: analyzeResult.rows,
      cluster: clusterResult.rows,
      create_index: createIndexResult.rows,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
