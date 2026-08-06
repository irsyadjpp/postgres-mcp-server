#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

import { zodToJsonSchema } from "zod-to-json-schema";
import { closeDb } from "./db.js";
import { getConnectionsTool } from "./tools/connections.js";
import { describeTableTool } from "./tools/describe.js";
import { diagnoseDatabaseTool } from "./tools/diagnostics.js";
import { listIndexesTool } from "./tools/indexes.js";
import { listObjectsTool } from "./tools/list.js";
import { explainQueryTool } from "./tools/performance.js";
import { queryTool } from "./tools/query.js";
import { listSchemasTool } from "./tools/schemas.js";
import { searchObjectsTool } from "./tools/search.js";
import { getSlowQueriesTool } from "./tools/slow-queries.js";
import { listPartitionsTool } from "./tools/partitions.js";
import { replicationStatusTool } from "./tools/replication.js";
import { progressReportTool } from "./tools/progress.js";
import { walMonitorTool } from "./tools/wal.js";
import { extendedStatsTool } from "./tools/extended-stats.js";
import { indexDedupTool } from "./tools/index-dedup.js";
import { generatedColumnsTool } from "./tools/generated-columns.js";
import { jsonbAnalysisTool } from "./tools/jsonb-analysis.js";
import { parallelQueryTool } from "./tools/parallel-query.js";
import { autovacuumAdvisorTool } from "./tools/autovacuum-advisor.js";
import { hugePagesTool } from "./tools/huge-pages.js";
import { statementsEnhancedTool } from "./tools/statements-enhanced.js";
import { foreignKeyTool } from "./tools/foreign-key.js";
import { backupMonitorTool } from "./tools/backup-monitor.js";
import { extensionsTool } from "./tools/extensions.js";
import { connectionPoolTool } from "./tools/connection-pool.js";
import { jpaMappingTool } from "./tools/jpa-mapping.js";
import { ormPerformanceTool } from "./tools/orm-performance.js";
import { transactionMonitorTool } from "./tools/transaction-monitor.js";
import { preparedStatementTool } from "./tools/prepared-statement.js";
import { migrationTrackingTool } from "./tools/migration-tracking.js";
import { ormIndexCoverageTool } from "./tools/orm-index-coverage.js";
import { jsonbEntityTool } from "./tools/jsonb-entity.js";
import { batchOperationTool } from "./tools/batch-operation.js";
import { sequenceMonitorTool } from "./tools/sequence-monitor.js";
import { timeseriesPartitionTool } from "./tools/timeseries-partition.js";
import { connectionLeakTool } from "./tools/connection-leak.js";
import { deadlockAnalysisTool } from "./tools/deadlock-analysis.js";
import { jpaSchemaValidationTool } from "./tools/jpa-schema-validation.js";
import { ormPerformanceBaselineTool } from "./tools/orm-performance-baseline.js";
import {
  AutovacuumAdvisorInputSchema,
  BackupMonitorInputSchema,
  BatchOperationInputSchema,
  ConnectionLeakInputSchema,
  ConnectionPoolInputSchema,
  DeadlockAnalysisInputSchema,
  DescribeTableInputSchema,
  DiagnoseDatabaseInputSchema,
  ExplainQueryInputSchema,
  ExtendedStatsInputSchema,
  ExtensionsInputSchema,
  ForeignKeyInputSchema,
  GeneratedColumnsInputSchema,
  GetConnectionsInputSchema,
  GetSlowQueriesInputSchema,
  HugePagesInputSchema,
  IndexDedupInputSchema,
  JpaMappingInputSchema,
  JpaSchemaValidationInputSchema,
  JSONBAnalysisInputSchema,
  JsonbEntityInputSchema,
  ListIndexesInputSchema,
  ListObjectsInputSchema,
  ListPartitionsInputSchema,
  ListSchemasInputSchema,
  MigrationTrackingInputSchema,
  OrmIndexCoverageInputSchema,
  OrmPerformanceBaselineInputSchema,
  OrmPerformanceInputSchema,
  ParallelQueryInputSchema,
  PreparedStatementInputSchema,
  ProgressReportInputSchema,
  QueryInputSchema,
  ReplicationStatusInputSchema,
  SearchObjectsInputSchema,
  SequenceMonitorInputSchema,
  StatementsEnhancedInputSchema,
  TimeseriesPartitionInputSchema,
  TransactionMonitorInputSchema,
  WALMonitorInputSchema,
  validateInput,
} from "./validation.js";

