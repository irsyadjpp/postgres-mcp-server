import { sql } from "kysely";
import { getDb } from "../db.js";

export interface PartitionInfo {
  schema_name: string;
  parent_table: string;
  partition_name: string;
  partition_type: string;
  partition_expr: string;
  partition_bounds: string;
  is_leaf: boolean;
  row_count: number;
  size_bytes: number;
  size_pretty: string;
}

export interface PartitionPruningStats {
  schema_name: string;
  table_name: string;
  total_partitions: number;
  partitions_accessed: number;
  pruning_ratio: number;
  last_analyzed: string;
}

export interface ListPartitionsOutput {
  partitions?: PartitionInfo[];
  pruning_stats?: PartitionPruningStats[];
  error?: string;
}

export async function listPartitionsTool(input: unknown): Promise<ListPartitionsOutput> {
  try {
    const validation = validateInput(ListPartitionsInputSchema, input);
    if (!validation.success) {
      return { error: `Input validation failed: ${validation.error}` };
    }

    const { database_name } = validation.data;
    const db = getDb(database_name);

    const partitionsQuery = sql<PartitionInfo>`
      SELECT
        n.nspname as schema_name,
        c.relname as partition_name,
        p.relname as parent_table,
        CASE
          WHEN pg_get_partkeydef(p.oid) LIKE '%RANGE%' THEN 'range'
          WHEN pg_get_partkeydef(p.oid) LIKE '%LIST%' THEN 'list'
          WHEN pg_get_partkeydef(p.oid) LIKE '%HASH%' THEN 'hash'
          ELSE 'unknown'
        END as partition_type,
        pg_get_partkeydef(p.oid) as partition_expr,
        pg_get_expr(c.relpartbound, c.oid) as partition_bounds,
        c.relispartition as is_leaf,
        COALESCE(s.n_live_tup, 0) as row_count,
        pg_relation_size(c.oid) as size_bytes,
        pg_size_pretty(pg_relation_size(c.oid)) as size_pretty
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_inherits i ON c.oid = i.inhrelid
      JOIN pg_class p ON p.oid = i.inhparent
      LEFT JOIN pg_stat_user_tables s ON s.schemaname = n.nspname AND s.relname = c.relname
      WHERE c.relispartition = true
      ORDER BY n.nspname, p.relname, c.relname
    `.execute(db);

    const pruningQuery = sql<PartitionPruningStats>`
      SELECT
        schemaname as schema_name,
        relname as table_name,
        COUNT(*) as total_partitions,
        COALESCE(SUM(CASE WHEN n_live_tup > 0 THEN 1 ELSE 0 END), 0) as partitions_accessed,
        CASE
          WHEN COUNT(*) > 0 THEN
            ROUND((COALESCE(SUM(CASE WHEN n_live_tup > 0 THEN 1 ELSE 0 END), 0)::numeric / COUNT(*) * 100), 2)
          ELSE 0
        END as pruning_ratio,
        last_analyze::text
      FROM pg_partitioned_table pt
      JOIN pg_class c ON c.oid = pt.partrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      LEFT JOIN pg_stat_user_tables s ON s.schemaname = n.nspname AND s.relname = c.relname
      GROUP BY schemaname, relname, last_analyze
      ORDER BY schemaname, relname
    `.execute(db);

    const [partitionsResult, pruningResult] = await Promise.all([
      partitionsQuery,
      pruningQuery,
    ]);

    return {
      partitions: partitionsResult.rows,
      pruning_stats: pruningResult.rows,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
