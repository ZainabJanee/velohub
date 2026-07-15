# Security Policy

VeloHub Orchestrator takes financial transactions and payment safety seriously.

## 1. Reporting Vulnerabilities
If you identify a security vulnerability (such as double-spending, balance overflows, or auth bypasses), please **do not** open a public issue. Email us privately at security@velohub.org. We will respond within 48 hours.

## 2. Implemented Protections
- **Idempotency Locks:** Redis-backed `idempotency-key` middleware blocks simultaneous mutations.
- **Race Condition Mitigations:** Database balances updates are isolated within Postgres transactions.
- **Audit Logging:** Every balance change, withdrawal, top-up, and escrow lock is audited.
