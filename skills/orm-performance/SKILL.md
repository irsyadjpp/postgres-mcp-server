---
name: orm-performance
description: Optimize JPA/Hibernate/Spring Boot ORM performance including N+1 queries, lazy loading, connection pool tuning, batch operations, and prepared statements. Use when investigating slow Java backend performance, high database load from ORM, or entity mapping issues.
---

Workflow:
1. Run orm_performance to detect N+1 query problems and lazy loading issues
2. Run orm_index_coverage to check if @Query WHERE clauses have proper index coverage
3. Run connection_pool to check HikariCP metrics and detect connection leaks
4. Run prepared_statement to verify prepared statement cache usage
5. Run batch_operation to check JDBC batch efficiency
6. Run jpa_mapping to validate entity-to-table mapping consistency
7. Run jpa_schema_validation to check @Table/@Column/@Index annotations
8. Run sequence_monitor to check @GeneratedValue sequence health
9. Run transaction_monitor to check for long-running transactions

Key recommendations:
- N+1: Use JOIN FETCH, @EntityGraph, or @BatchSize
- Lazy loading: Enable Hibernate statistics, use @BatchSize
- Connection pool: Set connectionTimeout(30000), leakDetectionThreshold(2000)
- Prepared statements: Enable cachePrepStmts(true), prepStmtCacheSize(256)
- Batch: Set batch_size=50, order_inserts=true, order_updates=true
- Indexes: Add @Index for frequently queried columns
- Sequences: Use SEQUENCE strategy with proper cache size