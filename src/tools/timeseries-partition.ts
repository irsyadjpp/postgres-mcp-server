import { sql } from "kysely";
import { getDb } from "../db.js";
import { TimeseriesPartitionInputSchema, validateInput } from "../validation.js";

export interface TimeSeriesTable {
  schema_name: string;
  table_name: string;
  has_timestamp_column: boolean;
  timestamp_column: string | null;
  row_count: number;
  table_size_bytes: string;
  is_partitioned: boolean;
  partition_count: number;
  recommendation: string;
}

export interface PartitionStrategy {
  table_name: string;
  suggested_partition_type: string;
  partition_key: string;
  interval: string;
  estimated_partitions: number;
  benefit: string;
}

export interface TimeseriesPartitionOutput {
  timeseries_tables?: TimeSeriesTable[];
  partition_strategies?: PartitionStrategy[];
  recommendations?: string[];
  error?: string;
  timestamp?: string;
}

export async function timeseriesPartitionTool(input: unknown): Promise<TimeseriesPartitionOutput> {
  try {
    const validation = validateInput(TimeseriesPartitionInputSchema, input);
    if (!validation.success) {
      return { error: `Input validation failed: ${validation.error}` };
    }

    const { database_name, schema } = validation.data;
    const db = getDb(database_name);

    const schemaFilter = schema ? sql`AND n.nspname = ${schema}` : sql`AND n.nspname NOT IN ('pg_catalog', 'information_schema')`;

    const tablesQuery = sql<TimeSeriesTable>`
      SELECT
        n.nspname as schema_name,
        c.relname as table_name,
        EXISTS(
          SELECT 1 FROM pg_attribute a
          WHERE a.attrelid = c.oid
            AND a.attname IN ('created_at', 'updated_at', 'timestamp', 'event_time', 'date')
        ) as has_timestamp_column,
        (
          SELECT a.attname FROM pg_attribute a
          WHERE a.attrelid = c.oid
            AND a.attname IN ('created_at', 'updated_at', 'timestamp', 'event_time', 'date')
          LIMIT 1
        ) as timestamp_column,
        COALESCE(pg_stat_get_live_tuples(c.oid), 0) as row_count,
        pg_size_pretty(pg_total_relation_size(c.oid)) as table_size_bytes,
        EXISTS(
          SELECT 1 FROM pg_inherits i
          WHERE i.inhrelid = c.oid
        ) as is_partitioned,
        (
          SELECT COUNT(*) FROM pg_inherits i
          WHERE i.inhrelid = c.oid
        ) as partition_count,
        CASE
          WHEN EXISTS(
            SELECT 1 FROM pg_attribute a
            WHERE a.attrelid = c.oid
              AND a.attname IN ('created_at', 'updated_at', 'timestamp', 'event_time', 'date')
          ) AND NOT EXISTS(
            SELECT 1 FROM pg_inherits i
            WHERE i.inhrelid = c.oid
          ) THEN
            'Consider partitioning by timestamp for time-series data'
          WHEN EXISTS(
            SELECT 1 FROM pg_inherits i
            WHERE i.inhrelid = c.oid
          ) THEN 'Already partitioned'
          ELSE 'No timestamp column detected'
        END as recommendation
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind = 'r'
        ${schemaFilter}
      ORDER BY pg_total_relation_size(c.oid) DESC
      LIMIT 30
    `.execute(db);

    const strategyQuery = sql<PartitionStrategy>`
      SELECT
        c.relname as table_name,
        'RANGE' as suggested_partition_type,
        (
          SELECT a.attname FROM pg_attribute a
          WHERE a.attrelid = c.oid
            AND a.attname IN ('created_at', 'updated_at', 'timestamp', 'event_time', 'date')
          LIMIT 1
        ) as partition_key,
        'MONTHLY' as interval,
        12 as estimated_partitions,
        'Improved query performance for time-range queries' as benefit
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind = 'r'
        AND EXISTS(
          SELECT 1 FROM pg_attribute a
          WHERE a.attrelid = c.oid
            AND a.attname IN ('created_at', 'updated_at', 'timestamp', 'event_time', 'date')
        )
        AND NOT EXISTS(
          SELECT 1 FROM pg_inherits i
          WHERE i.inhrelid = c.oid
        )
        ${schemaFilter}
      LIMIT 10
    `.execute(db);

    const recommendations: string[] = [];
    const tables = tablesQuery.rows;
    const strategies = strategyQuery.rows;

    const candidates = tables.filter((t) => t.has_timestamp_column && !t.is_partitioned);
    if (candidates.length > 0) {
      recommendations.push(
        `${candidates.length} time-series tables could benefit from partitioning`
      );
    }

    const largeUnpartitioned = tables.filter(
      (t) => t.has_timestamp_column && !t.is_partitioned && t.row_count > 1000000
    );
    if (largeUnpartitioned.length > 0) {
      recommendations.push(
        `${largeUnpartitioned.length} large time-series tables (>1M rows) - prioritize partitioning`
      );
    }

    recommendations.push(
      'Use PARTITION BY RANGE for timestamp-based partitioning'
    );
    recommendations.push(
      'Align partition intervals with application time windows (daily, weekly, monthly)'
    );
    recommendations.push(
      'Use declarative partitioning (PostgreSQL 10+) for easier management'
    );
    recommendations.push(
      'Consider partition pruning for improved query performance'
    );
    recommendations.push(
      'Set up automated partition maintenance with pg_partman extension'
    );

    return {
      timeseries_tables: tables,
      partition_strategies: strategies,
      recommendations,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
