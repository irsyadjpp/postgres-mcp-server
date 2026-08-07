# Postgres MCP Server

[![npm version](https://www.npmjs.com/package/@irsyadjpp/postgres-mcp-server/v/1.0.0)
[![Tests](https://github.com/irsyadjpp/postgres-mcp-server/actions/workflows/test.yml/badge.svg)](https://github.com/irsyadjpp/postgres-mcp-server/actions/workflows/test.yml)
[![GitHub issues](https://img.shields.io/github/issues/irsyadjpp/postgres-mcp-server)](https://github.com/irsyadjpp/postgres-mcp-server/issues)

A Model Context Protocol (MCP) server that provides secure database access to PostgreSQL through Kysely ORM. This server enables Claude Desktop to interact with PostgreSQL databases using natural language.

## Features

- **Multi-Database Support**: Connect to multiple PostgreSQL databases with lazy initialization
- **PostgreSQL 12-18 Support**: Advanced monitoring tools for partitioning, replication, WAL, and performance
- **40+ MCP Tools**: Query execution, table listing, schema inspection, diagnostics, DBA utilities, and Java backend monitoring
- **Type Safety**: Full TypeScript support with typed inputs/outputs
- **Connection Pooling**: Configurable connection limits with idle timeout
- **Error Handling**: Graceful error messages for connection and query issues
- **Security**: Parameterized queries to prevent SQL injection

## Installation

```bash
npx postgres-mcp-server
```

## Configuration

### Option A: Environment Variables (Default)

Configure databases using environment variables. The default database uses the standard `DB_*` variables, while additional databases use the naming convention `DB_<NAME>_*`.

**Default Database:**
```env
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password_here
DB_NAME=postgres
DB_SSL=true
```

**Additional Databases:**
```env
# Production database
DB_PROD_HOST=prod.example.com
DB_PROD_PORT=5432
DB_PROD_USER=app_user
DB_PROD_PASSWORD=prod_password
DB_PROD_DATABASE=production
DB_PROD_POOL_MAX=10
DB_PROD_SSL=true

# Staging database
DB_STAGING_HOST=staging.example.com
DB_STAGING_PORT=5432
DB_STAGING_USER=app_user
DB_STAGING_PASSWORD=staging_password
DB_STAGING_DATABASE=staging
```

### Option B: JSON Config File

Set `DB_CONFIG_PATH` to point to a JSON configuration file:

```env
DB_CONFIG_PATH=/path/to/db-config.json
```

**db-config.json:**
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
      "name": "prod",
      "host": "prod.example.com",
      "port": 5432,
      "user": "app_user",
      "password": "secret",
      "database": "production",
      "maxConnections": 10
    }
  ]
}
```

### Option C: Dynamic Configuration via Tool Parameters

Tools accept an optional `database_name` parameter to specify which database to use. If not provided, the "default" database is used.

Example:
```json
{
  "sql":SELECT * FROM users",
  "database_name": "prod"
}
```

## Available Tools

### Core Tools

| Tool                  | Description                                 | Required Parameters                 | Optional Parameters                                         |
| --------------------- | ------------------------------------------- | ----------------------------------- | ----------------------------------------------------------- |
| **`query`**           | Execute SQL queries with pagination support | `sql` (string)                      | `pageSize` (1-500), `offset` (number), `parameters` (array), `database_name` (string) |
| **`describe_table`**  | Get table structure and column details      | `schema` (string), `table` (string) | `database_name` (string)                                   |
| **`list_objects`**    | List tables, views, or functions in a schema | `type` (enum: tables/views/functions) | `schema` (string), `database_name` (string)                  |
| **`list_schemas`**    | List all schemas in the database            | -                                   | `includeSystemSchemas` (boolean), `database_name` (string)  |
| **`list_indexes`**    | List indexes for a table or schema          | `schema` (string)                   | `table` (string), `database_name` (string)                  |
| **`explain_query`**   | Get query execution plan                    | `sql` (string)                      | `analyze` (boolean), `buffers` (boolean), `costs` (boolean), `format` (text/json/xml/yaml), `database_name` (string) |
| **`search_objects`**  | Find tables, columns, functions, views by name pattern | `pattern` (string) | `object_types` (array), `schemas` (array), `limit` (1-100), `database_name` (string) |
| **`get_connections`** | Show active database connections, utilization, and idle-in-transaction warnings | - | `include_queries` (boolean), `group_by` (enum), `database_name` (string) |
| **`diagnose_database`** | Composite database health check: cache, connections, vacuum, indexes, sequences | - | `include_queries` (boolean), `include_connections` (boolean), `database_name` (string) |
| **`get_slow_queries`** | Analyze slow queries via pg_stat_statements with filtering and sorting | - | `sort_by` (enum), `limit` (1-50), `min_calls` (number), `min_duration_ms` (number), `include_query_text` (boolean), `database_name` (string) |

### PostgreSQL 12-18 Advanced Tools

| Tool                  | Description                                 | Required Parameters                 | Optional Parameters                                         |
| --------------------- | ------------------------------------------- | ----------------------------------- | ----------------------------------------------------------- |
| **`list_partitions`** | List partitioned tables and monitor partition pruning efficiency (PostgreSQL 12+) | - | `schema` (string), `table` (string), `database_name` (string) |
| **`replication_status`** | Monitor logical replication: publications, subscriptions, and lag (PostgreSQL 13+) | - | `database_name` (string) |
| **`progress_report`** | Monitor progress of VACUUM, ANALYZE, CLUSTER, and CREATE INDEX operations | - | `database_name` (string) |
| **`wal_monitor`** | Monitor WAL size, growth, archive status, and replication slots | - | `database_name` (string) |
| **`extended_stats`** | List extended statistics and provide recommendations for multi-column correlations | - | `schema` (string), `table` (string), `database_name` (string) |
| **`index_dedup`** | Identify B-tree indexes that can benefit from deduplication (PostgreSQL 13+) | - | `schema` (string), `table` (string), `database_name` (string) |
| **`generated_columns`** | List generated columns and monitor their dependencies (PostgreSQL 12+) | - | `schema` (string), `table` (string), `database_name` (string) |
| **`jsonb_analysis`** | Analyze JSONB columns and recommend GIN indexes for better performance | - | `schema` (string), `table` (string), `database_name` (string) |
| **`parallel_query`** | Monitor parallel query worker usage and performance | - | `database_name` (string) |
| **`autovacuum_advisor`** | Analyze autovacuum effectiveness and recommend tuning settings | - | `schema` (string), `table` (string), `database_name` (string) |
| **`huge_pages`** | Monitor huge pages usage and provide configuration recommendations | - | `database_name` (string) |
| **`statements_enhanced`** | Enhanced pg_stat_statements analysis with parallel workers and WAL tracking | - | `limit` (1-100), `database_name` (string) |
| **`foreign_key`** | Monitor foreign key performance and identify missing indexes | - | `schema` (string), `table` (string), `database_name` (string) |
| **`backup_monitor`** | Monitor pg_basebackup progress and PITR recovery timeline | - | `database_name` (string) |
| **`extensions`** | List installed extensions, check compatibility, and view dependencies | - | `database_name` (string) |

### Java Backend & Spring Boot Tools

| Tool                  | Description                                 | Required Parameters                 | Optional Parameters                                         |
| --------------------- | ------------------------------------------- | ----------------------------------- | ----------------------------------------------------------- |
| **`connection_pool`** | Monitor HikariCP connection pool metrics, detect connection leaks, and track wait times | - | `database_name` (string) |
| **`jpa_mapping`** | Validate database schema against JPA/Hibernate entity mappings | - | `schema` (string), `database_name` (string) |
| **`orm_performance`** | Analyze ORM query performance, detect N+1 problems, and identify lazy loading issues | - | `database_name` (string) |
| **`transaction_monitor`** | Monitor active transactions, isolation levels, and detect long-running transactions | - | `database_name` (string) |
| **`prepared_statement`** | Analyze prepared statement cache hit ratio and query patterns | - | `database_name` (string) |
| **`migration_tracking`** | Track Flyway/Liquibase migrations, detect schema drift, and validate checksums | - | `database_name` (string) |
| **`orm_index_coverage`** | Analyze index coverage for ORM @Query annotations and recommend missing indexes | - | `schema` (string), `database_name` (string) |
| **`jsonb_entity`** | Analyze JSONB columns for @Convert entity attributes and recommend GIN indexes | - | `schema` (string), `database_name` (string) |
| **`batch_operation`** | Monitor JDBC batch operation performance and efficiency | - | `database_name` (string) |
| **`sequence_monitor`** | Monitor sequences for JPA @GeneratedValue and detect exhaustion risks | - | `schema` (string), `database_name` (string) |
| **`timeseries_partition`** | Recommend partitioning strategies for time-series entity tables | - | `schema` (string), `database_name` (string) |
| **`connection_leak`** | Detect connection leaks and analyze connection acquisition patterns | - | `database_name` (string) |
| **`deadlock_analysis`** | Analyze deadlock patterns and lock wait information | - | `database_name` (string) |
| **`jpa_schema_validation`** | Validate Spring Data JPA annotations against database schema | - | `schema` (string), `database_name` (string) |
| **`orm_performance_baseline`** | Establish and monitor performance baselines for ORM CRUD operations | - | `database_name` (string) |

### Key Features

- **Pagination**: Query tool supports up to 500 rows per page with automatic LIMIT/OFFSET handling
- **Security**: Parameterized queries prevent SQL injection, READ_ONLY mode by default
- **Type Safety**: Full TypeScript support with Zod schema validation
- **PostgreSQL 12-18 Features**: Support for partitioning, logical replication, generated columns, B-tree deduplication, and more
- **DBA Tools**: Comprehensive monitoring for WAL, replication, autovacuum, parallel queries, and performance tuning
- **Java Backend Support**: Specialized tools for Spring Boot, Quarkus, Hibernate, and HikariCP monitoring

## Claude Desktop Configuration

Configuration examples are available for multiple AI assistants:

| Configuration File | AI Assistant |
|-------------------|--------------|
| `claude_config_example.json` | Claude Desktop |
| `config-cline.json` | Cline (VS Code) |
| `config-github-copilot.json` | GitHub Copilot Chat |
| `config-antigravity.json` | Antigravity IDE |

See [CONFIG-GUIDES.md](CONFIG-GUIDES.md) for detailed installation instructions for each assistant.

### Claude Desktop

Add this server to your Claude Desktop configuration file:

Edit `claude_desktop_config.json`:

**Single Database Configuration:**
```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["@irsyadjpp/postgres-mcp-server@latest"],
      "env": {
        "DB_HOST": "127.0.0.1",
        "DB_PORT": "5432",
        "DB_USER": "postgres",
        "DB_PASSWORD": "your_password_here",
        "DB_NAME": "your_database_name",
        "DB_SSL": "true"
      }
    }
  }
}
```

See [CONFIG-GUIDES.md](CONFIG-GUIDES.md) for multi-database configuration and other AI assistants.

**Multi-Database Configuration:**
```json
{
  "mcpServers": {
    "postgres-mcp-server": {
      "command": "npx",
      "args": ["postgres-mcp-server"],
      "env": {
        "DB_HOST": "127.0.0.1",
        "DB_PORT": "5432",
        "DB_USER": "postgres",
        "DB_PASSWORD": "dev_password",
        "DB_NAME": "development",
        "DB_SSL": "true",
        "DB_PROD_HOST": "prod.example.com",
        "DB_PROD_PORT": "5432",
        "DB_PROD_USER": "app_user",
        "DB_PROD_PASSWORD": "prod_password",
        "DB_PROD_DATABASE": "production",
        "DB_PROD_SSL": "true"
      }
    }
  }
}
```

**Using JSON Config File:**
```json
{
  "mcpServers": {
    "postgres-mcp-server": {
      "command": "npx",
      "args": ["postgres-mcp-server"],
      "env": {
        "DB_CONFIG_PATH": "/path/to/db-config.json"
      }
    }
  }
}
```

### Configuration File Locations

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

## Development

```bash
# Clone and install dependencies
git clone https://github.com/irsyadjpp/postgres-mcp-server.git
cd postgres-mcp-server
npm install

