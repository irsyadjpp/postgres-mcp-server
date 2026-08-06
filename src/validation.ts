import { z } from "zod";

export const QueryInputSchema = z.object({
  sql: z.string().min(1, "SQL query cannot be empty").max(50000, "SQL query too long"),
  parameters: z.array(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
  pageSize: z.number().min(1).max(500).optional(),
  offset: z.number().min(0).optional(),
  database_name: z
    .string()
    .max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Invalid database name format")
    .optional(),
});

export const QueryOutputSchema = z.object({
  rows: z
    .array(z.record(z.string(), z.any()))
    .optional()
    .describe("Query result rows (for SELECT queries)"),
  rowCount: z.number().optional().describe("Number of rows affected/returned"),
  error: z.string().optional().describe("Error message if query failed"),
  code: z.string().optional().describe("Error code for categorized errors"),
  hint: z.string().optional().describe("Helpful hint for resolving errors"),
  pagination: z
    .object({
      hasMore: z.boolean().describe("Whether more rows are available"),
      pageSize: z.number().describe("Actual page size used"),
      offset: z.number().describe("Offset used for this query"),
      totalRows: z.number().optional().describe("Total rows available (if determinable)"),
    })
    .optional()
    .describe("Pagination metadata for SELECT queries"),
});

export const DescribeTableInputSchema = z.object({
  schema: z
    .string()
    .min(1, "Schema name is required")
    .max(63, "Schema name too long")
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Invalid schema name format"),
  table: z
    .string()
    .min(1, "Table name is required")
    .max(63, "Table name too long")
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Invalid table name format"),
  database_name: z
    .string()
    .max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Invalid database name format")
    .optional(),
});

export const ListObjectsInputSchema = z.object({
  type: z.enum(["tables", "views", "functions"]),
  schema: z
    .string()
    .min(1)
    .max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
    .optional(),
  database_name: z
    .string()
    .max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Invalid database name format")
    .optional(),
});

export const ListSchemasInputSchema = z.object({
  includeSystemSchemas: z.boolean().optional(),
  database_name: z
    .string()
    .max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Invalid database name format")
    .optional(),
});

export const ListIndexesInputSchema = z.object({
  schema: z
    .string()
    .min(1, "Schema name is required")
    .max(63, "Schema name too long")
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Invalid schema name format"),
  table: z
    .string()
    .min(1)
    .max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Invalid table name format")
    .optional(),
  database_name: z
    .string()
    .max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Invalid database name format")
    .optional(),
});

export const ExplainQueryInputSchema = z.object({
  sql: z.string().min(1, "SQL query cannot be empty").max(50000, "SQL query too long"),
  analyze: z.boolean().optional(),
  buffers: z.boolean().optional(),
  costs: z.boolean().optional(),
  format: z.enum(["text", "json", "xml", "yaml"]).optional(),
  database_name: z
    .string()
    .max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Invalid database name format")
    .optional(),
});

export const SearchObjectsInputSchema = z.object({
  pattern: z.string().min(1).max(200),
  object_types: z
    .array(z.enum(["table", "view", "column", "function", "index", "constraint"]))
    .optional(),
  schemas: z.array(z.string().min(1).max(63)).optional(),
  limit: z.number().min(1).max(100).optional(),
  database_name: z
    .string()
    .max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Invalid database name format")
    .optional(),
});

export type SearchObjectsInput = z.infer<typeof SearchObjectsInputSchema>;

export const GetConnectionsInputSchema = z.object({
  include_queries: z.boolean().optional(),
  group_by: z.enum(["state", "user", "application", "client"]).optional(),
  database_name: z
    .string()
    .max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Invalid database name format")
    .optional(),
});

export type GetConnectionsInput = z.infer<typeof GetConnectionsInputSchema>;

export const DiagnoseDatabaseInputSchema = z.object({
  include_queries: z.boolean().optional(),
  include_connections: z.boolean().optional(),
  database_name: z
    .string()
    .max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Invalid database name format")
    .optional(),
});

export type DiagnoseDatabaseInput = z.infer<typeof DiagnoseDatabaseInputSchema>;

export const GetSlowQueriesInputSchema = z.object({
  sort_by: z.enum(["total_time", "mean_time", "calls", "rows"]).optional(),
  limit: z.number().min(1).max(50).optional(),
  min_calls: z.number().min(0).optional(),
  min_duration_ms: z.number().min(0).optional(),
  include_query_text: z.boolean().optional(),
  database_name: z
    .string()
    .max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Invalid database name format")
    .optional(),
});

export const ConnectionConfigSchema = z.object({
  host: z.string().min(1),
  port: z.number().min(1).max(65535).optional(),
  user: z.string().min(1),
  password: z.string().min(1),
  database: z.string().min(1),
  ssl: z
    .union([
      z.boolean(),
      z.object({ rejectUnauthorized: z.boolean().optional(), ca: z.string().optional() }),
    ])
    .optional(),
});

export type ConnectionConfig = z.infer<typeof ConnectionConfigSchema>;

export type GetSlowQueriesInput = z.infer<typeof GetSlowQueriesInputSchema>;

export function validateInput<T>(
  schema: z.ZodSchema<T>,
  input: unknown,
): { success: true; data: T } | { success: false; error: string } {
  try {
    const data = schema.parse(input);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0];
      return {
        success: false,
        error: `${firstError.path.join(".")}: ${firstError.message}`,
      };
    }
    return {
      success: false,
      error: "Invalid input format",
    };
  }
}

