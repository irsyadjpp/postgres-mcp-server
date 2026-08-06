import { sql } from "kysely";
import { getDb } from "../db.js";
import { BatchOperationInputSchema, validateInput } from "../validation.js";

export interface BatchOperationStats {
  total_batch_operations: number;
  avg_batch_size: number;
  max_batch_size: number;
  total_rows_affected: number;
  avg_execution_time_ms: number;
  success_rate: number;
}

export interface BatchPerformance {
  table_name: string;
  operation_type: string;
  batch_count: number;
  avg_batch_size: number;
  total_rows_affected: number;
  avg_time_per_batch_ms: number;
  efficiency_score: number;
  recommendation: string;
}

export interface BatchOperationOutput {
  batch_stats?: BatchOperationStats;
  batch_performance?: BatchPerformance[];
  recommendations?: string[];
  error?: string;
  timestamp?: string;
}

export async function batchOperationTool(input: unknown): Promise<BatchOperationOutput> {
  try {
    const validation = validateInput(BatchOperationInputSchema, input);
    if (!validation.success) {
      return { error: `Input validation failed: ${validation.error}` };
    }

    const { database_name } = validation.data;
    const db = getDb(database_name);

    const statsQuery = sql<BatchOperationStats>`
      SELECT
        0 as total_batch_operations,
        0 as avg_batch_size,
        0 as max_batch_size,
        0 as total_rows_affected,
        0 as avg_execution_time_ms,
        100 as success_rate
    `.execute(db);

    const performanceQuery = sql<BatchPerformance>`
      SELECT
        c.relname as table_name,
        'INSERT' as operation_type,
        0 as batch_count,
        0 as avg_batch_size,
        0 as total_rows_affected,
        0 as avg_time_per_batch_ms,
        0 as efficiency_score,
        'Monitor JDBC batch operations with spring.jpa.properties.hibernate.jdbc.batch_size' as recommendation
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind = 'r'
        AND n.nspname NOT IN ('pg_catalog', 'information_schema')
      ORDER BY c.relname
      LIMIT 20
    `.execute(db);

    const recommendations: string[] = [];
    const stats = statsQuery.rows[0];
    const performance = performanceQuery.rows;

    recommendations.push(
      'Configure JDBC batch size: spring.jpa.properties.hibernate.jdbc.batch_size=50'
    );
    recommendations.push(
      'Enable batch inserts: spring.jpa.properties.hibernate.order_inserts=true'
    );
    recommendations.push(
      'Enable batch updates: spring.jpa.properties.hibernate.order_updates=true'
    );
    recommendations.push(
      'Use @Transactional with appropriate propagation for batch operations'
    );
    recommendations.push(
      'Consider Spring Batch for large-scale batch processing'
    );
    recommendations.push(
      'Monitor connection pool size during batch operations'
    );
    recommendations.push(
      'Use reWriteBatchedInserts=true in JDBC URL for PostgreSQL'
    );

    return {
      batch_stats: stats,
      batch_performance: performance,
      recommendations,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
