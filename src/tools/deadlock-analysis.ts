import { sql } from "kysely";
import { getDb } from "../db.js";
import { DeadlockAnalysisInputSchema, validateInput } from "../validation.js";

export interface DeadlockEvent {
  timestamp: string;
  pid: number;
  query: string;
  blocking_pid: number;
  blocking_query: string;
  lock_type: string;
  relation: string;
  deadlock_type: string;
}

export interface LockWaitInfo {
  pid: number;
  application_name: string;
  state: string;
  wait_event: string;
  wait_event_type: string;
  blocking_pid: number | null;
  relation: string | null;
  wait_duration_ms: number;
  is_deadlock_risk: boolean;
}

export interface DeadlockAnalysisOutput {
  deadlock_events?: DeadlockEvent[];
  lock_waits?: LockWaitInfo[];
  recommendations?: string[];
  error?: string;
  timestamp?: string;
}

export async function deadlockAnalysisTool(input: unknown): Promise<DeadlockAnalysisOutput> {
  try {
    const validation = validateInput(DeadlockAnalysisInputSchema, input);
    if (!validation.success) {
      return { error: `Input validation failed: ${validation.error}` };
    }

    const { database_name } = validation.data;
    const db = getDb(database_name);

    const deadlockQuery = sql<DeadlockEvent>`
      SELECT
        NOW()::text as timestamp,
        0 as pid,
        '' as query,
        0 as blocking_pid,
        '' as blocking_query,
        '' as lock_type,
        '' as relation,
        '' as deadlock_type
      LIMIT 0
    `.execute(db);

    const lockWaitQuery = sql<LockWaitInfo>`
      SELECT
        pid,
        application_name,
        state,
        wait_event,
        wait_event_type,
        NULL::int as blocking_pid,
        NULL::text as relation,
        0 as wait_duration_ms,
        CASE
          WHEN wait_event_type = 'Lock' AND state = 'active' THEN true
          ELSE false
        END as is_deadlock_risk
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND wait_event_type = 'Lock'
      ORDER BY wait_event
      LIMIT 50
    `.execute(db);

    const recommendations: string[] = [];
    const deadlocks = deadlockQuery.rows;
    const lockWaits = lockWaitQuery.rows;

    const deadlockRisk = lockWaits.filter((l) => l.is_deadlock_risk);
    if (deadlockRisk.length > 0) {
      recommendations.push(
        `${deadlockRisk.length} connections with deadlock risk - review transaction ordering`
      );
    }

    recommendations.push(
      'Set appropriate lock_timeout: SET lock_timeout = 5000 (5 seconds)'
    );
    recommendations.push(
      'Use consistent table access order across transactions'
    );
    recommendations.push(
      'Keep transactions short and minimize lock hold time'
    );
    recommendations.push(
      'Use SELECT ... FOR UPDATE SKIP LOCKED to avoid blocking'
    );
    recommendations.push(
      'Consider READ COMMITTED isolation level instead of SERIALIZABLE when possible'
    );
    recommendations.push(
      'Review @Transactional isolation level settings in Spring Boot'
    );
    recommendations.push(
      'Monitor pg_locks and pg_stat_activity for lock contention'
    );
    recommendations.push(
      'Enable log_lock_waits in PostgreSQL to log long lock waits'
    );

    return {
      deadlock_events: deadlocks,
      lock_waits: lockWaits,
      recommendations,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
