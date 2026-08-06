import { sql } from "kysely";
import { getDb } from "../db.js";
import { OrmPerformanceInputSchema, validateInput } from "../validation.js";

export interface NPlusOneQuery {
  query_id: string;
  database: string;
  user: string;
  query_preview: string;
  calls: number;
  total_exec_time_ms: number;
  rows_per_call: number;
  suspected_n_plus_one: boolean;
  recommendation: string;
}

export interface LazyLoadingIssue {
  table_name: string;
  collection_name: string;
  lazy_load_count: number;
  avg_fetch_time_ms: number;
  recommendation: string;
}

export interface OrmPerformanceOutput {
  n_plus_one_queries?: NPlusOneQuery[];
  lazy_loading_issues?: LazyLoadingIssue[];
  recommendations?: string[];
  error?: string;
  timestamp?: string;
}

export async function ormPerformanceTool(input: unknown): Promise<OrmPerformanceOutput> {
  try {
    const validation = validateInput(OrmPerformanceInputSchema, input);
    if (!validation.success) {
      return { error: `Input validation failed: ${validation.error}` };
    }

    const { database_name } = validation.data;
    const db = getDb(database_name);

    const nPlusOneQuery = sql<NPlusOneQuery>`
      SELECT
        queryid::text as query_id,
        datname as database,
        usename as user,
        LEFT(query, 200) as query_preview,
        calls,
        total_exec_time as total_exec_time_ms,
        ROUND(COALESCE(rows::float / NULLIF(calls, 0), 0), 2) as rows_per_call,
        CASE
          WHEN calls > 100
            AND total_exec_time / calls > 10
            AND query ILIKE '%WHERE%'
            AND (query ILIKE '%=%' OR query ILIKE '%IN%')
            THEN true
          ELSE false
        END as suspected_n_plus_one,
        CASE
          WHEN calls > 100
            AND total_exec_time / calls > 10
            AND query ILIKE '%WHERE%'
            AND (query ILIKE '%=%' OR query ILIKE '%IN%')
            THEN 'Consider using JOIN or @EntityGraph to fetch related entities in single query'
          ELSE 'No issue detected'
        END as recommendation
      FROM pg_stat_statements
      WHERE query ILIKE '%SELECT%'
        AND query NOT ILIKE '%pg_%'
        AND calls > 10
      ORDER BY calls DESC, total_exec_time DESC
      LIMIT 20
    `.execute(db);

    const lazyLoadingQuery = sql<LazyLoadingIssue>`
      SELECT
        c.relname as table_name,
        'collection' as collection_name,
        0 as lazy_load_count,
        0 as avg_fetch_time_ms,
        'Monitor for lazy loading patterns - consider @BatchSize or JOIN FETCH' as recommendation
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind = 'r'
        AND n.nspname NOT IN ('pg_catalog', 'information_schema')
      LIMIT 10
    `.execute(db);

    const [nPlusOneResult, lazyLoadingResult] = await Promise.all([
      nPlusOneQuery,
      lazyLoadingQuery,
    ]);

    const recommendations: string[] = [];
    const nPlusOne = nPlusOneResult.rows;
    const lazyLoading = lazyLoadingResult.rows;

    const suspectedNPlusOne = nPlusOne.filter((q) => q.suspected_n_plus_one);
    if (suspectedNPlusOne.length > 0) {
      recommendations.push(
        `${suspectedNPlusOne.length} queries suspected of N+1 problem - use JOIN FETCH or @EntityGraph`,
      );
    }

    const highCallCount = nPlusOne.filter((q) => q.calls > 1000);
    if (highCallCount.length > 0) {
      recommendations.push(
        `${highCallCount.length} queries with high call count - consider query caching or batch operations`,
      );
    }

    const slowQueries = nPlusOne.filter((q) => q.total_exec_time_ms / q.calls > 50);
    if (slowQueries.length > 0) {
      recommendations.push(
        `${slowQueries.length} slow queries detected - review indexes and query optimization`,
      );
    }

    recommendations.push(
      "Enable Hibernate statistics: spring.jpa.properties.hibernate.generate_statistics=true",
    );
    recommendations.push(
      "Use @BatchSize annotation for collections to reduce lazy loading overhead",
    );
    recommendations.push(
      "Consider second-level cache (Hibernate) or Spring Cache for frequently accessed entities",
    );

    return {
      n_plus_one_queries: nPlusOne,
      lazy_loading_issues: lazyLoading,
      recommendations,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
