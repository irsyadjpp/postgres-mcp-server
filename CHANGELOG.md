# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-08-06

### Added
- Initial stable release with 40+ MCP tools for PostgreSQL database administration
- Core database operations: query, describe_table, list_objects, list_schemas, list_indexes, search_objects, explain_query
- Performance monitoring: get_slow_queries, diagnose_database, statements_enhanced, orm_performance, parallel_query, prepared_statement, batch_operation, orm_performance_baseline
- Database administration: autovacuum_advisor, progress_report, wal_monitor, backup_monitor, huge_pages, extensions, list_partitions, timeseries_partition
- Connection management: get_connections, connection_pool, connection_leak, transaction_monitor, deadlock_analysis
- Java/Spring Boot integration: jpa_mapping, jpa_schema_validation, orm_index_coverage, jsonb_entity, sequence_monitor, migration_tracking
- Index optimization: index_dedup, foreign_key, jsonb_analysis, extended_stats, generated_columns
- Advanced features: replication_status, list_partitions, progress_report
- 9 specialized skill files for common workflows
- GitHub Actions CI/CD pipelines for testing and npm publishing
- Comprehensive test suite: 403 tests across 22 test suites
- TypeScript strict mode with full type safety
- Biome linting and formatting
- Multiple database connection support via JSON config
- SSL/TLS support with certificate validation
- Read-only mode and DDL operation gating for security
- SQL injection prevention with parameterized queries
- MCP SDK v2 compatibility with Zod v4 native JSON Schema support

### Changed
- N/A (initial release)

### Deprecated
- N/A (initial release)

### Removed
- N/A (initial release)

### Fixed
- N/A (initial release)

### Security
- SQL injection prevention with parameterized queries
- Dangerous operation blocking (DROP, TRUNCATE, etc.)
- DDL operation gating (requires READ_ONLY=false and ALLOW_DDL=true)
- SSL/TLS certificate validation options
- Read-only mode enabled by default

---

## [Unreleased]

### Planned for v1.1.0
- Connection pool metrics export (Prometheus/OpenTelemetry)
- Query plan caching and analysis
- Additional PostgreSQL 18+ feature support
- Performance baseline comparison over time
- Automated index recommendation engine
- Query rewrite suggestions
- Database schema comparison tools
- Migration rollback support
- Multi-database query execution
- Custom alert thresholds and notifications

### Planned for v1.2.0
- REST API mode (in addition to stdio)
- WebSocket support for real-time monitoring
- Plugin system for custom tools
- GraphQL schema generation from database
- Automated performance tuning suggestions
- Historical performance tracking
- Integration with APM tools (New Relic, Datadog)
- Custom query builder UI templates

---

## Release Notes Format

- **Added** for new features
- **Changed** for changes in existing functionality
- **Deprecated** for soon-to-be removed features
- **Removed** for now removed features
- **Fixed** for any bug fixes
- **Security** in case of vulnerabilities

---

## Version History

- **v1.0.0** (2026-08-06) - Initial stable release
  - 40+ MCP tools
  - 403 tests passing
  - MCP SDK v2 compatibility
  - PostgreSQL 12-18 feature support
  - 9 skill files
  - Full TypeScript support
  - Security hardening

---

**Note**: This changelog will be updated with each release. For the full history, see [GitHub Releases](https://github.com/irsyadjpp/postgres-mcp-server/releases).