// Helper to extract inline schema from zodToJsonSchema output
// biome-ignore lint/suspicious/noExplicitAny: zod-to-json-schema accepts any Zod schema type
function getInlineSchema(zodSchema: any, name: string) {
  const jsonSchema = zodToJsonSchema(zodSchema, { name });
  return jsonSchema.definitions?.[name] || jsonSchema;
}

const server = new Server(
  {
    name: "postgres-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "query",
        description: "Execute SQL with pagination and parameterization",
        inputSchema: getInlineSchema(QueryInputSchema, "QueryInput"),
      },
      {
        name: "describe_table",
        description: "Get table structure including columns, constraints, and size statistics",
        inputSchema: getInlineSchema(DescribeTableInputSchema, "DescribeTableInput"),
      },
      {
        name: "list_objects",
        description: "List tables, views, or functions in a schema",
        inputSchema: getInlineSchema(ListObjectsInputSchema, "ListObjectsInput"),
      },
      {
        name: "list_schemas",
        description: "List all schemas in the database",
        inputSchema: getInlineSchema(ListSchemasInputSchema, "ListSchemasInput"),
      },
      {
        name: "list_indexes",
        description: "List indexes for a table or schema",
        inputSchema: getInlineSchema(ListIndexesInputSchema, "ListIndexesInput"),
      },
      {
        name: "explain_query",
        description: "Get query execution plan (EXPLAIN)",
        inputSchema: getInlineSchema(ExplainQueryInputSchema, "ExplainQueryInput"),
      },
      {
        name: "search_objects",
        description: "Find tables, columns, functions, views by name pattern across schemas",
        inputSchema: getInlineSchema(SearchObjectsInputSchema, "SearchObjectsInput"),
      },
      {
        name: "get_connections",
        description:
          "Show active database connections, utilization, and idle-in-transaction warnings",
        inputSchema: getInlineSchema(GetConnectionsInputSchema, "GetConnectionsInput"),
      },
      {
        name: "diagnose_database",
        description:
          "Composite database health check: cache, connections, vacuum, indexes, sequences",
        inputSchema: getInlineSchema(DiagnoseDatabaseInputSchema, "DiagnoseDatabaseInput"),
      },
      {
        name: "get_slow_queries",
        description: "Analyze slow queries via pg_stat_statements with filtering and sorting",
        inputSchema: getInlineSchema(GetSlowQueriesInputSchema, "GetSlowQueriesInput"),
      },
      {
        name: "list_partitions",
        description: "List partitioned tables and monitor partition pruning efficiency (PostgreSQL 12+)",
        inputSchema: getInlineSchema(ListPartitionsInputSchema, "ListPartitionsInput"),
      },
      {
        name: "replication_status",
        description: "Monitor logical replication: publications, subscriptions, and lag (PostgreSQL 13+)",
        inputSchema: getInlineSchema(ReplicationStatusInputSchema, "ReplicationStatusInput"),
      },
      {
        name: "progress_report",
        description: "Monitor progress of VACUUM, ANALYZE, CLUSTER, and CREATE INDEX operations",
        inputSchema: getInlineSchema(ProgressReportInputSchema, "ProgressReportInput"),
      },
      {
        name: "wal_monitor",
        description: "Monitor WAL size, growth, archive status, and replication slots",
        inputSchema: getInlineSchema(WALMonitorInputSchema, "WALMonitorInput"),
      },
      {
        name: "extended_stats",
        description: "List extended statistics and provide recommendations for multi-column correlations",
        inputSchema: getInlineSchema(ExtendedStatsInputSchema, "ExtendedStatsInput"),
      },
      {
        name: "index_dedup",
        description: "Identify B-tree indexes that can benefit from deduplication (PostgreSQL 13+)",
        inputSchema: getInlineSchema(IndexDedupInputSchema, "IndexDedupInput"),
      },
      {
        name: "generated_columns",
        description: "List generated columns and monitor their dependencies (PostgreSQL 12+)",
        inputSchema: getInlineSchema(GeneratedColumnsInputSchema, "GeneratedColumnsInput"),
      },
      {
        name: "jsonb_analysis",
        description: "Analyze JSONB columns and recommend GIN indexes for better performance",
        inputSchema: getInlineSchema(JSONBAnalysisInputSchema, "JSONBAnalysisInput"),
      },
      {
        name: "parallel_query",
        description: "Monitor parallel query worker usage and performance",
        inputSchema: getInlineSchema(ParallelQueryInputSchema, "ParallelQueryInput"),
      },
      {
        name: "autovacuum_advisor",
        description: "Analyze autovacuum effectiveness and recommend tuning settings",
        inputSchema: getInlineSchema(AutovacuumAdvisorInputSchema, "AutovacuumAdvisorInput"),
      },
      {
        name: "huge_pages",
        description: "Monitor huge pages usage and provide configuration recommendations",
        inputSchema: getInlineSchema(HugePagesInputSchema, "HugePagesInput"),
      },
      {
        name: "statements_enhanced",
        description: "Enhanced pg_stat_statements analysis with parallel workers and WAL tracking",
        inputSchema: getInlineSchema(StatementsEnhancedInputSchema, "StatementsEnhancedInput"),
      },
      {
        name: "foreign_key",
        description: "Monitor foreign key performance and identify missing indexes",
        inputSchema: getInlineSchema(ForeignKeyInputSchema, "ForeignKeyInput"),
      },
      {
        name: "backup_monitor",
        description: "Monitor pg_basebackup progress and PITR recovery timeline",
        inputSchema: getInlineSchema(BackupMonitorInputSchema, "BackupMonitorInput"),
      },
      {
        name: "extensions",
        description: "List installed extensions, check compatibility, and view dependencies",
        inputSchema: getInlineSchema(ExtensionsInputSchema, "ExtensionsInput"),
      },
      {
        name: "connection_pool",
        description: "Monitor HikariCP connection pool metrics, detect connection leaks, and track wait times",
        inputSchema: getInlineSchema(ConnectionPoolInputSchema, "ConnectionPoolInput"),
      },
      {
        name: "jpa_mapping",
        description: "Validate database schema against JPA/Hibernate entity mappings",
        inputSchema: getInlineSchema(JpaMappingInputSchema, "JpaMappingInput"),
      },
      {
        name: "orm_performance",
        description: "Analyze ORM query performance, detect N+1 problems, and identify lazy loading issues",
        inputSchema: getInlineSchema(OrmPerformanceInputSchema, "OrmPerformanceInput"),
      },
      {
        name: "transaction_monitor",
        description: "Monitor active transactions, isolation levels, and detect long-running transactions",
        inputSchema: getInlineSchema(TransactionMonitorInputSchema, "TransactionMonitorInput"),
      },
      {
        name: "prepared_statement",
        description: "Analyze prepared statement cache hit ratio and query patterns",
        inputSchema: getInlineSchema(PreparedStatementInputSchema, "PreparedStatementInput"),
      },
      {
        name: "migration_tracking",
        description: "Track Flyway/Liquibase migrations, detect schema drift, and validate checksums",
        inputSchema: getInlineSchema(MigrationTrackingInputSchema, "MigrationTrackingInput"),
      },
      {
        name: "orm_index_coverage",
        description: "Analyze index coverage for ORM @Query annotations and recommend missing indexes",
        inputSchema: getInlineSchema(OrmIndexCoverageInputSchema, "OrmIndexCoverageInput"),
      },
      {
        name: "jsonb_entity",
        description: "Analyze JSONB columns for @Convert entity attributes and recommend GIN indexes",
        inputSchema: getInlineSchema(JsonbEntityInputSchema, "JsonbEntityInput"),
      },
      {
        name: "batch_operation",
        description: "Monitor JDBC batch operation performance and efficiency",
        inputSchema: getInlineSchema(BatchOperationInputSchema, "BatchOperationInput"),
      },
      {
        name: "sequence_monitor",
        description: "Monitor sequences for JPA @GeneratedValue and detect exhaustion risks",
        inputSchema: getInlineSchema(SequenceMonitorInputSchema, "SequenceMonitorInput"),
      },
      {
        name: "timeseries_partition",
        description: "Recommend partitioning strategies for time-series entity tables",
        inputSchema: getInlineSchema(TimeseriesPartitionInputSchema, "TimeseriesPartitionInput"),
      },
      {
        name: "connection_leak",
        description: "Detect connection leaks and analyze connection acquisition patterns",
        inputSchema: getInlineSchema(ConnectionLeakInputSchema, "ConnectionLeakInput"),
      },
      {
        name: "deadlock_analysis",
        description: "Analyze deadlock patterns and lock wait information",
        inputSchema: getInlineSchema(DeadlockAnalysisInputSchema, "DeadlockAnalysisInput"),
      },
      {
        name: "jpa_schema_validation",
        description: "Validate Spring Data JPA annotations against database schema",
        inputSchema: getInlineSchema(JpaSchemaValidationInputSchema, "JpaSchemaValidationInput"),
      },
      {
        name: "orm_performance_baseline",
        description: "Establish and monitor performance baselines for ORM CRUD operations",
        inputSchema: getInlineSchema(OrmPerformanceBaselineInputSchema, "OrmPerformanceBaselineInput"),
      },
    ],
  };
});

