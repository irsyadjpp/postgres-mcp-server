PostgreSQL MCP Server

«A secure Model Context Protocol (MCP) Server for PostgreSQL built with Kysely ORM. It enables AI assistants such as Claude Desktop, GitHub Copilot, Cline, and others to interact with PostgreSQL databases using natural language.»

""npm version" (https://img.shields.io/npm/v/@irsyadjpp/postgres-mcp-server)" (https://www.npmjs.com/package/@irsyadjpp/postgres-mcp-server)
""Tests" (https://github.com/irsyadjpp/postgres-mcp-server/actions/workflows/test.yml/badge.svg)" (https://github.com/irsyadjpp/postgres-mcp-server/actions/workflows/test.yml)
""GitHub issues" (https://img.shields.io/github/issues/irsyadjpp/postgres-mcp-server)" (https://github.com/irsyadjpp/postgres-mcp-server/issues)

---

Features

Database

- PostgreSQL 12–18 support
- Multi-database connections
- Lazy database initialization
- Connection pooling
- Configurable query timeout
- Read-only mode (default)
- Parameterized queries (SQL Injection protection)

MCP Tools

More than 40 MCP tools, including:

- SQL Query Execution
- Schema Inspection
- Table & Index Explorer
- Query Explain Plan
- Database Diagnostics
- Performance Monitoring
- PostgreSQL DBA Utilities
- Spring Boot & Quarkus Monitoring

PostgreSQL Advanced Features

Supports monitoring for:

- Partitioning
- WAL
- Replication
- Parallel Query
- Generated Columns
- JSONB
- Extended Statistics
- Autovacuum
- Backup Progress
- Extensions
- Foreign Keys
- Huge Pages

Java Backend Support

Designed specifically for Java backend engineers.

Includes tools for:

- Spring Boot
- Hibernate
- JPA
- HikariCP
- Flyway
- Liquibase
- JDBC Batch
- Transaction Monitoring
- Connection Leak Detection

---

Installation

npx @irsyadjpp/postgres-mcp-server

---

Configuration

The server supports three configuration methods.

Option 1 — Environment Variables (Recommended)

Default Database

DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=postgres
DB_SSL=true

Additional Databases

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

---

Option 2 — JSON Configuration

Set:

DB_CONFIG_PATH=/path/to/db-config.json

Example:

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

---

Option 3 — Dynamic Database Selection

Every tool accepts an optional:

{
  "database_name": "production"
}

Example:

{
  "sql": "SELECT * FROM users",
  "database_name": "production"
}

---

Available Tools

Core Tools

Tool| Description
"query"| Execute SQL queries with pagination
"describe_table"| Describe table structure
"list_objects"| List tables, views, or functions
"list_schemas"| List database schemas
"list_indexes"| Show indexes
"search_objects"| Search tables, columns, views, functions
"explain_query"| Explain execution plan
"get_connections"| Show active connections
"diagnose_database"| Overall health check
"get_slow_queries"| Analyze slow queries

---

PostgreSQL 12–18 Monitoring

Tool
list_partitions
replication_status
progress_report
wal_monitor
extended_stats
index_dedup
generated_columns
jsonb_analysis
parallel_query
autovacuum_advisor
huge_pages
statements_enhanced
foreign_key
backup_monitor
extensions

---

Java Backend Tools

Tool
connection_pool
jpa_mapping
orm_performance
transaction_monitor
prepared_statement
migration_tracking
orm_index_coverage
jsonb_entity
batch_operation
sequence_monitor
timeseries_partition
connection_leak
deadlock_analysis
jpa_schema_validation
orm_performance_baseline

---

Key Capabilities

- Multi-database support
- Secure parameterized queries
- Type-safe validation using Zod
- Automatic pagination
- PostgreSQL diagnostics
- Performance monitoring
- DBA utilities
- Spring Boot support
- Quarkus support
- Hibernate analysis

---

Claude Desktop Configuration

Example:

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

For multi-database examples and other AI assistants, see:

- "CONFIG-GUIDES.md"

Supported assistants:

- Claude Desktop
- GitHub Copilot Chat
- Cline
- Antigravity IDE

---

Configuration File Locations

macOS

~/Library/Application Support/Claude/claude_desktop_config.json

Windows

%APPDATA%\Claude\claude_desktop_config.json

---

Development

Clone the repository:

git clone https://github.com/irsyadjpp/postgres-mcp-server.git

cd postgres-mcp-server

npm install

Development:

npm run dev

Build:

npm run build

Run all tests:

npm test

Unit tests:

npm run test:unit

Integration tests:

npm run test:integration

---

Environment Variables

Variable| Default| Description
DB_HOST| 127.0.0.1| PostgreSQL host
DB_PORT| 5432| PostgreSQL port
DB_USER| postgres| Username
DB_PASSWORD| —| Password
DB_NAME| postgres| Database name
DB_SSL| true| SSL enabled
DB_CONFIG_PATH| —| JSON config path
READ_ONLY| true| Restrict to SELECT/EXPLAIN
QUERY_TIMEOUT| 30000| Query timeout (ms)
MAX_PAGE_SIZE| 500| Maximum page size
DEFAULT_PAGE_SIZE| 100| Default page size

Additional databases:

DB_<NAME>_HOST
DB_<NAME>_PORT
DB_<NAME>_USER
DB_<NAME>_PASSWORD
DB_<NAME>_DATABASE
DB_<NAME>_SSL

---

Migration Guide

Existing users require no configuration changes.

The server is fully backward compatible.

To add another database:

DB_PROD_HOST=prod.example.com
DB_PROD_PORT=5432
DB_PROD_USER=app_user
DB_PROD_PASSWORD=secret
DB_PROD_DATABASE=production

Then specify:

{
  "database_name": "prod"
}

Alternatively, migrate to a JSON configuration using "DB_CONFIG_PATH".

---

License

ISC