import { sql } from "kysely";
import { getDb } from "../db.js";
import { BackupMonitorInputSchema, validateInput } from "../validation.js";

export interface BackupInfo {
  pg_backup_running: boolean;
  pg_backup_pid: number | null;
  pg_backup_start_time: string | null;
  pg_backup_phase: string | null;
  pg_backup_progress_pct: number;
  wal_archive_enabled: boolean;
  wal_archive_mode: string;
  wal_archive_command: string;
  last_wal_archive: string;
  wal_archive_failures: number;
  replication_slots_count: number;
  replication_slots_active: number;
}

export interface PITRInfo {
  recovery_target_time: string | null;
  recovery_target_xid: string | null;
  recovery_target_lsn: string | null;
  recovery_target_name: string | null;
  standby_mode: boolean;
  recovery_min_apply_delay: number;
}

export interface BackupMonitorOutput {
  backup_info?: BackupInfo;
  pitr_info?: PITRInfo;
  error?: string;
  timestamp?: string;
}

export async function backupMonitorTool(input: unknown): Promise<BackupMonitorOutput> {
  try {
    const validation = validateInput(BackupMonitorInputSchema, input);
    if (!validation.success) {
      return { error: `Input validation failed: ${validation.error}` };
    }

    const { database_name } = validation.data;
    const db = getDb(database_name);

    const backupQuery = sql<BackupInfo>`
      SELECT
        EXISTS(
          SELECT 1 FROM pg_stat_progress_basebackup
        ) as pg_backup_running,
        (
          SELECT pid FROM pg_stat_progress_basebackup LIMIT 1
        ) as pg_backup_pid,
        (
          SELECT backend_start::text FROM pg_stat_progress_basebackup LIMIT 1
        ) as pg_backup_start_time,
        (
          SELECT phase FROM pg_stat_progress_basebackup LIMIT 1
        ) as pg_backup_phase,
        COALESCE(
          (SELECT CASE
            WHEN backup_total > 0 THEN
              ROUND((backup_streamed::numeric / backup_total * 100), 2)
            ELSE 0
          END FROM pg_stat_progress_basebackup LIMIT 1),
          0
        ) as pg_backup_progress_pct,
        current_setting('archive_mode') = 'on' as wal_archive_enabled,
        current_setting('archive_mode') as wal_archive_mode,
        current_setting('archive_command') as wal_archive_command,
        COALESCE(
          (SELECT last_archived_wal::text FROM pg_stat_archiver LIMIT 1),
          'never'
        ) as last_wal_archive,
        COALESCE(
          (SELECT failed_count FROM pg_stat_archiver LIMIT 1),
          0
        ) as wal_archive_failures,
        COUNT(*) as replication_slots_count,
        SUM(CASE WHEN active THEN 1 ELSE 0 END) as replication_slots_active
      FROM pg_replication_slots
      RIGHT JOIN pg_settings ON 1=1
    `.execute(db);

    const pitrQuery = sql<PITRInfo>`
      SELECT
        current_setting('recovery_target_time', true) as recovery_target_time,
        current_setting('recovery_target_xid', true) as recovery_target_xid,
        current_setting('recovery_target_lsn', true) as recovery_target_lsn,
        current_setting('recovery_target_name', true) as recovery_target_name,
        pg_is_in_recovery() as standby_mode,
        COALESCE(
          current_setting('recovery_min_apply_delay', true)::int,
          0
        ) as recovery_min_apply_delay
    `.execute(db);

    const [backupResult, pitrResult] = await Promise.all([
      backupQuery,
      pitrQuery,
    ]);

    return {
      backup_info: backupResult.rows[0],
      pitr_info: pitrResult.rows[0],
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
