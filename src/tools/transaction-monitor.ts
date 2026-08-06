import { sql } from "kysely";
import { getDb } from "../db.js";
import { TransactionMonitorInputSchema, validateInput } from "../validation.js";

const _isolationLevels = [
  "Read Uncommitted",
  "Read Committed",
  "Repeatable Read",
  "Serializable",
] as const;

export interface ActiveTransaction {
  pid: number;
  database: string;
  user: string;
  application_name: string;
  state: string;
  isolation_level: string;
  backend_start: string;
  xact_start: string | null;
  duration_ms: number;
  query: string | null;
  is_long_running: boolean;
}

export interface DeadlockInfo {
  timestamp: string;
  pid: number;
  query: string;
  blocking_pid: number | null;
  blocking_query: string | null;
}

export interface TransactionMonitorOutput {
  active_transactions?: ActiveTransaction[];
  deadlocks?: DeadlockInfo[];
  isolation_level_stats?: Record<string, number>;
  recommendations?: string[];
  error?: string;
  timestamp?: string;
}

export async function transactionMonitorTool(input: unknown): Promise<TransactionMonitorOutput> {
  try {
    const validation = validateInput(TransactionMonitorInputSchema, input);
    if (!validation.success) {
      return { error: `Input validation failed: ${validation.error}` };
    }

    const { database_name } = validation.data;
    const db = getDb(database_name);

    const activeTxQuery = sql<ActiveTransaction>`
      SELECT
        pid,
        datname as database,
        usename as user,
        application_name,
        state,
        CASE
          WHEN state = 'idle in transaction' THEN 'Read Committed'
          ELSE current_setting('transaction_isolation')
        END as isolation_level,
        backend_start::text,
        xact_start::text,
        ROUND(EXTRACT(EPOCH FROM (NOW() - COALESCE(xact_start, backend_start))) * 1000) as duration_ms,
        LEFT(query, 200) as query,
        CASE
          WHEN EXTRACT(EPOCH FROM (NOW() - COALESCE(xact_start, backend_start))) > 30000 THEN true
          ELSE false
        END as is_long_running
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND state IN ('active', 'idle in transaction')
      ORDER BY COALESCE(xact_start, backend_start) DESC
      LIMIT 50
    `.execute(db);

    const deadlockQuery = sql<DeadlockInfo>`
      SELECT
        NOW()::text as timestamp,
        0 as pid,
        '' as query,
        0 as blocking_pid,
        '' as blocking_query
      LIMIT 0
    `.execute(db);

    const isolationQuery = sql<{ isolation_level: string; count: number }>`
      SELECT
        CASE
          WHEN state = 'idle in transaction' THEN 'Read Committed'
          ELSE current_setting('transaction_isolation')
        END as isolation_level,
        COUNT(*) as count
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND state IN ('active', 'idle in transaction')
      GROUP BY isolation_level
    `.execute(db);

    const [activeResult, isolationResult, deadlockResult] = await Promise.all([
      activeTxQuery,
      isolationQuery,
      deadlockQuery,
    ]);

    const recommendations: string[] = [];
    const activeTxs = activeResult.rows;
    const isolationStats = isolationResult.rows;

    const longRunning = activeTxs.filter((tx) => tx.is_long_running);
    if (longRunning.length > 0) {
      recommendations.push(
        `${longRunning.length} long-running transactions detected (> 30 seconds) - review @Transactional timeout settings`,
      );
    }

    const idleInTx = activeTxs.filter((tx) => tx.state === "idle in transaction");
    if (idleInTx.length > 0) {
      recommendations.push(
        `${idleInTx.length} connections idle in transaction - potential resource leak, ensure proper transaction management`,
      );
    }

    const serializableCount = isolationStats.find((s) => s.isolation_level === "Serializable");
    if (serializableCount && serializableCount.count > 0) {
      recommendations.push(
        `${serializableCount.count} transactions using Serializable isolation - consider lower isolation levels for better performance`,
      );
    }

    recommendations.push("Set appropriate @Transactional(timeout) values in Spring Boot");
    recommendations.push(
      "Use @Transactional(propagation = Propagation.REQUIRES_NEW) for independent transactions",
    );
    recommendations.push("Monitor lock_timeout setting to prevent indefinite waits");

    const isolationLevelMap: Record<string, number> = {};
    isolationStats.forEach((stat) => {
      isolationLevelMap[stat.isolation_level] = stat.count;
    });

    return {
      active_transactions: activeTxs,
      deadlocks: deadlockResult.rows,
      isolation_level_stats: isolationLevelMap,
      recommendations,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
