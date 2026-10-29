# Non-Functional Requirements — HandmadeFinance V1

> Design status: APPROVED V1 BASELINE
> Implementation status: TARGET; verification is PLANNED unless evidence says otherwise

These targets are a realistic V1 baseline for a small-to-medium business system, not a production SLA. A requirement is not complete merely because the implementation exists; its verification method must pass under the documented reference workload.

| ID | Statement | Rationale | Measurement | Verification method | Status |
|---|---|---|---|---|---|
| NFR-PERF-001 | Standard paginated read APIs shall have P95 latency <= 500 ms. | Keeps routine ledger work responsive. | Server latency under the reference workload, excluding client/network time. | `PERF-CRUD-001` load test. | APPROVED / PLANNED |
| NFR-PERF-002 | Standard create/update/soft-delete APIs shall have P95 latency <= 800 ms. | Preserves interactive data entry. | Server latency including database commit and audit write. | `PERF-CRUD-002` load test. | APPROVED / PLANNED |
| NFR-PERF-003 | Dashboard and report JSON queries shall have P95 latency <= 2 s. | Aggregation is heavier but remains interactive. | Server latency for supported filters. | `PERF-REPORT-001` load test. | APPROVED / PLANNED |
| NFR-PERF-004 | PDF/XLSX export shall complete within 5 s for a supported dataset/filter result. | Bounds synchronous downloads. | End-to-end server generation time. | `PERF-EXPORT-001`. | APPROVED / PLANNED |
| NFR-CAP-001 | The target dataset shall support at least 100,000 active and soft-deleted income/expense records combined. | Covers V1 growth. | Seeded database size. | `PERF-CAP-001`. | APPROVED / PLANNED |
| NFR-CAP-002 | The application shall support at least 50 concurrent active users while meeting NFR-PERF-001–003. | Establishes a concurrency baseline. | 50 virtual users with a representative read/write mix. | `PERF-CONC-001`. | APPROVED / PLANNED |
| NFR-IMPORT-001 | An import file shall be at most 10 MB and contain at most 5,000 data rows. | Bounds synchronous resource use. | File bytes and parsed rows before commit. | `INT-IMPORT-001`, `SEC-FILE-001`. | APPROVED / PLANNED |
| NFR-IMPORT-002 | Import shall be synchronous and atomic: invalid input commits zero ledger rows; success represents the final result. | Avoids partial data and unnecessary job infrastructure. | Transaction state and response summary. | `INT-IMPORT-002`, `CONTRACT-API-IMPORT-001`. | APPROVED / PLANNED |
| NFR-SEC-001 | JWT access tokens shall expire 30 minutes after issue; V1 has no refresh token or server-side blacklist. Logout removes client state and the token expires naturally. | Limits exposure with a simple V1 design. | `exp - iat = 30 minutes`; no revocation store. | `INT-AUTH-001`, `SEC-JWT-001`. | APPROVED / PLANNED |
| NFR-SEC-002 | New passwords shall contain at least 8 characters. | Provides an enforceable minimum. | Validation boundary tests. | `UNIT-APP-AUTH-001`, `INT-AUTH-002`. | APPROVED / PLANNED |
| NFR-SEC-003 | Login shall allow no more than 5 failed attempts per 15 minutes per account, with equivalent IP-level protection. | Reduces brute-force risk without permanent locking. | Rate-limit counters and `429`. | `SEC-AUTH-001`. | APPROVED / PLANNED |
| NFR-SEC-004 | Authorization and ownership checks shall be server-side; every protected OpenAPI operation shall declare Bearer security. | The browser is not a security boundary. | Endpoint/policy coverage and contract inspection. | `INT-RBAC-*`, `ARCH-009`. | APPROVED / PLANNED |
| NFR-SEC-005 | Passwords, hashes, JWTs, signing keys, secrets, and raw file contents shall never appear in logs or audit snapshots. | Prevents sensitive-data leakage. | Sanitized log/audit samples. | `SEC-LOG-001`, `SEC-AUDIT-001`. | APPROVED / PLANNED |
| NFR-MAINT-001 | Critical Application/business-rule unit coverage shall be >= 80%; critical authorization/policy coverage shall be >= 90%. | Focuses coverage on high-risk logic. | Line and branch coverage by named namespace. | CI coverage report. | APPROVED / PLANNED |
| NFR-MAINT-002 | Build, lint, architecture tests, OpenAPI validation, and configured static analysis shall pass with no errors. | Detects drift early. | CI exit status. | `ARCH-*`, `CONTRACT-API-*`. | APPROVED / PLANNED |
| NFR-REL-001 | Target availability shall be 99.5% monthly, excluding planned maintenance. | V1 operational baseline, not a contractual SLA. | Successful service minutes / eligible minutes. | `OPS-AVAIL-001`. | BASELINE / PLANNED |
| NFR-BCP-001 | PostgreSQL shall be backed up daily, retained 30 days, with RPO <= 24 h and RTO <= 4 h. | Bounds data loss and recovery time. | Backup timestamps and timed restore. | `OPS-RESTORE-001`. | BASELINE / PLANNED |
| NFR-OBS-001 | The API shall emit structured logs with correlation/trace ID and expose health endpoints, excluding NFR-SEC-005 data. | Enables safe diagnosis. | Log schema and health checks. | `INT-OBS-001`, `SEC-LOG-001`. | APPROVED / PLANNED |
| NFR-ACC-001 | Inputs shall have visible labels; status shall not rely on color alone; keyboard and focus behavior shall be checked against applicable WCAG 2.1 AA criteria. | Makes accessibility testable. | Accessibility audit. | `A11Y-001`. | BASELINE / PLANNED |

## Reference workload

- PostgreSQL contains at least 100,000 combined records with representative categories, dates, sources, and soft-deleted rows.
- Tests use 50 concurrent active users and a documented workload; warm-up, duration, environment, and raw results are retained.
- Import/export targets apply within the supported limits. Larger import inputs are rejected rather than queued.

## Retention still requiring operational policy

Log retention, audit-record retention, and file-storage backup topology depend on the production platform. They remain open deployment policies; the security and database recovery baselines above do not.
