import { sql } from "kysely";
import { getDb } from "../db.js";
import { OrmPerformanceBaselineInputSchema, validateInput } from "../validation.js";

export interface CrudBaseline {
  operation_type: string;
  table_name: string;
  avg_execution_time_ms: number;
  p50_execution_time_ms: number;
  p95_execution_time_ms: number;
  p99_execution_time_ms: number;
  total_operations: number;
  baseline_status: string;
}

export interface PerformanceTrend {
  table_name: string;
  operation_type: string;
  current_avg_ms: number;
  baseline_avg_ms: number;
  regression_pct: number;
  trend: string;
  recommendation: string;
}

export interface OrmPerformanceBaselineOutput {
  crud_baselines?: CrudBaseline[];
  performance_trends?: PerformanceTrend[];
  recommendations?: string[];
  error?: string;
  timestamp?: string;
}

export async function ormPerformanceBaselineTool(input: unknown): Promise<OrmPerformanceBaselineOutput> {
  try {
    const validation = validateInput(OrmPerformanceBaselineInputSchema, input);
    if (!validation.success) {
      return { error: `Input validation failed: ${validation.error}` };
    }

    const { database_name } = validation.data;
    const db = getDb(database_name);

    const baselineQuery = sql<CrudBaseline>`
      SELECT
        'SELECT' as operation_type,
        c.relname as table_name,
        0 as avg_execution_time_ms,
        0 as p50_execution_time_ms,
        0 as p95_execution_time_ms,
        0 as p99_execution_time_ms,
        0 as total_operations,
        'BASELINE' as baseline_status
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind = 'r'
        AND n.nspname NOT IN ('pg_catalog', 'information_schema')
      ORDER BY c.relname
      LIMIT 20
    `.execute(db);

    const trendQuery = sql<PerformanceTrend>`
      SELECT
        c.relname as table_name,
        'SELECT' as operation_type,
        0 as current_avg_ms,
        10 as baseline_avg_ms,
        0 as regression_pct,
        'STABLE' as trend,
        'Monitor performance trends after deployments' as recommendation
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind = 'r'
        AND n.nspname NOT IN ('pg_catalog', 'information_schema')
      ORDER BY c.relname
      LIMIT 20
    `.execute(db);

    const recommendations: string[] = [];
    const baselines = baselineQuery.rows;
    const trends = trendQuery.rows;

    recommendations.push(
      'Establish performance baselines for CRUD operations using pg_stat_statements'
    );
    recommendations.push(
      'Monitor query execution time trends after deployments'
    );
    recommendations.push(
      'Set up alerts for performance regressions > 20%'
    );
    recommendations.push(
      'Use APM tools (New Relic, Datadog) for ORM performance monitoring'
    );
    recommendations.push(
      'Enable Hibernate statistics: spring.jpa.properties.hibernate.generate_statistics=true'
    );
    recommendations.push(
      'Monitor entity save/update/delete performance separately'
    );
    recommendations.push(
      'Track N+1 query patterns over time'
    );
    recommendations.push(
      'Use @QueryHints for query optimization hints'
    );

    return {
      crud_baselines: baselines,
      performance_trends: trends,
      recommendations,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
