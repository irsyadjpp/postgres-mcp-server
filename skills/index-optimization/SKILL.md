---
name: index-optimization
description: Analyze and optimize database indexes including duplicate detection, deduplication, foreign key indexes, JSONB GIN indexes, and ORM query coverage. Use when investigating slow queries, high disk usage from indexes, or missing index warnings.
---

Workflow:
1. Run list_indexes to see all indexes on a table or schema
2. Run index_dedup to identify B-tree indexes that can benefit from deduplication (PostgreSQL 13+)
3. Run foreign_key to find foreign keys missing indexes
4. Run jsonb_analysis to check JSONB columns for GIN index coverage
5. Run orm_index_coverage to find columns used in @Query WHERE clauses without indexes
6. Run extended_stats to check for multi-column correlation statistics

Key recommendations:
- Duplicate indexes: Drop redundant indexes to save disk space and write overhead
- FK indexes: Add indexes on foreign key columns for JOIN performance
- JSONB: Add GIN indexes for @> and ? operators
- ORM: Add indexes matching @Query WHERE clause patterns
- Deduplication: Run REINDEX on large B-tree indexes (PostgreSQL 13+)
- Extended stats: Create extended statistics for correlated columns