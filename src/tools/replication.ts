import { sql } from "kysely";
import { getDb } from "../db.js";
import { ReplicationStatusInputSchema, validateInput } from "../validation.js";

export interface PublicationInfo {
  publication_name: string;
  database_name: string;
  all_tables: boolean;
  table_count: number;
  publish_via_partition_root: boolean;
}

export interface SubscriptionInfo {
  subscription_name: string;
  database_name: string;
  publication_name: string;
  publication_server: string;
  status: string;
  lag_bytes: number;
  lag_pretty: string;
  sync_state: string;
}

export interface ReplicationSlotInfo {
  slot_name: string;
  slot_type: string;
  database: string;
  active: boolean;
  restart_lsn: string;
  wal_retention_bytes: number;
  wal_retention_pretty: string;
}

export interface ReplicationStatusOutput {
  publications?: PublicationInfo[];
  subscriptions?: SubscriptionInfo[];
  replication_slots?: ReplicationSlotInfo[];
  error?: string;
}

export async function replicationStatusTool(input: unknown): Promise<ReplicationStatusOutput> {
  try {
    const validation = validateInput(ReplicationStatusInputSchema, input);
    if (!validation.success) {
      return { error: `Input validation failed: ${validation.error}` };
    }

    const { database_name } = validation.data;
    const db = getDb(database_name);

    const publicationsQuery = sql<PublicationInfo>`
      SELECT
        p.pubname as publication_name,
        d.datname as database_name,
        p.puballtables as all_tables,
        COUNT(pr.pubid) as table_count,
        p.pubviaroot as publish_via_partition_root
      FROM pg_publication p
      JOIN pg_database d ON d.oid = p.pubdboid
      LEFT JOIN pg_publication_rel pr ON pr.pubid = p.oid
      GROUP BY p.pubname, d.datname, p.puballtables, p.pubviaroot
      ORDER BY d.datname, p.pubname
    `.execute(db);

    const subscriptionsQuery = sql<SubscriptionInfo>`
      SELECT
        s.subname as subscription_name,
        d.datname as database_name,
        s.subpublications as publication_name,
        s.subconninfo as publication_server,
        s.subenabled::text as status,
        pg_wal_lsn_diff(pg_current_wal_lsn(), s.subskiplsn) as lag_bytes,
        pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), s.subskiplsn)) as lag_pretty,
        s.subsyncstate as sync_state
      FROM pg_subscription s
      JOIN pg_database d ON d.oid = s.subdbid
      ORDER BY d.datname, s.subname
    `.execute(db);

    const slotsQuery = sql<ReplicationSlotInfo>`
      SELECT
        slot_name,
        slot_type,
        COALESCE(database, 'physical') as database,
        active,
        restart_lsn::text,
        pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) as wal_retention_bytes,
        pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) as wal_retention_pretty
      FROM pg_replication_slots
      ORDER BY slot_name
    `.execute(db);

    const [publicationsResult, subscriptionsResult, slotsResult] = await Promise.all([
      publicationsQuery,
      subscriptionsQuery,
      slotsQuery,
    ]);

    return {
      publications: publicationsResult.rows,
      subscriptions: subscriptionsResult.rows,
      replication_slots: slotsResult.rows,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
