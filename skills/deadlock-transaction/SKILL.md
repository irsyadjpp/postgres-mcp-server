---
name: deadlock-transaction
description: Analyze and resolve deadlock patterns, lock contention, and transaction management issues. Use when investigating stuck queries, lock timeouts, deadlock errors, or transaction isolation problems.
---

Workflow:
1. Run deadlock_analysis to check for deadlock risks and lock wait information
2. Run transaction_monitor to see active transactions, isolation levels, and long-running transactions
3. Run connection_leak to detect connection leaks that may hold locks
4. Run connection_pool to check for connection pool exhaustion
5. Run get_connections to see all connections and their states

Key recommendations:
- Set appropriate lock_timeout: SET lock_timeout = 5000 (5 seconds)
- Use consistent table access order across transactions
- Keep transactions short and minimize lock hold time
- Use SELECT ... FOR UPDATE SKIP LOCKED to avoid blocking
- Consider READ COMMITTED instead of SERIALIZABLE when possible
- Set @Transactional(timeout) values in Spring Boot
- Use REQUIRES_NEW propagation for independent transactions
- Monitor lock_timeout setting to prevent indefinite waits