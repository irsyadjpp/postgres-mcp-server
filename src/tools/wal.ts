import { sql } from "kysely";
import { getDb } from "../db.js";
import { WALMonitorInputSchema, validateInput } from "../validation.js";

export interface WALInfo {
  wal_size_bytes: number;
  wal_size_pretty: string;
  wal_lsn: string;
  wal_location: string;
  wal_files: number;
  wal_rotation_rate: string;
}

export interface WALArchiveInfo {
  archived_files: number;
  last_archive_file: string;
  last_archive_time: string;
  archive_status: string;
  archive_failures: number;
}

export interface WALReplicationSlotInfo {
  slot_name: string;
  slot_type: string;
  active: boolean;
  restart_lsn: string;
  wal_retention_bytes: number;
  wal_retention_pretty: string;
  wal_retention_hours: number;
}

export interface WALMonitorOutput {
  wal_info?: WALInfo;
  archive_info?: WALArchiveInfo;
  replication_slots?: WALReplicationSlotInfo[];
  error?: string;
  timestamp?: string;
}

export async function walMonitorTool(input: unknown): Promise<WALMonitorOutput> {
  try {
    const validation = validateInput(WALMonitorInputSchema, input);
    if (!validation.success) {
      return { error: `Input validation failed: ${validation.error}` };
    }

    const { database_name } = validation.data;
    const db = getDb(database_name);

    const walQuery = sql<WALInfo>`
      SELECT
        pg_walfile_name(pg_current_wal_lsn()) as current_wal_file,
        pg_current_wal_lsn()::text as wal_lsn,
        pg_walfile_name_offset(pg_current_wal_lsn()) as wal_location,
        pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), '0/0')) as wal_size_pretty,
        pg_wal_lsn_diff(pg_current_wal_lsn(), '0/0') as wal_size_bytes
    `.execute(db);

    const archiveQuery = sql<WALArchiveInfo>`
      SELECT
        COUNT(*) as archived_files,
        MAX(name) as last_archive_file,
        MAX(time)::text as last_archive_time,
        MAX(status) as archive_status,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as archive_failures
      FROM pg_stat_archiver
    `.execute(db);

    const slotsQuery = sql<WALReplicationSlotInfo>`
      SELECT
        slot_name,
        slot_type,
        active,
        restart_lsn::text,
        pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) as wal_retention_bytes,
        pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) as wal_retention_pretty,
        EXTRACT(EPOCH FROM (pg_current_wal_lsn() - restart_lsn)) / 3600 as wal_retention_hours
      FROM pg_replication_slots
      ORDER BY slot_name
    `.execute(db);

    const [walResult, archiveResult, slotsResult] = await Promise.all([
      walQuery,
      archiveQuery,
      slotsQuery,
    ]);

    const walRow = walResult.rows[0];
    const walInfo: WALInfo = {
      wal_size_bytes: Number(walRow?.wal_size_bytes || 0),
      wal_size_pretty: walRow?.wal_size_pretty || "0 bytes",
      wal_lsn: walRow?.wal_lsn || "",
      wal_location: walRow?.wal_location || "",
      wal_files: 0,
      wal_rotation_rate: "N/A",
    };

    const archiveRow = archiveResult.rows[0];
    const archiveInfo: WALArchiveInfo = {
      archived_files: Number(archiveRow?.archived_files || 0),
      last_archive_file: archiveRow?.last_archive_file || "",
      last_archive_time: archiveRow?.last_archive_time || "",
      archive_status: archiveRow?.archive_status || "unknown",
      archive_failures: Number(archiveRow?.archive_failures || 0),
    };

    return {
      wal_info: walInfo,
      archive_info: archiveInfo,
      replication_slots: slotsResult.rows,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
