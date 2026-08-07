# PostgreSQL MCP Server

> A secure **Model Context Protocol (MCP) Server** for PostgreSQL built with **Kysely ORM**. It enables AI assistants such as Claude Desktop, GitHub Copilot, Cline, and others to interact with PostgreSQL databases using natural language.

[![npm version](https://img.shields.io/npm/v/@irsyadjpp/postgres-mcp-server)](https://www.npmjs.com/package/@irsyadjpp/postgres-mcp-server)
[![Tests](https://github.com/irsyadjpp/postgres-mcp-server/actions/workflows/test.yml/badge.svg)](https://github.com/irsyadjpp/postgres-mcp-server/actions/workflows/test.yml)
[![GitHub issues](https://img.shields.io/github/issues/irsyadjpp/postgres-mcp-server)](https://github.com/irsyadjpp/postgres-mcp-server/issues)

A secure **Model Context Protocol (MCP)** server for PostgreSQL built with **Kysely ORM**. It provides AI assistants with secure, read-only (by default) access to PostgreSQL databases using natural language.

---

# Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Configuration](#configuration)
- [Available Tools](#available-tools)
- [Claude Desktop Configuration](#claude-desktop-configuration)
- [Development](#development)
- [Environment Variables](#environment-variables)
- [Migration Guide](#migration-guide)
- [License](#license)

---

# Features

## Database Features

- ✅ PostgreSQL **12–18** support
- ✅ Multi-database support
- ✅ Lazy database initialization
- ✅ Connection pooling
- ✅ Query timeout configuration
- ✅ Read-only mode by default
- ✅ Parameterized queries (SQL Injection protection)
- ✅ Type-safe validation using Zod

---

## MCP Capabilities

More than **40 MCP tools** covering:

- SQL Query Execution
- Schema Inspection
- Table Explorer
- Index Explorer
- Query Explain Plan
- Database Diagnostics
- Performance Monitoring
- PostgreSQL DBA Utilities
- Java Backend Monitoring

---

## PostgreSQL Advanced Monitoring

Supports PostgreSQL modern features including:

- Partitioning
- WAL Monitoring
- Replication
- Parallel Query
- JSONB Analysis
- Generated Columns
- Extended Statistics
- Autovacuum Advisor
- Backup Monitoring
- Huge Pages
- Extensions
- Foreign Key Analysis

---

## Java Backend Support

Built specifically for Java backend engineers.

Supports monitoring for:

- Spring Boot
- Quarkus
- Hibernate
- Spring Data JPA
- HikariCP
- Flyway
- Liquibase
- JDBC Batch
- Transaction Monitoring
- Connection Leak Detection

---

# Installation

Run directly with NPX:

```bash
npx @irsyadjpp/postgres-mcp-server
```

---

# Configuration

The server supports three configuration methods.

## Option 1 — Environment Variables (Recommended)

### Default Database

```env
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=postgres
DB_SSL=true
```

### Additional Databases

```env
DB_PROD_HOST=prod.example.com
DB_PROD_PORT=5432
DB_PROD_USER=app_user
DB_PROD_PASSWORD=secret
DB_PROD_DATABASE=production
DB_PROD_SSL=true

DB_STAGING_HOST=staging.example.com
DB_STAGING_PORT=5432
DB_STAGING_USER=app_user
DB_STAGING_PASSWORD=secret
DB_STAGING_DATABASE=staging
DB_STAGING_SSL=true
```

---

## Option 2 — JSON Configuration

Set:

```env
DB_CONFIG_PATH=/path/to/db-config.json
```

Example:

```json
{
  "databases": [
    {
      "name": "default",
      "host": "127.0.0.1",
      "port": 5432,
      "user": "postgres",
      "password": "password",
      "database": "postgres",
      "maxConnections": 5,
      "ssl": true
    },
    {
      "name": "production",
      "host": "prod.example.com",
      "port": 5432,
      "user": "app_user",
      "password": "secret",
      "database": "production",
      "maxConnections": 10,
      "ssl": true
    }
  ]
}
```

---

## Option 3 — Dynamic Database Selection

Every MCP tool accepts an optional parameter:

```json
{
  "database_name": "production"
}
```

Example:

```json
{
  "sql": "SELECT * FROM users",
  "database_name": "production"
}
```

---

# Available Tools

## Core Tools

| Tool | Description |
|------|-------------|
| `query` | Execute SQL queries with pagination |
| `describe_table` | Describe table structure |
| `list_objects` | List tables, views, or functions |
| `list_schemas` | List schemas |
| `list_indexes` | List indexes |
| `search_objects` | Search database objects |
| `explain_query` | Explain execution plan |
| `get_connections` | Show active connections |
| `diagnose_database` | Database health check |
| `get_slow_queries` | Analyze slow queries |

---

## PostgreSQL Advanced Tools

| Tool | Description |
|------|-------------|
| `list_partitions` | Partition monitoring |
| `replication_status` | Replication monitoring |
| `progress_report` | VACUUM / CREATE INDEX progress |
| `wal_monitor` | WAL monitoring |
| `extended_stats` | Extended statistics |
| `index_dedup` | Index deduplication analysis |
| `generated_columns` | Generated column analysis |
| `jsonb_analysis` | JSONB recommendations |
| `parallel_query` | Parallel worker monitoring |
| `autovacuum_advisor` | Autovacuum recommendations |
| `huge_pages` | Huge pages monitoring |
| `statements_enhanced` | Enhanced pg_stat_statements |
| `foreign_key` | Foreign key analysis |
| `backup_monitor` | Backup monitoring |
| `extensions` | Installed extensions |

---

## Java Backend Tools

| Tool | Description |
|------|-------------|
| `connection_pool` | HikariCP monitoring |
| `jpa_mapping` | Validate JPA mappings |
| `orm_performance` | ORM performance analysis |
| `transaction_monitor` | Transaction monitoring |
| `prepared_statement` | Prepared statement analysis |
| `migration_tracking` | Flyway/Liquibase monitoring |
| `orm_index_coverage` | ORM index recommendations |
| `jsonb_entity` | JSONB entity analysis |
| `batch_operation` | JDBC batch monitoring |
| `sequence_monitor` | Sequence monitoring |
| `timeseries_partition` | Partition recommendations |
| `connection_leak` | Connection leak detection |
| `deadlock_analysis` | Deadlock analysis |
| `jpa_schema_validation` | Validate JPA annotations |
| `orm_performance_baseline` | CRUD performance baseline |

---

# Key Capabilities

- Multi-database support
- Automatic pagination
- SQL Injection protection
- PostgreSQL diagnostics
- Query performance analysis
- Database health monitoring
- DBA utilities
- Spring Boot optimization
- Quarkus optimization
- Hibernate optimization

---

# Claude Desktop Configuration

Example:

```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": [
        "@irsyadjpp/postgres-mcp-server@latest"
      ],
      "env": {
        "DB_HOST": "127.0.0.1",
        "DB_PORT": "5432",
        "DB_USER": "postgres",
        "DB_PASSWORD": "password",
        "DB_NAME": "postgres",
        "DB_SSL": "true"
      }
    }
  }
}
```

---

## Other Supported AI Assistants

Configuration examples are included for:

- Claude Desktop
- GitHub Copilot Chat
- Cline
- Antigravity IDE

See **CONFIG-GUIDES.md** for detailed setup instructions.

---

## Claude Configuration Locations

### macOS

```
~/Library/Application Support/Claude/claude_desktop_config.json
```

### Windows

```
%APPDATA%\Claude\claude_desktop_config.json
```

---

# Development

Clone the repository:

```bash
git clone https://github.com/irsyadjpp/postgres-mcp-server.git

cd postgres-mcp-server

npm install
```

Run development server:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Run all tests:

```bash
npm test
```

Run unit tests:

```bash
npm run test:unit
```

Run integration tests:

```bash
npm run test:integration
```

---

# Environment Variables

| Variable | Default | Description |
|-----------|---------|-------------|
| `DB_HOST` | `127.0.0.1` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USER` | `postgres` | Database user |
| `DB_PASSWORD` | — | Database password |
| `DB_NAME` | `postgres` | Database name |
| `DB_SSL` | `true` | Enable SSL |
| `DB_CONFIG_PATH` | — | JSON configuration path |
| `READ_ONLY` | `true` | Restrict to SELECT/EXPLAIN |
| `QUERY_TIMEOUT` | `30000` | Query timeout (ms) |
| `MAX_PAGE_SIZE` | `500` | Maximum page size |
| `DEFAULT_PAGE_SIZE` | `100` | Default page size |

Additional databases:

```text
DB_<NAME>_HOST
DB_<NAME>_PORT
DB_<NAME>_USER
DB_<NAME>_PASSWORD
DB_<NAME>_DATABASE
DB_<NAME>_SSL
```

---

# Migration Guide

Existing users require **no configuration changes**.

The server maintains full backward compatibility.

To add another database:

```env
DB_PROD_HOST=prod.example.com
DB_PROD_PORT=5432
DB_PROD_USER=app_user
DB_PROD_PASSWORD=secret
DB_PROD_DATABASE=production
```

Use it in any MCP tool:

```json
{
  "database_name": "prod"
}
```

Alternatively, migrate to a JSON configuration by setting:

```env
DB_CONFIG_PATH=/path/to/db-config.json
```

---

# License

ISC