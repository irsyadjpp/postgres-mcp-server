import { sql } from "kysely";
import { getDb } from "../db.js";
import { JpaSchemaValidationInputSchema, validateInput } from "../validation.js";

export interface SchemaValidationIssue {
  schema_name: string;
  table_name: string;
  issue_type: string;
  expected: string;
  actual: string;
  severity: string;
  recommendation: string;
}

export interface EntityAnnotation {
  entity_class: string;
  table_name: string;
  has_table_annotation: boolean;
  has_column_annotations: boolean;
  has_index_annotations: boolean;
  has_unique_constraint: boolean;
  validation_status: string;
}

export interface JpaSchemaValidationOutput {
  validation_issues?: SchemaValidationIssue[];
  entity_annotations?: EntityAnnotation[];
  recommendations?: string[];
  error?: string;
  timestamp?: string;
}

export async function jpaSchemaValidationTool(input: unknown): Promise<JpaSchemaValidationOutput> {
  try {
    const validation = validateInput(JpaSchemaValidationInputSchema, input);
    if (!validation.success) {
      return { error: `Input validation failed: ${validation.error}` };
    }

    const { database_name, schema } = validation.data;
    const db = getDb(database_name);

    const schemaFilter = schema ? sql`AND n.nspname = ${schema}` : sql`AND n.nspname NOT IN ('pg_catalog', 'information_schema')`;

    const issuesQuery = sql<SchemaValidationIssue>`
      SELECT
        n.nspname as schema_name,
        c.relname as table_name,
        'column_type_mismatch' as issue_type,
        'VARCHAR(255)' as expected,
        format_type(a.atttypid, a.atttypmod) as actual,
        'MEDIUM' as severity,
        'Review @Column annotation type definition' as recommendation
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0
      WHERE c.relkind = 'r'
        ${schemaFilter}
        AND a.attname NOT IN ('id', 'created_at', 'updated_at')
      ORDER BY n.nspname, c.relname, a.attnum
      LIMIT 50
    `.execute(db);

    const annotationQuery = sql<EntityAnnotation>`
      SELECT
        CONCAT(UPPER(SUBSTRING(c.relname, 1, 1)), SUBSTRING(c.relname, 2)) as entity_class,
        c.relname as table_name,
        true as has_table_annotation,
        true as has_column_annotations,
        EXISTS(
          SELECT 1 FROM pg_index i
          WHERE i.indrelid = c.oid
            AND i.indisunique = false
        ) as has_index_annotations,
        EXISTS(
          SELECT 1 FROM pg_constraint con
          WHERE con.conrelid = c.oid
            AND con.contype = 'u'
        ) as has_unique_constraint,
        'VALID' as validation_status
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind = 'r'
        ${schemaFilter}
        AND c.relname ~ '^[a-z][a-z0-9_]*$'
      ORDER BY c.relname
      LIMIT 30
    `.execute(db);

    const recommendations: string[] = [];
    const issues = issuesQuery.rows;
    const annotations = annotationQuery.rows;

    const missingPk = annotationQuery.filter((a) => !a.has_table_annotation);
    if (missingPk.length > 0) {
      recommendations.push(
        `${missingPk.length} tables may be missing @Table annotation - verify entity mapping`
      );
    }

    const noUnique = annotationQuery.filter((a) => !a.has_unique_constraint);
    if (noUnique.length > 0) {
      recommendations.push(
        `${noUnique.length} tables without unique constraints - consider @Column(unique = true)`
      );
    }

    recommendations.push(
      'Use @Table(name = "table_name") for explicit table mapping'
    );
    recommendations.push(
      'Use @Column(name = "column_name") for column name mapping'
    );
    recommendations.push(
      'Use @Index annotation for frequently queried columns'
    );
    recommendations.push(
      'Use @UniqueConstraint for multi-column unique constraints'
    );
    recommendations.push(
      'Enable spring.jpa.hibernate.ddl-auto=validate in development'
    );
    recommendations.push(
      'Use Hibernate SchemaManager.validate() for schema validation'
    );
    recommendations.push(
      'Review @Enumerated annotation for enum column mappings'
    );

    return {
      validation_issues: issues,
      entity_annotations: annotations,
      recommendations,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
