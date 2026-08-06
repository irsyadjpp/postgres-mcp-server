---
name: maintenance-operations
description: Monitor and optimize PostgreSQL maintenance operations including autovacuum tuning, vacuum progress, huge pages, and WAL management. Use when investigating table bloat, vacuum issues, or system resource optimization.
---

Workflow:
1. Run autovacuum_advisor to check autovacuum effectiveness and get tuning recommendations
2. Run progress_report to monitor in-progress VACUUM, ANALYZE, CLUSTER, and CREATE INDEX operations
3. Run huge_pages to check huge pages configuration for large shared_buffers
4. Run wal_monitor to check WAL size, archive status, and replication slot retention
5. Run backup_monitor to verify backup status and PITR configuration

Key recommendations:
- Autovacuum: Tune threshold/scale_factor for tables with high dead tuple ratios
- Vacuum: Schedule VACUUM during low-traffic windows for bloated tables
- Huge pages: Enable for large shared_buffers to reduce TLB misses
- WAL: Monitor archive failures, set appropriate wal_keep_size
- Replication slots: Remove inactive slots to prevent WAL accumulation
- Backups: Verify pg_basebackup and PITR configuration