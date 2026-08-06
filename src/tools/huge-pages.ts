import { sql } from "kysely";
import { getDb } from "../db.js";
import { HugePagesInputSchema, validateInput } from "../validation.js";

export interface HugePagesInfo {
  huge_pages_enabled: boolean;
  huge_pages_size_kb: number;
  huge_pages_total: number;
  huge_pages_free: number;
  huge_pages_reserved: number;
  shared_buffers_size_bytes: number;
  shared_buffers_size_pretty: string;
  required_huge_pages: number;
  current_huge_pages_usage: string;
  recommendation: string;
}

export interface HugePagesOutput {
  huge_pages_info?: HugePagesInfo;
  error?: string;
  timestamp?: string;
}

export async function hugePagesTool(input: unknown): Promise<HugePagesOutput> {
  try {
    const validation = validateInput(HugePagesInputSchema, input);
    if (!validation.success) {
      return { error: `Input validation failed: ${validation.error}` };
    }

    const { database_name } = validation.data;
    const db = getDb(database_name);

    const query = sql<HugePagesInfo>`
      SELECT
        CASE current_setting('huge_pages')
          WHEN 'on' THEN true
          WHEN 'off' THEN false
          WHEN 'try' THEN true
          ELSE false
        END as huge_pages_enabled,
        COALESCE(
          (SELECT setting::int FROM pg_settings WHERE name = 'huge_page_size'),
          2048
        ) as huge_pages_size_kb,
        COALESCE(
          (SELECT setting::int FROM pg_settings WHERE name = 'huge_pages_total'),
          0
        ) as huge_pages_total,
        0 as huge_pages_free,
        0 as huge_pages_reserved,
        current_setting('shared_buffers')::bigint * 8192 as shared_buffers_size_bytes,
        pg_size_pretty(current_setting('shared_buffers')::bigint * 8192) as shared_buffers_size_pretty,
        CEIL((current_setting('shared_buffers')::bigint * 8192) /
          COALESCE((SELECT setting::int FROM pg_settings WHERE name = 'huge_page_size'), 2048) * 1024) as required_huge_pages,
        CASE current_setting('huge_pages')
          WHEN 'on' THEN 'Enabled'
          WHEN 'off' THEN 'Disabled'
          WHEN 'try' THEN 'Attempt to use'
          ELSE 'Unknown'
        END as current_huge_pages_usage,
        CASE
          WHEN current_setting('huge_pages') = 'off' THEN
            'Consider enabling huge_pages for large shared_buffers to reduce TLB misses'
          WHEN current_setting('huge_pages') = 'try' THEN
            'System will attempt to use huge pages - monitor for success'
          ELSE 'Huge pages enabled - ensure OS is configured correctly'
        END as recommendation
    `.execute(db);

    const [queryResult] = await Promise.all([query]);

    return {
      huge_pages_info: queryResult.rows[0],
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