# Run in development mode with hot reload
npm run dev

# Build for production
npm run build

# Run tests
npm run test

# Run specific test suites
npm run test:unit
npm run test:integration
```

## Environment Variables

| Variable            | Default     | Description                             |
| ------------------- | ----------- | --------------------------------------- |
| `DB_HOST`           | `127.0.0.1` | PostgreSQL host (default database)      |
| `DB_PORT`           | `5432`      | PostgreSQL port (default database)      |
| `DB_USER`           | `postgres`  | Database user (default database)        |
| `DB_PASSWORD`       | _required_  | Database password (default database)    |
| `DB_NAME`           | `postgres`  | Database name (default database)         |
| `DB_SSL`            | `true`      | Enable SSL connection (default database) |
| `DB_CONFIG_PATH`    | -           | Path to JSON config file (alternative)   |
| `DB_<NAME>_HOST`    | -           | Host for additional database            |
| `DB_<NAME>_PORT`    | `5432`      | Port for additional database             |
| `DB_<NAME>_USER`    | -           | User for additional database             |
| `DB_<NAME>_PASSWORD`| -           | Password for additional database         |
| `DB_<NAME>_DATABASE`| -           | Database name for additional database    |
| `READ_ONLY`         | `true`      | Restrict to SELECT/WITH/EXPLAIN queries |
| `QUERY_TIMEOUT`     | `30000`     | Query timeout in milliseconds           |
| `MAX_PAGE_SIZE`     | `500`       | Maximum rows per page                   |
| `DEFAULT_PAGE_SIZE` | `100`       | Default page size when not specified    |

## Migration Guide

### For Existing Single-Database Users

Your existing configuration will continue to work without any changes. The server maintains full backward compatibility:

1. **No changes required** - Your current `.env` file works as-is
2. **Default behavior** - Tools without `database_name` parameter use the "default" database
3. **Optional upgrade** - Add additional databases using the naming convention when ready

### Adding Additional Databases

To add more databases to your existing setup:

1. **Using Environment Variables:**
   ```env
   # Add to your existing .env
   DB_PROD_HOST=prod.example.com
   DB_PROD_PORT=5432
   DB_PROD_USER=app_user
   DB_PROD_PASSWORD=prod_password
   DB_PROD_DATABASE=production
   ```

2. **Using in Tools:**
   ```json
   {
     "sql": "SELECT * FROM users",
     "database_name": "prod"
   }
   ```

3. **Switch to JSON Config (Optional):**
   - Create a JSON config file with all your databases
   - Set `DB_CONFIG_PATH` environment variable
   - Remove individual `DB_*` variables from `.env`

## License

ISC
