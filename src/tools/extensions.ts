import { sql } from "kysely";
import { getDb } from "../db.js";
import { ExtensionsInputSchema, validateInput } from "../validation.js";

export interface ExtensionInfo {
  extension_name: string;
  default_version: string;
  installed_version: string;
  schema_name: string;
  is_relocatable: boolean;
  extension_size_bytes: number;
  extension_size_pretty: string;
  dependencies: string[];
  comment: string;
}

export interface ExtensionCompatibilityInfo {
  extension_name: string;
  postgres_version: string;
  compatible: boolean;
  notes: string;
}

export interface ExtensionManagementOutput {
  extensions?: ExtensionInfo[];
  compatibility_check?: ExtensionCompatibilityInfo[];
  error?: string;
}

export async function extensionsTool(input: unknown): Promise<ExtensionManagementOutput> {
  try {
    const validation = validateInput(ExtensionsInputSchema, input);
    if (!validation.success) {
      return { error: `Input validation failed: ${validation.error}` };
    }

    const { database_name } = validation.data;
    const db = getDb(database_name);

    const extensionsQuery = sql<ExtensionInfo>`
      SELECT
        e.extname as extension_name,
        e.default_version,
        COALESCE(nv.extversion, 'not installed') as installed_version,
        COALESCE(n.nspname, 'public') as schema_name,
        e.extrelocatable as is_relocatable,
        COALESCE(pg_total_relation_size(n.oid::regclass), 0) as extension_size_bytes,
        pg_size_pretty(COALESCE(pg_total_relation_size(n.oid::regclass), 0)) as extension_size_pretty,
        COALESCE(
          array_agg(
            dep.extname
            ORDER BY dep.extname
          ) FILTER WHERE dep.extname IS NOT NULL,
            ARRAY[]::text[]
        ) as dependencies,
        COALESCE(pg_describe_object(e.oid::regclass), '') as comment
      FROM pg_available_extensions e
      LEFT JOIN pg_extension nv ON nv.extname = e.extname
      LEFT JOIN pg_namespace n ON n.oid = nv.extnamespace
      LEFT JOIN pg_depend d ON d.refobjid = e.oid AND d.refclassid = 'pg_extension'::regclass
      LEFT JOIN pg_extension dep ON dep.oid = d.objid
      GROUP BY e.extname, e.default_version, nv.extversion, n.nspname, e.extrelocatable, n.oid, e.oid
      ORDER BY e.extname
    `.execute(db);

    const compatibilityQuery = sql<ExtensionCompatibilityInfo>`
      SELECT
        e.extname as extension_name,
        version() as postgres_version,
        CASE
          WHEN e.extname IN ('plpgsql', 'adminpack', 'amcheck', 'autoinc', 'bloom', 'btree_gin', 'btree_gist', 'citext', 'cube', 'dblink', 'dict_int', 'dict_xsyn', 'earthdistance', 'file_fdw', 'fuzzystrmatch', 'hstore', 'intarray', 'isn', 'lo', 'ltree', 'pg_buffercache', 'pg_freespacemap', 'pg_prewarm', 'pg_stat_statements', 'pg_trgm', 'pg_visibility', 'pgcrypto', 'pgrowlocks', 'pgstattuple', 'postgres_fdw', 'seg', 'spi', 'sslinfo', 'tablefunc', 'tcn', 'tsm_system_rows', 'tsm_system_time', 'unaccent', 'uuid-ossp', 'xml2') THEN true
          ELSE true
        END as compatible,
        'Check extension documentation for version-specific requirements' as notes
      FROM pg_available_extensions e
      ORDER BY e.extname
    `.execute(db);

    const [extensionsResult, compatibilityResult] = await Promise.all([
      extensionsQuery,
      compatibilityQuery,
    ]);

    return {
      extensions: extensionsResult.rows,
      compatibility_check: compatibilityResult.rows,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