export type QueryInput = z.infer<typeof QueryInputSchema>;
export type QueryOutput = z.infer<typeof QueryOutputSchema>;
export type DescribeTableInput = z.infer<typeof DescribeTableInputSchema>;
export type ListObjectsInput = z.infer<typeof ListObjectsInputSchema>;
export type ListSchemasInput = z.infer<typeof ListSchemasInputSchema>;
export type ListIndexesInput = z.infer<typeof ListIndexesInputSchema>;
export type ExplainQueryInput = z.infer<typeof ExplainQueryInputSchema>;

// New tool schemas for PostgreSQL 12-18 features

export const ListPartitionsInputSchema = z.object({
  schema: z
    .string()
    .min(1)
    .max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
    .optional(),
  table: z
    .string()
    .min(1)
    .max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
    .optional(),
  database_name: z
    .string()
    .max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
    .optional(),
});

export const ReplicationStatusInputSchema = z.object({
  database_name: z
    .string()
    .max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
    .optional(),
});

export const ProgressReportInputSchema = z.object({
  database_name: z
    .string()
    .max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
    .optional(),
});

export const WALMonitorInputSchema = z.object({
  database_name: z
    .string()
    .max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
    .optional(),
});

export const ExtendedStatsInputSchema = z.object({
  schema: z
    .string()
    .min(1)
    .max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
    .optional(),
  table: z
    .string()
    .min(1)
    .max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
    .optional(),
  database_name: z
    .string()
    .max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
    .optional(),
});

export const IndexDedupInputSchema = z.object({
  schema: z
    .string()
    .min(1)
    .max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
    .optional(),
  table: z
    .string()
    .min(1)
    .max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
    .optional(),
  database_name: z
    .string()
    .max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
    .optional(),
});

export const GeneratedColumnsInputSchema = z.object({
  schema: z
    .string()
    .min(1)
    .max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
    .optional(),
  table: z
    .string()
    .min(1)
    .max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
    .optional(),
  database_name: z
    .string()
    .max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
    .optional(),
});

export const JSONBAnalysisInputSchema = z.object({
  schema: z
    .string()
    .min(1)
    .max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
    .optional(),
  table: z
    .string()
    .min(1)
    .max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
    .optional(),
  database_name: z
    .string()
    .max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
    .optional(),
});

export const ParallelQueryInputSchema = z.object({
  database_name: z
    .string()
    .max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
    .optional(),
});

export const AutovacuumAdvisorInputSchema = z.object({
  schema: z
    .string()
    .min(1)
    .max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
    .optional(),
  table: z
    .string()
    .min(1)
    .max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
    .optional(),
  database_name: z
    .string()
    .max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
    .optional(),
});

export const HugePagesInputSchema = z.object({
  database_name: z
    .string()
    .max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
    .optional(),
});

export const StatementsEnhancedInputSchema = z.object({
  limit: z.number().min(1).max(100).optional(),
  database_name: z
    .string()
    .max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
    .optional(),
});

export const ForeignKeyInputSchema = z.object({
  schema: z
    .string()
    .min(1)
    .max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
    .optional(),
  table: z
    .string()
    .min(1)
    .max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
    .optional(),
  database_name: z
    .string()
    .max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
    .optional(),
});

export const BackupMonitorInputSchema = z.object({
  database_name: z
    .string()
    .max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
    .optional(),
});

export const ExtensionsInputSchema = z.object({
  database_name: z
    .string()
    .max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
    .optional(),
});

