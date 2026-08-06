import { sql } from "kysely";
import { getDb } from "../db.js";
import { SequenceMonitorInputSchema, validateInput } from "../validation.js";

export interface SequenceInfo {
  sequence_name: string;
  schema_name: string;
  last_value: number;
  max_value: number;
  is_called: boolean;
  cache_value: number;
  increment_by: number;
  usage_pct: number;
  exhaustion_risk: string;
  recommendation: string;
}

export interface SequencePerformance {
  sequence_name: string;
  table_name: string;
  calls_per_day: number;
  avg_call_time_ms: number;
  cache_hit_ratio: number;
  recommendation: string;
}

export interface SequenceMonitorOutput {
  sequences?: SequenceInfo[];
  sequence_performance?: SequencePerformance[];
  recommendations?: string[];
  error?: string;
  timestamp?: string;
}

export async function sequenceMonitorTool(input: unknown): Promise<SequenceMonitorOutput> {
  try {
    const validation = validateInput(SequenceMonitorInputSchema, input);
    if (!validation.success) {
      return { error: `Input validation failed: ${validation.error}` };
    }

    const { database_name, schema } = validation.data;
    const db = getDb(database_name);

    const schemaFilter = schema
      ? sql`AND n.nspname = ${schema}`
      : sql`AND n.nspname NOT IN ('pg_catalog', 'information_schema')`;

    const sequenceQuery = sql<SequenceInfo>`
      SELECT
        s.relname as sequence_name,
        n.nspname as schema_name,
        last_value,
        max_value,
        is_called,
        cache_value,
        increment_by,
        ROUND(
          (last_value::float / NULLIF(max_value::float, 0)) * 100,
          2
        ) as usage_pct,
        CASE
          WHEN max_value > 0 AND last_value > max_value * 0.9 THEN 'HIGH'
          WHEN max_value > 0 AND last_value > max_value * 0.75 THEN 'MEDIUM'
          ELSE 'LOW'
        END as exhaustion_risk,
        CASE
          WHEN max_value > 0 AND last_value > max_value * 0.9 THEN
            'Sequence near exhaustion - consider increasing max_value or using BIGINT'
          WHEN cache_value < 50 THEN
            'Increase cache value for better performance'
          ELSE 'No action needed'
        END as recommendation
      FROM pg_sequence seq
      JOIN pg_class s ON s.oid = seq.seqrelid
      JOIN pg_namespace n ON n.oid = s.relnamespace
      WHERE s.relkind = 'S'
        ${schemaFilter}
      ORDER BY usage_pct DESC
      LIMIT 50
    `.execute(db);

    const performanceQuery = sql<SequencePerformance>`
      SELECT
        s.relname as sequence_name,
        'entity_table' as table_name,
        0 as calls_per_day,
        0 as avg_call_time_ms,
        0 as cache_hit_ratio,
        'Monitor sequence usage for @GeneratedValue strategy' as recommendation
      FROM pg_class s
      JOIN pg_namespace n ON n.oid = s.relnamespace
      WHERE s.relkind = 'S'
        ${schemaFilter}
      ORDER BY s.relname
      LIMIT 20
    `.execute(db);

    const [sequencesResult, performanceResult] = await Promise.all([
      sequenceQuery,
      performanceQuery,
    ]);

    const recommendations: string[] = [];
    const sequences = sequencesResult.rows;
    const performance = performanceResult.rows;

    const highRisk = sequences.filter((s) => s.exhaustion_risk === "HIGH");
    if (highRisk.length > 0) {
      recommendations.push(
        `${highRisk.length} sequences at high exhaustion risk - review @GeneratedValue strategy`,
      );
    }

    const lowCache = sequences.filter((s) => s.cache_value < 50);
    if (lowCache.length > 0) {
      recommendations.push(
        `${lowCache.length} sequences with low cache value - consider increasing for better performance`,
      );
    }

    recommendations.push(
      "Use @GeneratedValue(strategy = GenerationType.IDENTITY) for auto-increment",
    );
    recommendations.push(
      "Use @GeneratedValue(strategy = GenerationType.SEQUENCE) with custom sequence for control",
    );
    recommendations.push("Set sequence cache to match batch size for bulk inserts");
    recommendations.push("Monitor sequence usage during high-volume insert operations");
    recommendations.push("Consider HiLo algorithm for distributed systems");

    return {
      sequences,
      sequence_performance: performance,
      recommendations,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
