import { sql } from "kysely";
import { getDb } from "../db.js";
import { JpaMappingInputSchema, validateInput } from "../validation.js";

export interface TableEntityMapping {
  schema_name: string;
  table_name: string;
  has_entity_mapping: boolean;
  entity_class_pattern: string | null;
  column_count: number;
  primary_key_count: number;
  foreign_key_count: number;
  index_count: number;
  has_jpa_annotations: boolean;
  mapping_status: string;
}

export interface OrphanedTable {
  schema_name: string;
  table_name: string;
  row_count: number;
  table_size_bytes: number;
  last_modified: string;
}

export interface JpaMappingOutput {
  table_entity_mappings?: TableEntityMapping[];
  orphaned_tables?: OrphanedTable[];
  recommendations?: string[];
  error?: string;
  timestamp?: string;
}

export async function jpaMappingTool(input: unknown): Promise<JpaMappingOutput> {
  try {
    const validation = validateInput(JpaMappingInputSchema, input);
    if (!validation.success) {
      return { error: `Input validation failed: ${validation.error}` };
    }

    const { database_name, schema } = validation.data;
    const db = getDb(database_name);

    const schemaFilter = schema ? sql`AND n.nspname = ${schema}` : sql`AND n.nspname NOT IN ('pg_catalog', 'information_schema')`;

    const mappingQuery = sql<TableEntityMapping>`
      SELECT
        n.nspname as schema_name,
        c.relname as table_name,
        CASE
          WHEN c.relname ~ '^[a-z][a-z0-9_]*$' THEN true
          ELSE false
        END as has_entity_mapping,
        CASE
          WHEN c.relname ~ '^[a-z][a-z0-9_]*$' THEN
            CONCAT(UPPER(SUBSTRING(c.relname, 1, 1)), SUBSTRING(c.relname, 2))
          ELSE NULL
        END as entity_class_pattern,
        COUNT(a.attname) as column_count,
        COUNT(p.attname) as primary_key_count,
        COUNT(DISTINCT con.conname) as foreign_key_count,
        COUNT(DISTINCT i.indexrelid) as index_count,
        CASE
          WHEN c.relname ~ '^[a-z][a-z0-9_]*$' THEN true
          ELSE false
        END as has_jpa_annotations,
        CASE
          WHEN c.relname ~ '^[a-z][a-z0-9_]*$' AND COUNT(p.attname) > 0 THEN 'VALID'
          WHEN c.relname ~ '^[a-z][a-z0-9_]*$' AND COUNT(p.attname) = 0 THEN 'MISSING_PK'
          ELSE 'NON_JPA'
        END as mapping_status
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      LEFT JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0
      LEFT JOIN pg_attribute p ON p.attrelid = c.oid AND p.attnum > 0 AND p.atthasdef = true
      LEFT JOIN pg_constraint con ON con.conrelid = c.oid AND con.contype = 'f'
      LEFT JOIN pg_index i ON i.indrelid = c.oid AND i.indisprimary = false
      WHERE c.relkind = 'r'
        ${schemaFilter}
      GROUP BY n.nspname, c.relname, c.oid
      ORDER BY n.nspname, c.relname
      LIMIT 100
    `.execute(db);

    const orphanedQuery = sql<OrphanedTable>`
      SELECT
        n.nspname as schema_name,
        c.relname as table_name,
        COALESCE(pg_stat_get_live_tuples(c.oid), 0) as row_count,
        pg_total_relation_size(c.oid) as table_size_bytes,
        pg_stat_get_last_autovacuum_time(c.oid)::text as last_modified
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind = 'r'
        AND NOT EXISTS (
          SELECT 1 FROM pg_constraint con
          WHERE con.conrelid = c.oid AND con.contype = 'f'
        )
        ${schemaFilter}
        AND c.relname NOT LIKE '%_aud'
        AND c.relname NOT LIKE '%_history'
      ORDER BY pg_total_relation_size(c.oid) DESC
      LIMIT 20
    `.execute(db);

    const recommendations: string[] = [];
    const mappings = mappingQuery.rows;
    const orphaned = orphanedQuery.rows;

    const missingPk = mappings.filter((m) => m.mapping_status === 'MISSING_PK');
    if (missingPk.length > 0) {
      recommendations.push(
        `${missingPk.length} tables missing primary keys - JPA entities require @Id annotation`
      );
    }

    const nonJpa = mappings.filter((m) => m.mapping_status === 'NON_JPA');
    if (nonJpa.length > 0) {
      recommendations.push(
        `${nonJpa.length} tables with non-JPA naming conventions - consider renaming for entity mapping`
      );
    }

    if (orphaned.length > 0) {
      recommendations.push(
        `${orphaned.length} potentially orphaned tables (no foreign keys) - verify if entity mapping exists`
      );
    }

    const noIndexes = mappings.filter((m) => m.index_count === 0 && m.foreign_key_count > 0);
    if (noIndexes.length > 0) {
      recommendations.push(
        `${noIndexes.length} tables with foreign keys but no indexes - consider adding for JPA relationship performance`
      );
    }

    return {
      table_entity_mappings: mappings,
      orphaned_tables: orphaned,
      recommendations,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