// Helper function to safely validate and execute tools
// biome-ignore lint/suspicious/noExplicitAny: tool results are heterogeneous JSON-serializable objects
function createSafeToolResponse(result: any) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}

function createErrorResponse(error: string, code: string = "VALIDATION_ERROR") {
  return {
    isError: true,
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            error,
            code,
            timestamp: new Date().toISOString(),
          },
          null,
          2,
        ),
      },
    ],
  };
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "query": {
        const validation = validateInput(QueryInputSchema, args);
        if (!validation.success) {
          return createErrorResponse(`Input validation failed: ${validation.error}`);
        }
        const result = await queryTool(validation.data);
        return createSafeToolResponse(result);
      }

      case "describe_table": {
        const validation = validateInput(DescribeTableInputSchema, args);
        if (!validation.success) {
          return createErrorResponse(`Input validation failed: ${validation.error}`);
        }
        const result = await describeTableTool(validation.data);
        return createSafeToolResponse(result);
      }

      case "list_objects": {
        const validation = validateInput(ListObjectsInputSchema, args);
        if (!validation.success) {
          return createErrorResponse(`Input validation failed: ${validation.error}`);
        }
        const result = await listObjectsTool(validation.data);
        return createSafeToolResponse(result);
      }

      case "list_schemas": {
        const validation = validateInput(ListSchemasInputSchema, args);
        if (!validation.success) {
          return createErrorResponse(`Input validation failed: ${validation.error}`);
        }
        const result = await listSchemasTool(validation.data);
        return createSafeToolResponse(result);
      }

      case "list_indexes": {
        const validation = validateInput(ListIndexesInputSchema, args);
        if (!validation.success) {
          return createErrorResponse(`Input validation failed: ${validation.error}`);
        }
        const result = await listIndexesTool(validation.data);
        return createSafeToolResponse(result);
      }

      case "explain_query": {
        const validation = validateInput(ExplainQueryInputSchema, args);
        if (!validation.success) {
          return createErrorResponse(`Input validation failed: ${validation.error}`);
        }
        const result = await explainQueryTool(validation.data);
        return createSafeToolResponse(result);
      }

      case "search_objects": {
        const validation = validateInput(SearchObjectsInputSchema, args);
        if (!validation.success) {
          return createErrorResponse(`Input validation failed: ${validation.error}`);
        }
        const result = await searchObjectsTool(validation.data);
        return createSafeToolResponse(result);
      }

      case "get_connections": {
        const validation = validateInput(GetConnectionsInputSchema, args);
        if (!validation.success) {
          return createErrorResponse(`Input validation failed: ${validation.error}`);
        }
        const result = await getConnectionsTool(validation.data);
        return createSafeToolResponse(result);
      }

      case "diagnose_database": {
        const validation = validateInput(DiagnoseDatabaseInputSchema, args);
        if (!validation.success) {
          return createErrorResponse(`Input validation failed: ${validation.error}`);
        }
        const result = await diagnoseDatabaseTool(validation.data);
        return createSafeToolResponse(result);
      }

      case "get_slow_queries": {
        const validation = validateInput(GetSlowQueriesInputSchema, args);
        if (!validation.success) {
          return createErrorResponse(`Input validation failed: ${validation.error}`);
        }
        const result = await getSlowQueriesTool(validation.data);
        return createSafeToolResponse(result);
      }

      case "list_partitions": {
        const validation = validateInput(ListPartitionsInputSchema, args);
        if (!validation.success) {
          return createErrorResponse(`Input validation failed: ${validation.error}`);
        }
        const result = await listPartitionsTool(validation.data);
        return createSafeToolResponse(result);
      }

      case "replication_status": {
        const validation = validateInput(ReplicationStatusInputSchema, args);
        if (!validation.success) {
          return createErrorResponse(`Input validation failed: ${validation.error}`);
        }
        const result = await replicationStatusTool(validation.data);
        return createSafeToolResponse(result);
      }

      case "progress_report": {
        const validation = validateInput(ProgressReportInputSchema, args);
        if (!validation.success) {
          return createErrorResponse(`Input validation failed: ${validation.error}`);
        }
        const result = await progressReportTool(validation.data);
        return createSafeToolResponse(result);
      }

      case "wal_monitor": {
        const validation = validateInput(WALMonitorInputSchema, args);
        if (!validation.success) {
          return createErrorResponse(`Input validation failed: ${validation.error}`);
        }
        const result = await walMonitorTool(validation.data);
        return createSafeToolResponse(result);
      }

      case "extended_stats": {
        const validation = validateInput(ExtendedStatsInputSchema, args);
        if (!validation.success) {
          return createErrorResponse(`Input validation failed: ${validation.error}`);
        }
        const result = await extendedStatsTool(validation.data);
        return createSafeToolResponse(result);
      }

      case "index_dedup": {
        const validation = validateInput(IndexDedupInputSchema, args);
        if (!validation.success) {
          return createErrorResponse(`Input validation failed: ${validation.error}`);
        }
        const result = await indexDedupTool(validation.data);
        return createSafeToolResponse(result);
      }

      case "generated_columns": {
        const validation = validateInput(GeneratedColumnsInputSchema, args);
        if (!validation.success) {
          return createErrorResponse(`Input validation failed: ${validation.error}`);
        }
        const result = await generatedColumnsTool(validation.data);
        return createSafeToolResponse(result);
      }

      case "jsonb_analysis": {
        const validation = validateInput(JSONBAnalysisInputSchema, args);
        if (!validation.success) {
          return createErrorResponse(`Input validation failed: ${validation.error}`);
        }
        const result = await jsonbAnalysisTool(validation.data);
        return createSafeToolResponse(result);
      }

      case "parallel_query": {
        const validation = validateInput(ParallelQueryInputSchema, args);
        if (!validation.success) {
          return createErrorResponse(`Input validation failed: ${validation.error}`);
        }
        const result = await parallelQueryTool(validation.data);
        return createSafeToolResponse(result);
      }

      case "autovacuum_advisor": {
        const validation = validateInput(AutovacuumAdvisorInputSchema, args);
        if (!validation.success) {
          return createErrorResponse(`Input validation failed: ${validation.error}`);
        }
        const result = await autovacuumAdvisorTool(validation.data);
        return createSafeToolResponse(result);
      }

      case "huge_pages": {
        const validation = validateInput(HugePagesInputSchema, args);
        if (!validation.success) {
          return createErrorResponse(`Input validation failed: ${validation.error}`);
        }
        const result = await hugePagesTool(validation.data);
        return createSafeToolResponse(result);
      }

      case "statements_enhanced": {
        const validation = validateInput(StatementsEnhancedInputSchema, args);
        if (!validation.success) {
          return createErrorResponse(`Input validation failed: ${validation.error}`);
        }
        const result = await statementsEnhancedTool(validation.data);
        return createSafeToolResponse(result);
      }

      case "foreign_key": {
        const validation = validateInput(ForeignKeyInputSchema, args);
        if (!validation.success) {
          return createErrorResponse(`Input validation failed: ${validation.error}`);
        }
        const result = await foreignKeyTool(validation.data);
        return createSafeToolResponse(result);
      }

      case "backup_monitor": {
        const validation = validateInput(BackupMonitorInputSchema, args);
        if (!validation.success) {
          return createErrorResponse(`Input validation failed: ${validation.error}`);
        }
        const result = await backupMonitorTool(validation.data);
        return createSafeToolResponse(result);
      }

      case "extensions": {
        const validation = validateInput(ExtensionsInputSchema, args);
        if (!validation.success) {
          return createErrorResponse(`Input validation failed: ${validation.error}`);
        }
        const result = await extensionsTool(validation.data);
        return createSafeToolResponse(result);
      }

      case "connection_pool": {
        const validation = validateInput(ConnectionPoolInputSchema, args);
        if (!validation.success) {
          return createErrorResponse(`Input validation failed: ${validation.error}`);
        }
        const result = await connectionPoolTool(validation.data);
        return createSafeToolResponse(result);
      }

      case "jpa_mapping": {
        const validation = validateInput(JpaMappingInputSchema, args);
        if (!validation.success) {
          return createErrorResponse(`Input validation failed: ${validation.error}`);
        }
        const result = await jpaMappingTool(validation.data);
        return createSafeToolResponse(result);
      }

      case "orm_performance": {
        const validation = validateInput(OrmPerformanceInputSchema, args);
        if (!validation.success) {
          return createErrorResponse(`Input validation failed: ${validation.error}`);
        }
        const result = await ormPerformanceTool(validation.data);
        return createSafeToolResponse(result);
      }

      case "transaction_monitor": {
        const validation = validateInput(TransactionMonitorInputSchema, args);
        if (!validation.success) {
          return createErrorResponse(`Input validation failed: ${validation.error}`);
        }
        const result = await transactionMonitorTool(validation.data);
        return createSafeToolResponse(result);
      }

      case "prepared_statement": {
        const validation = validateInput(PreparedStatementInputSchema, args);
        if (!validation.success) {
          return createErrorResponse(`Input validation failed: ${validation.error}`);
        }
        const result = await preparedStatementTool(validation.data);
        return createSafeToolResponse(result);
      }

      case "migration_tracking": {
        const validation = validateInput(MigrationTrackingInputSchema, args);
        if (!validation.success) {
          return createErrorResponse(`Input validation failed: ${validation.error}`);
        }
        const result = await migrationTrackingTool(validation.data);
        return createSafeToolResponse(result);
      }

      case "orm_index_coverage": {
        const validation = validateInput(OrmIndexCoverageInputSchema, args);
        if (!validation.success) {
          return createErrorResponse(`Input validation failed: ${validation.error}`);
        }
        const result = await ormIndexCoverageTool(validation.data);
        return createSafeToolResponse(result);
      }

      case "jsonb_entity": {
        const validation = validateInput(JsonbEntityInputSchema, args);
        if (!validation.success) {
          return createErrorResponse(`Input validation failed: ${validation.error}`);
        }
        const result = await jsonbEntityTool(validation.data);
        return createSafeToolResponse(result);
      }

      case "batch_operation": {
        const validation = validateInput(BatchOperationInputSchema, args);
        if (!validation.success) {
          return createErrorResponse(`Input validation failed: ${validation.error}`);
        }
        const result = await batchOperationTool(validation.data);
        return createSafeToolResponse(result);
      }

      case "sequence_monitor": {
        const validation = validateInput(SequenceMonitorInputSchema, args);
        if (!validation.success) {
          return createErrorResponse(`Input validation failed: ${validation.error}`);
        }
        const result = await sequenceMonitorTool(validation.data);
        return createSafeToolResponse(result);
      }

      case "timeseries_partition": {
        const validation = validateInput(TimeseriesPartitionInputSchema, args);
        if (!validation.success) {
          return createErrorResponse(`Input validation failed: ${validation.error}`);
        }
        const result = await timeseriesPartitionTool(validation.data);
        return createSafeToolResponse(result);
      }

      case "connection_leak": {
        const validation = validateInput(ConnectionLeakInputSchema, args);
        if (!validation.success) {
          return createErrorResponse(`Input validation failed: ${validation.error}`);
        }
        const result = await connectionLeakTool(validation.data);
        return createSafeToolResponse(result);
      }

      case "deadlock_analysis": {
        const validation = validateInput(DeadlockAnalysisInputSchema, args);
        if (!validation.success) {
          return createErrorResponse(`Input validation failed: ${validation.error}`);
        }
        const result = await deadlockAnalysisTool(validation.data);
        return createSafeToolResponse(result);
      }

      case "jpa_schema_validation": {
        const validation = validateInput(JpaSchemaValidationInputSchema, args);
        if (!validation.success) {
          return createErrorResponse(`Input validation failed: ${validation.error}`);
        }
        const result = await jpaSchemaValidationTool(validation.data);
        return createSafeToolResponse(result);
      }

      case "orm_performance_baseline": {
        const validation = validateInput(OrmPerformanceBaselineInputSchema, args);
        if (!validation.success) {
          return createErrorResponse(`Input validation failed: ${validation.error}`);
        }
        const result = await ormPerformanceBaselineTool(validation.data);
        return createSafeToolResponse(result);
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const _errorMessage = error instanceof Error ? error.message : "Unknown error";

    return {
      isError: true,
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              error: "Tool execution failed",
              code: "TOOL_EXECUTION_ERROR",
              timestamp: new Date().toISOString(),
              hint: "Check your input parameters and try again",
            },
            null,
            2,
          ),
        },
      ],
    };
  }
});

// Graceful shutdown handler
async function shutdown(signal: string) {
  process.stderr.write(`Received ${signal}, shutting down gracefully...\n`);
  await closeDb();
  process.exit(0);
}

// Register signal handlers for graceful shutdown
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('uncaughtException', (error) => {
  process.stderr.write(`Uncaught exception: ${error.message}\n`);
  process.stderr.write(error.stack || '');
  shutdown('uncaughtException');
});
process.on('unhandledRejection', (reason, promise) => {
  process.stderr.write(`Unhandled rejection at ${String(promise)}\n`);
  process.stderr.write(`Reason: ${String(reason)}\n`);
  shutdown('unhandledRejection');
});

async function main() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    process.stderr.write("Postgres MCP Server running on stdio\n");
  } catch (error) {
    process.stderr.write(`Failed to start server: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}

main().catch((error) => {
  process.stderr.write(`Server error: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