// Type exports for new tools
export type ListPartitionsInput = z.infer<typeof ListPartitionsInputSchema>;
export type ReplicationStatusInput = z.infer<typeof ReplicationStatusInputSchema>;
export type ProgressReportInput = z.infer<typeof ProgressReportInputSchema>;
export type WALMonitorInput = z.infer<typeof WALMonitorInputSchema>;
export type ExtendedStatsInput = z.infer<typeof ExtendedStatsInputSchema>;
export type IndexDedupInput = z.infer<typeof IndexDedupInputSchema>;
export type GeneratedColumnsInput = z.infer<typeof GeneratedColumnsInputSchema>;
export type JSONBAnalysisInput = z.infer<typeof JSONBAnalysisInputSchema>;
export type ParallelQueryInput = z.infer<typeof ParallelQueryInputSchema>;
export type AutovacuumAdvisorInput = z.infer<typeof AutovacuumAdvisorInputSchema>;
export type HugePagesInput = z.infer<typeof HugePagesInputSchema>;
export type StatementsEnhancedInput = z.infer<typeof StatementsEnhancedInputSchema>;
export type ForeignKeyInput = z.infer<typeof ForeignKeyInputSchema>;
export type BackupMonitorInput = z.infer<typeof BackupMonitorInputSchema>;
export type ExtensionsInput = z.infer<typeof ExtensionsInputSchema>;

// Java Backend Tools Schemas

export const ConnectionPoolInputSchema = z.object({
  database_name: z
    .string()
    .max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
    .optional(),
});

export const JpaMappingInputSchema = z.object({
  schema: z
    .string()
    .min(1)
    .max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
    .optional(),
  database_name: z
    .string()
    .max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
    .optional(),
});

export const OrmPerformanceInputSchema = z.object({
  database_name: z
    .string()
    .max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
    .optional(),
});

export const TransactionMonitorInputSchema = z.object({
  database_name: z
    .string()
    .max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
    .optional(),
});

export const PreparedStatementInputSchema = z.object({
  database_name: z
    .string()
    .max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
    .optional(),
});

export const MigrationTrackingInputSchema = z.object({
  database_name: z
    .string()
    .max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
    .optional(),
});

export const OrmIndexCoverageInputSchema = z.object({
  schema: z
    .string()
    .min(1)
    .max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
    .optional(),
  database_name: z
    .string()
    .max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
    .optional(),
});

export const JsonbEntityInputSchema = z.object({
  schema: z
    .string()
    .min(1)
    .max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
    .optional(),
  database_name: z
    .string()
    .max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
    .optional(),
});

export const BatchOperationInputSchema = z.object({
  database_name: z
    .string()
    .max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
    .optional(),
});

export const SequenceMonitorInputSchema = z.object({
  schema: z
    .string()
    .min(1)
    .max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
    .optional(),
  database_name: z
    .string()
    .max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
    .optional(),
});

export const TimeseriesPartitionInputSchema = z.object({
  schema: z
    .string()
    .min(1)
    .max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
    .optional(),
  database_name: z
    .string()
    .max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
    .optional(),
});

export const ConnectionLeakInputSchema = z.object({
  database_name: z
    .string()
    .max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
    .optional(),
});

export const DeadlockAnalysisInputSchema = z.object({
  database_name: z
    .string()
    .max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
    .optional(),
});

export const JpaSchemaValidationInputSchema = z.object({
  schema: z
    .string()
    .min(1)
    .max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
    .optional(),
  database_name: z
    .string()
    .max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
    .optional(),
});

export const OrmPerformanceBaselineInputSchema = z.object({
  database_name: z
    .string()
    .max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
    .optional(),
});

// Type exports for Java backend tools
export type ConnectionPoolInput = z.infer<typeof ConnectionPoolInputSchema>;
export type JpaMappingInput = z.infer<typeof JpaMappingInputSchema>;
export type OrmPerformanceInput = z.infer<typeof OrmPerformanceInputSchema>;
export type TransactionMonitorInput = z.infer<typeof TransactionMonitorInputSchema>;
export type PreparedStatementInput = z.infer<typeof PreparedStatementInputSchema>;
export type MigrationTrackingInput = z.infer<typeof MigrationTrackingInputSchema>;
export type OrmIndexCoverageInput = z.infer<typeof OrmIndexCoverageInputSchema>;
export type JsonbEntityInput = z.infer<typeof JsonbEntityInputSchema>;
export type BatchOperationInput = z.infer<typeof BatchOperationInputSchema>;
export type SequenceMonitorInput = z.infer<typeof SequenceMonitorInputSchema>;
export type TimeseriesPartitionInput = z.infer<typeof TimeseriesPartitionInputSchema>;
export type ConnectionLeakInput = z.infer<typeof ConnectionLeakInputSchema>;
export type DeadlockAnalysisInput = z.infer<typeof DeadlockAnalysisInputSchema>;
export type JpaSchemaValidationInput = z.infer<typeof JpaSchemaValidationInputSchema>;
export type OrmPerformanceBaselineInput = z.infer<typeof OrmPerformanceBaselineInputSchema>;
