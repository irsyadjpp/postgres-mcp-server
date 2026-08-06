import { sql } from "kysely";
import { getDb } from "../db.js";
import { ForeignKeyInputSchema, validateInput } from "../validation.js";

export interface ForeignKeyInfo {
  schema_name: string;
  table_name: string;
  constraint_name: string;
  referenced_schema: string;
  referenced_table: string;
  referenced_columns: string;
  has_index: boolean;
  index_name: string | null;
  fk_triggers: number;
  validation_status: string;
  recommendation: string;
}

export interface ForeignKeyPerformanceOutput {
  foreign_keys?: ForeignKeyInfo[];
  missing_indexes: number;
  error?: string;
}

export async function foreignKeyTool(input: unknown): Promise<ForeignKeyPerformanceOutput> {
  try {
    const validation = validateInput(ForeignKeyInputSchema, input);
    if (!validation.success) {
      return { error: `Input validation failed: ${validation.error}`, missing_indexes: 0 };
    }

    const { database_name } = validation.data;
    const db = getDb(database_name);

    const fkQuery = sql<ForeignKeyInfo>`
      SELECT
        n.nspname as schema_name,
        c.relname as table_name,
        con.conname as constraint_name,
        rn.nspname as referenced_schema,
        rc.relname as referenced_table,
        array_agg(a.attname ORDER BY k.attnum) as referenced_columns,
        EXISTS(
          SELECT 1 FROM pg_index i
          JOIN pg_class ic ON ic.oid = i.indexrelid
          WHERE i.indrelid = c.oid
            AND i.indisunique = true
            AND array_agg(a.attname ORDER BY k.attnum) @> array_agg(ic.relname)
        ) as has_index,
        (
          SELECT ic.relname FROM pg_index i
          JOIN pg_class ic ON ic.oid = i.indexrelid
          WHERE i.indrelid = c.oid
            AND i.indisunique = true
            AND array_agg(a.attname ORDER BY k.attnum) @> array_agg(ic.relname)
          LIMIT 1
        ) as index_name,
        0 as fk_triggers,
        'valid' as validation_status,
        CASE
          WHEN NOT EXISTS(
            SELECT 1 FROM pg_index i
            JOIN pg_class ic ON ic.oid = i.indexrelid
            WHERE i.indrelid = c.oid
              AND i.indisunique = true
              AND array_agg(a.attname ORDER BY k.attnum) @> array_agg(ic.relname)
          ) THEN 'Missing index on FK column - consider adding for better performance'
          ELSE 'FK has appropriate index'
        END as recommendation
      FROM pg_constraint con
      JOIN pg_class c ON c.oid = con.conrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_class rc ON rc.oid = con.confrelid
      JOIN pg_namespace rn ON rn.oid = rc.relnamespace
      JOIN pg_attribute a ON a.attrelid = rc.oid AND a.attnum = con.confkey[1]
      JOIN pg_attribute k ON k.attnum = con.confkey[1]
      WHERE con.contype = 'f'
        AND n.nspname NOT IN ('pg_catalog', 'information_schema')
      GROUP BY n.nspname, c.relname, con.conname, rn.nspname, rc.relname, c.oid
      ORDER BY n.nspname, c.relname, con.conname
    `.execute(db);

    const [fkResult] = await Promise.all([fkQuery]);
    const fks = fkResult.rows;
    const missingIndexes = fks.filter((fk: ForeignKeyInfo) => !fk.has_index).length;

    return {
      foreign_keys: fks,
      missing_indexes: missingIndexes,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error occurred",
      missing_indexes: 0,
    };
  }
}
