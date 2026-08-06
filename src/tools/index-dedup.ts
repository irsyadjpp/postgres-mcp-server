import { sql } from "kysely";
import { getDb } from "../db.js";
import { IndexDedupInputSchema, validateInput } from "../validation.js";

export interface IndexDedupInfo {
  schema_name: string;
  table_name: string;
  index_name: string;
  index_type: string;
  columns: string;
  size_bytes: number;
  size_pretty: string;
  deduplication_potential: string;
  recommendation: string;
}

export interface IndexDedupOutput {
  dedup_candidates?: IndexDedupInfo[];
  error?: string;
}

export async function indexDedupTool(input: unknown): Promise<IndexDedupOutput> {
  try {
    const validation = validateInput(IndexDedupInputSchema, input);
    if (!validation.success) {
      return { error: `Input validation failed: ${validation.error}` };
    }

    const { database_name } = validation.data;
    const db = getDb(database_name);

    const dedupQuery = sql<IndexDedupInfo>`
      SELECT
        n.nspname as schema_name,
        c.relname as table_name,
        i.relname as index_name,
        am.amname as index_type,
        regexp_replace(
          regexp_replace(pg_get_indexdef(i.oid), '.*\\((.*?)\\).*', '\\1'),
          ' COLLATE [^,)]+', '', 'g'
        ) as columns,
        pg_relation_size(i.oid) as size_bytes,
        pg_size_pretty(pg_relation_size(i.oid)) as size_pretty,
        CASE
          WHEN am.amname = 'btree' AND pg_relation_size(i.oid) > 1048576 THEN 'high'
          WHEN am.amname = 'btree' THEN 'medium'
          ELSE 'low'
        END as deduplication_potential,
        CASE
          WHEN am.amname = 'btree' AND pg_relation_size(i.oid) > 1048576 THEN
            'Consider REINDEX to enable deduplication (PostgreSQL 13+)'
          ELSE 'Deduplication only applies to B-tree indexes'
        END as recommendation
      FROM pg_index ix
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_class c ON c.oid = ix.indrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_am am ON am.oid = i.relam
      WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
        AND i.relkind = 'i'
        AND am.amname = 'btree'
        AND NOT i.relname LIKE '%_pkey'
      ORDER BY pg_relation_size(i.oid) DESC
      LIMIT 50
    `.execute(db);

    return {
      dedup_candidates: dedupQuery.rows,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
