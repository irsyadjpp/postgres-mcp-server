import { sql } from "kysely";
import { getDb } from "../db.js";
import { OrmIndexCoverageInputSchema, validateInput } from "../validation.js";

export interface OrmQueryPattern {
  table_name: string;
  column_name: string;
  query_count: number;
  has_index: boolean;
  index_name: string | null;
  is_covered: boolean;
  recommendation: string;
}

export interface MissingIndex {
  table_name: string;
  column_name: string;
  query_pattern: string;
  estimated_benefit: string;
  suggested_index: string;
}

export interface OrmIndexCoverageOutput {
  query_patterns?: OrmQueryPattern[];
  missing_indexes?: MissingIndex[];
  recommendations?: string[];
  error?: string;
  timestamp?: string;
}

export async function ormIndexCoverageTool(input: unknown): Promise<OrmIndexCoverageOutput> {
  try {
    const validation = validateInput(OrmIndexCoverageInputSchema, input);
    if (!validation.success) {
      return { error: `Input validation failed: ${validation.error}` };
    }

    const { database_name, schema } = validation.data;
    const db = getDb(database_name);

    const schemaFilter = schema ? sql`AND n.nspname = ${schema}` : sql`AND n.nspname NOT IN ('pg_catalog', 'information_schema')`;

    const patternQuery = sql<OrmQueryPattern>`
      SELECT
        c.relname as table_name,
        a.attname as column_name,
        0 as query_count,
        EXISTS(
          SELECT 1 FROM pg_index i
          JOIN pg_class ic ON ic.oid = i.indexrelid
          WHERE i.indrelid = c.oid
            AND i.indisprimary = false
            AND i.indisunique = false
            AND a.attnum = ANY(i.indkey)
        ) as has_index,
        NULL::text as index_name,
        CASE
          WHEN EXISTS(
            SELECT 1 FROM pg_index i
            JOIN pg_class ic ON ic.oid = i.indexrelid
            WHERE i.indrelid = c.oid
              AND i.indisprimary = false
              AND a.attnum = ANY(i.indkey)
          ) THEN true
          ELSE false
        END as is_covered,
        CASE
          WHEN EXISTS(
            SELECT 1 FROM pg_index i
            JOIN pg_class ic ON ic.oid = i.indexrelid
            WHERE i.indrelid = c.oid
              AND i.indisprimary = false
              AND a.attnum = ANY(i.indkey)
          ) THEN 'Column is indexed'
          ELSE 'Consider adding index for @Query WHERE clauses'
        END as recommendation
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0
      WHERE c.relkind = 'r'
        AND a.attnotid = 0
        ${schemaFilter}
        AND a.attname NOT IN ('id', 'created_at', 'updated_at')
      ORDER BY c.relname, a.attnum
      LIMIT 50
    `.execute(db);

    const missingIndexQuery = sql<MissingIndex>`
      SELECT
        c.relname as table_name,
        a.attname as column_name,
        'WHERE clause pattern' as query_pattern,
        'High' as estimated_benefit,
        CONCAT('CREATE INDEX idx_', c.relname, '_', a.attname, ' ON ', n.nspname, '.', c.relname, ' (', a.attname, ')') as suggested_index
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0
      WHERE c.relkind = 'r'
        ${schemaFilter}
        AND NOT EXISTS(
          SELECT 1 FROM pg_index i
          WHERE i.indrelid = c.oid
            AND a.attnum = ANY(i.indkey)
            AND i.indisprimary = false
        )
        AND a.attname NOT IN ('id', 'created_at', 'updated_at')
      ORDER BY c.relname, a.attnum
      LIMIT 20
    `.execute(db);

    const recommendations: string[] = [];
    const patterns = patternQuery.rows;
    const missingIndexes = missingIndexQuery.rows;

    const uncovered = patterns.filter((p) => !p.is_covered);
    if (uncovered.length > 0) {
      recommendations.push(
        `${uncovered.length} columns without indexes - consider adding for @Query WHERE clauses`
      );
    }

    if (missingIndexes.length > 0) {
      recommendations.push(
        `${missingIndexes.length} potential missing indexes for ORM query patterns`
      );
    }

    recommendations.push(
      'Review @Query annotations and add corresponding indexes'
    );
    recommendations.push(
      'Use @Index annotation in JPA entities for frequently queried columns'
    );
    recommendations.push(
      'Consider composite indexes for multi-column WHERE clauses'
    );
    recommendations.push(
      'Monitor pg_stat_user_indexes for index usage statistics'
    );

    return {
      query_patterns: patterns,
      missing_indexes: missingIndexes,
      recommendations,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
