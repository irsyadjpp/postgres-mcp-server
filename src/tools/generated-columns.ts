import { sql } from "kysely";
import { getDb } from "../db.js";

export interface GeneratedColumnInfo {
  schema_name: string;
  table_name: string;
  column_name: string;
  data_type: string;
  generation_type: string;
  expression: string;
  is_stored: boolean;
  dependencies: string[];
}

export interface GeneratedColumnsOutput {
  generated_columns?: GeneratedColumnInfo[];
  error?: string;
}

export async function generatedColumnsTool(input: unknown): Promise<GeneratedColumnsOutput> {
  try {
    const validation = validateInput(GeneratedColumnsInputSchema, input);
    if (!validation.success) {
      return { error: `Input validation failed: ${validation.error}` };
    }

    const { database_name } = validation.data;
    const db = getDb(database_name);

    const columnsQuery = sql<GeneratedColumnInfo>`
      SELECT
        n.nspname as schema_name,
        c.relname as table_name,
        a.attname as column_name,
        format_type(a.atttypid, a.atttypmod) as data_type,
        CASE a.attgenerated
          WHEN 's' THEN 'stored'
          WHEN 'e' THEN 'virtual'
          ELSE 'unknown'
        END as generation_type,
        pg_get_expr(ad.adbin, ad.adrelid) as expression,
        a.attgenerated = 's' as is_stored,
        array_agg(
          DISTINCT pg_get_expr(d.adbin, d.adrelid)
          FILTER WHERE d.adrelid = c.oid
        ) as dependencies
      FROM pg_attribute a
      JOIN pg_class c ON c.oid = a.attrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_attrdef ad ON ad.adrelid = c.oid AND ad.adnum = a.attnum
      LEFT JOIN pg_depend d ON d.refobjid = c.oid AND d.refclassid = 'pg_class'::regclass
      WHERE a.attgenerated IN ('s', 'e')
        AND n.nspname NOT IN ('pg_catalog', 'information_schema')
      GROUP BY n.nspname, c.relname, a.attname, a.atttypid, a.atttypmod, a.attgenerated, ad.adbin, ad.adrelid
      ORDER BY n.nspname, c.relname, a.attnum
    `.execute(db);

    return {
      generated_columns: columnsQuery.rows,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
