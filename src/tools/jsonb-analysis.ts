import { sql } from "kysely";
import { getDb } from "../db.js";
import { JSONBAnalysisInputSchema, validateInput } from "../validation.js";

export interface JSONBColumnInfo {
  schema_name: string;
  table_name: string;
  column_name: string;
  data_type: string;
  has_gin_index: boolean;
  has_gist_index: boolean;
  avg_jsonb_size: number;
  max_jsonb_size: number;
  sample_count: number;
}

export interface JSONBQueryPattern {
  schema_name: string;
  table_name: string;
  column_name: string;
  operator: string;
  query_count: number;
  recommendation: string;
}

export interface JSONBAnalysisOutput {
  jsonb_columns?: JSONBColumnInfo[];
  query_patterns?: JSONBQueryPattern[];
  recommendations?: string[];
  error?: string;
}

export async function jsonbAnalysisTool(input: unknown): Promise<JSONBAnalysisOutput> {
  try {
    const validation = validateInput(JSONBAnalysisInputSchema, input);
    if (!validation.success) {
      return { error: `Input validation failed: ${validation.error}` };
    }

    const { database_name } = validation.data;
    const db = getDb(database_name);

    const columnsQuery = sql<JSONBColumnInfo>`
      SELECT
        n.nspname as schema_name,
        c.relname as table_name,
        a.attname as column_name,
        format_type(a.atttypid, a.atttypmod) as data_type,
        EXISTS(
          SELECT 1 FROM pg_index i
          JOIN pg_class ic ON ic.oid = i.indexrelid
          JOIN pg_am am ON am.oid = ic.relam
          WHERE i.indrelid = c.oid
            AND a.attnum = ANY(i.indkey)
            AND am.amname = 'gin'
        ) as has_gin_index,
        EXISTS(
          SELECT 1 FROM pg_index i
          JOIN pg_class ic ON ic.oid = i.indexrelid
          JOIN pg_am am ON am.oid = ic.relam
          WHERE i.indrelid = c.oid
            AND a.attnum = ANY(i.indkey)
            AND am.amname = 'gist'
        ) as has_gist_index,
        COALESCE(avg(pg_column_size(a.attname)), 0) as avg_jsonb_size,
        COALESCE(max(pg_column_size(a.attname)), 0) as max_jsonb_size,
        COALESCE(count(*), 0) as sample_count
      FROM pg_attribute a
      JOIN pg_class c ON c.oid = a.attrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE a.atttypid = 'jsonb'::regtype
        AND n.nspname NOT IN ('pg_catalog', 'information_schema')
      GROUP BY n.nspname, c.relname, a.attname, a.atttypid, a.atttypmod, c.oid
      ORDER BY n.nspname, c.relname, a.attname
    `.execute(db);

    const patternsQuery = sql<JSONBQueryPattern>`
      SELECT
        n.nspname as schema_name,
        c.relname as table_name,
        a.attname as column_name,
        '->>' as operator,
        0 as query_count,
        CASE
          WHEN NOT EXISTS(
            SELECT 1 FROM pg_index i
            JOIN pg_class ic ON ic.oid = i.indexrelid
            JOIN pg_am am ON am.oid = ic.relam
            WHERE i.indrelid = c.oid
              AND a.attnum = ANY(i.indkey)
              AND am.amname = 'gin'
          ) THEN 'Consider adding GIN index for JSONB queries'
          ELSE 'GIN index exists'
        END as recommendation
      FROM pg_attribute a
      JOIN pg_class c ON c.oid = a.attrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE a.atttypid = 'jsonb'::regtype
        AND n.nspname NOT IN ('pg_catalog', 'information_schema')
      ORDER BY n.nspname, c.relname, a.attname
      LIMIT 20
    `.execute(db);

    const [columnsResult, patternsResult] = await Promise.all([columnsQuery, patternsQuery]);

    const recommendations: string[] = [];
    const columnsWithoutGin = columnsResult.rows.filter(
      (col: JSONBColumnInfo) => !col.has_gin_index && col.sample_count > 0,
    );
    if (columnsWithoutGin.length > 0) {
      recommendations.push(
        `${columnsWithoutGin.length} JSONB columns without GIN index - consider adding for better query performance`,
      );
    }

    return {
      jsonb_columns: columnsResult.rows,
      query_patterns: patternsResult.rows,
      recommendations: recommendations.length > 0 ? recommendations : undefined,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
