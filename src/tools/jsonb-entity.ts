import { sql } from "kysely";
import { getDb } from "../db.js";
import { JsonbEntityInputSchema, validateInput } from "../validation.js";

export interface JsonbEntityAttribute {
  schema_name: string;
  table_name: string;
  column_name: string;
  data_type: string;
  has_gin_index: boolean;
  has_gist_index: boolean;
  avg_jsonb_size_bytes: number;
  sample_count: number;
  entity_mapping_pattern: string;
  recommendation: string;
}

export interface JsonbQueryPattern {
  table_name: string;
  column_name: string;
  query_pattern: string;
  frequency: number;
  is_indexed: boolean;
}

export interface JsonbEntityOutput {
  jsonb_attributes?: JsonbEntityAttribute[];
  query_patterns?: JsonbQueryPattern[];
  recommendations?: string[];
  error?: string;
  timestamp?: string;
}

export async function jsonbEntityTool(input: unknown): Promise<JsonbEntityOutput> {
  try {
    const validation = validateInput(JsonbEntityInputSchema, input);
    if (!validation.success) {
      return { error: `Input validation failed: ${validation.error}` };
    }

    const { database_name, schema } = validation.data;
    const db = getDb(database_name);

    const schemaFilter = schema
      ? sql`AND n.nspname = ${schema}`
      : sql`AND n.nspname NOT IN ('pg_catalog', 'information_schema')`;

    const attributesQuery = sql<JsonbEntityAttribute>`
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
        0 as avg_jsonb_size_bytes,
        0 as sample_count,
        CASE
          WHEN a.attname ~ '^[a-z][a-z_]*$' THEN
            CONCAT('@Convert(converter = JsonConverter.class)')
          ELSE '@Convert(converter = JsonConverter.class)'
        END as entity_mapping_pattern,
        CASE
          WHEN EXISTS(
            SELECT 1 FROM pg_index i
            JOIN pg_class ic ON ic.oid = i.indexrelid
            JOIN pg_am am ON am.oid = ic.relam
            WHERE i.indrelid = c.oid
              AND a.attnum = ANY(i.indkey)
              AND am.amname = 'gin'
          ) THEN 'GIN index present - good for @Convert JSONB queries'
          ELSE 'Consider adding GIN index for @Convert JSONB column'
        END as recommendation
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0
      WHERE c.relkind = 'r'
        AND a.atttypid IN ('jsonb'::regtype, 'json'::regtype)
        ${schemaFilter}
      ORDER BY n.nspname, c.relname, a.attname
      LIMIT 50
    `.execute(db);

    const patternQuery = sql<JsonbQueryPattern>`
      SELECT
        c.relname as table_name,
        a.attname as column_name,
        '->>' as query_pattern,
        0 as frequency,
        EXISTS(
          SELECT 1 FROM pg_index i
          JOIN pg_class ic ON ic.oid = i.indexrelid
          JOIN pg_am am ON am.oid = ic.relam
          WHERE i.indrelid = c.oid
            AND a.attnum = ANY(i.indkey)
            AND am.amname = 'gin'
        ) as is_indexed
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0
      WHERE c.relkind = 'r'
        AND a.atttypid = 'jsonb'::regtype
        ${schemaFilter}
      LIMIT 20
    `.execute(db);

    const [attributesResult, patternsResult] = await Promise.all([attributesQuery, patternQuery]);
    const recommendations: string[] = [];
    const attributes = attributesResult.rows;
    const patterns = patternsResult.rows;

    const noGin = attributes.filter((a) => !a.has_gin_index);
    if (noGin.length > 0) {
      recommendations.push(
        `${noGin.length} JSONB columns without GIN index - add for @Convert query performance`,
      );
    }

    const unindexedPatterns = patterns.filter((p) => !p.is_indexed);
    if (unindexedPatterns.length > 0) {
      recommendations.push(
        `${unindexedPatterns.length} JSONB query patterns without index coverage`,
      );
    }

    recommendations.push(
      "Use @Convert(converter = JsonConverter.class) for JSONB entity attributes",
    );
    recommendations.push("Consider Hypersistence Utils for advanced JSONB type support");
    recommendations.push("Use @TypeDef and @Type for custom JSONB converters in Hibernate");
    recommendations.push(
      "Monitor JSONB storage efficiency - consider compression for large JSON documents",
    );

    return {
      jsonb_attributes: attributes,
      query_patterns: patterns,
      recommendations,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
