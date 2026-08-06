---
name: partition-management
description: Manage and optimize PostgreSQL table partitioning including partition pruning, time-series partitioning, and partition maintenance. Use when investigating large table performance, time-series data growth, or partition-related issues.
---

Workflow:
1. Run list_partitions to see all partitioned tables and pruning efficiency
2. Run timeseries_partition to identify time-series tables that could benefit from partitioning
3. Check partition pruning ratio - low ratio indicates queries not using partition keys
4. For time-series tables, recommend RANGE partitioning by timestamp column
5. Suggest pg_partman for automated partition maintenance

Key recommendations:
- Use PARTITION BY RANGE for timestamp-based partitioning
- Align partition intervals with application time windows (daily, weekly, monthly)
- Use declarative partitioning (PostgreSQL 10+) for easier management
- Ensure queries filter on partition key for pruning
- Set up automated partition maintenance with pg_partman
- Monitor partition count and size distribution