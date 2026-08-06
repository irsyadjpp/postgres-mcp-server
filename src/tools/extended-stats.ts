import { sql } from "kysely";
import { getDb } from "../db.js";
import { ExtendedStatsInputSchema, validateInput } from "../validation.js";

export interface ExtendedStatsInfo {
  schema_name: string;
  table_name: string;
  stats_name: string;
  stats_type: string;
  columns: string;
  definitions: string;
  created: string;
  last_analyzed: string;
}

export interface ExtendedStatsRecommendation {
  schema_name: string;
  table_name: string;
  columns: string;
  reason: string;
  recommendation: string;
}

export interface ExtendedStatsOutput {
  extended_stats?: ExtendedStatsInfo[];
  recommendations?: ExtendedStatsRecommendation[];
  error?: string;
}

export async function extendedStatsTool(input: unknown): Promise<ExtendedStatsOutput> {
  try {
    const validation = validateInput(ExtendedStatsInputSchema, input);
    if (!validation.success) {
      return { error: `Input validation failed: ${validation.error}` };
    }

    const { database_name } = validation.data;
    const db = getDb(database_name);

    const statsQuery = sql<ExtendedStatsInfo>`
      SELECT
        n.nspname as schema_name,
        c.relname as table_name,
        s.stxname as stats_name,
        s.stxkind::text as stats_type,
        array_agg(a.attname ORDER BY a.attnum) as columns,
        pg_get_statisticsobjdef(s.oid) as definitions,
        s.stxcreated::text as created,
        COALESCE(st.stxlastanalyzed::text, 'never') as last_analyzed
      FROM pg_statistic_ext s
      JOIN pg_class c ON c.oid = s.stxrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_statistic_ext_data st ON st.stxoid = s.oid
      JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY(st.stxkeys)
      GROUP BY n.nspname, c.relname, s.stxname, s.stxkind, s.stxcreated, st.stxlastanalyzed, s.oid
      ORDER BY n.nspname, c.relname, s.stxname
    `.execute(db);

    const recommendationsQuery = sql<ExtendedStatsRecommendation>`
      SELECT
        n.nspname as schema_name,
        c.relname as table_name,
        array_agg(a.attname ORDER BY a.attnum) as columns,
        'Multi-column correlation detected' as reason,
        'Consider creating extended statistics on these columns for better query planning' as recommendation
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_attribute a ON a.attrelid = c.oid
      WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
        AND c.relkind = 'r'
        AND a.attnum > 0
        AND NOT EXISTS (
          SELECT 1 FROM pg_statistic_ext s
          JOIN pg_statistic_ext_data st ON st.stxoid = s.oid
          WHERE s.stxrelid = c.oid
            AND a.attnum = ANY(st.stxkeys)
        )
      GROUP BY n.nspname, c.relname
      HAVING COUNT(a.atttnum) >= 2
      LIMIT 20
    `.execute(db);

    const [statsResult, recommendationsResult] = await Promise.all([
      statsQuery,
      recommendationsQuery,
    ]);

    return {
      extended_stats: statsResult.rows,
      recommendations: recommendationsResult.rows,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
