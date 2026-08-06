import { sql } from "kysely";
import { getDb } from "../db.js";

export interface AutovacuumTableInfo {
  schema_name: string;
  table_name: string;
  last_autovacuum: string;
  last_autoanalyze: string;
  dead_tuples: number;
  live_tuples: number;
  dead_tuple_pct: number;
  autovacuum_count: number;
  autoanalyze_count: number;
  size_bytes: number;
  size_pretty: string;
  current_autovacuum_threshold: number;
  recommended_autovacuum_threshold: string;
  current_autovacuum_scale_factor: number;
  recommended_autovacuum_scale_factor: string;
  recommendation: string;
  priority: string;
}

export interface AutovacuumGlobalInfo {
  autovacuum_enabled: boolean;
  autovacuum_max_workers: number;
  autovacuum_naptime: number;
  autovacuum_vacuum_threshold: number;
  autovacuum_vacuum_scale_factor: number;
  autovacuum_analyze_threshold: number;
  autovacuum_analyze_scale_factor: number;
}

export interface AutovacuumAdvisorOutput {
  global_settings?: AutovacuumGlobalInfo;
  table_recommendations?: AutovacuumTableInfo[];
  error?: string;
  timestamp?: string;
}

export async function autovacuumAdvisorTool(input: unknown): Promise<AutovacuumAdvisorOutput> {
  try {
    const validation = validateInput(AutovacuumAdvisorInputSchema, input);
    if (!validation.success) {
      return { error: `Input validation failed: ${validation.error}` };
    }

    const { database_name } = validation.data;
    const db = getDb(database_name);

    const globalQuery = sql<AutovacuumGlobalInfo>`
      SELECT
        setting::boolean as autovacuum_enabled,
        current_setting('autovacuum_max_workers')::int as autovacuum_max_workers,
        current_setting('autovacuum_naptime')::int as autovacuum_naptime,
        current_setting('autovacuum_vacuum_threshold')::int as autovacuum_vacuum_threshold,
        current_setting('autovacuum_vacuum_scale_factor')::float as autovacuum_vacuum_scale_factor,
        current_setting('autovacuum_analyze_threshold')::int as autovacuum_analyze_threshold,
        current_setting('autovacuum_analyze_scale_factor')::float as autovacuum_analyze_scale_factor
    `.execute(db);

    const tablesQuery = sql<AutovacuumTableInfo>`
      SELECT
        schemaname as schema_name,
        relname as table_name,
        COALESCE(last_autovacuum::text, 'never') as last_autovacuum,
        COALESCE(last_autoanalyze::text, 'never') as last_autoanalyze,
        n_dead_tup as dead_tuples,
        n_live_tup as live_tuples,
        CASE
          WHEN n_live_tup > 0 THEN
            ROUND((n_dead_tup::numeric / GREATEST(n_live_tup, 1) * 100), 2)
          ELSE 0
        END as dead_tuple_pct,
        autovacuum_count,
        autoanalyze_count,
        pg_relation_size(schemaname||'.'||relname) as size_bytes,
        pg_size_pretty(pg_relation_size(schemaname||'.'||relname)) as size_pretty,
        COALESCE(
          (SELECT setting::int FROM pg_settings WHERE name = 'autovacuum_vacuum_threshold'),
          50
        ) as current_autovacuum_threshold,
        CASE
          WHEN n_live_tup > 1000000 THEN '1000'
          WHEN n_live_tup > 100000 THEN '500'
          ELSE '50'
        END as recommended_autovacuum_threshold,
        COALESCE(
          (SELECT setting::float FROM pg_settings WHERE name = 'autovacuum_vacuum_scale_factor'),
          0.2
        ) as current_autovacuum_scale_factor,
        CASE
          WHEN n_live_tup > 1000000 THEN '0.05'
          WHEN n_live_tup > 100000 THEN '0.1'
          ELSE '0.2'
        END as recommended_autovacuum_scale_factor,
        CASE
          WHEN n_dead_tup > 1000000 THEN 'Increase autovacuum frequency - high dead tuples'
          WHEN n_dead_tup > 100000 THEN 'Consider lowering autovacuum threshold'
          WHEN dead_tuple_pct > 20 THEN 'High dead tuple ratio - tune autovacuum'
          ELSE 'Autovacuum settings appear adequate'
        END as recommendation,
        CASE
          WHEN n_dead_tup > 1000000 THEN 'high'
          WHEN n_dead_tup > 100000 OR dead_tuple_pct > 20 THEN 'medium'
          ELSE 'low'
        END as priority
      FROM pg_stat_user_tables
      WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
      ORDER BY n_dead_tup DESC
      LIMIT 50
    `.execute(db);

    const [globalResult, tablesResult] = await Promise.all([
      globalQuery,
      tablesQuery,
    ]);

    return {
      global_settings: globalResult.rows[0],
      table_recommendations: tablesResult.rows,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
