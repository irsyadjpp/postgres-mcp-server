---
name: schema-migration
description: Track and validate database schema migrations including Flyway/Liquibase tracking, schema drift detection, generated columns, and extension management. Use when investigating migration failures, schema drift, or version control issues.
---

Workflow:
1. Run migration_tracking to check Flyway/Liquibase migration status and detect schema drift
2. Run generated_columns to list generated columns and their dependencies
3. Run extensions to check installed extensions and compatibility
4. Run extended_stats to check for multi-column statistics
5. Run jpa_schema_validation to validate JPA annotations against schema

Key recommendations:
- Run flyway validate before deploying to production
- Use flyway info to check migration status
- Configure flyway.baselineOnMigrate for existing databases
- Enable migration checksum validation to detect script changes
- Review generated column dependencies before schema changes
- Check extension compatibility with PostgreSQL version
- Use spring.jpa.hibernate.ddl-auto=validate in development