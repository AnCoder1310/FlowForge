# Step 7 Readiness — API Implementation and Unit Tests

> Design status: READY AS TARGET SPECIFICATION
>
> Implementation status: BASELINE IMPLEMENTED; production adapters and frontend integration remain in progress

Steps 1–6 define the target behavior and architecture. An executable three-project backend baseline now exists. On 2026-09-18, 250 automated tests passed (165 Application, 22 Infrastructure, 63 API). PostgreSQL-backed ledger repositories exist, while import history, attachments, and audit operations still use process memory and require production adapters. See [Project Progress](../README.md#project-progress) for the remaining increments.

## Sources of truth

Use this precedence when documents appear ambiguous:

1. Accepted ADRs.
2. Explicit business requirements and acceptance criteria.
3. Approved target architecture.
4. OpenAPI and database contracts.
5. C4, UML, sequence, folder, and supporting documents.

If implementation exposes a conflict between sources, update the design and OpenAPI together before coding around it.

## Implementation increments

| Increment | Scope | Exit condition |
|---|---|---|
| I1 Foundation | Solution/projects, configuration, DI, exception middleware, Problem Details, PostgreSQL context | Application has no Infrastructure reference; API starts and health/configuration failures are explicit |
| I2 Identity | Login/logout, JWT, password hashing, actor context, authorization policies | UC01–02 and role-policy tests pass |
| I3 Ledger reads | Categories, income/expense list and detail, paging/filtering | Active-record and filter tests pass against PostgreSQL |
| I4 Ledger writes | Create/update/soft-delete, ownership, audit actor context | UC05–11 service and trigger integration tests pass |
| I5 Dashboard/reporting | Dashboard, report query, PDF/XLSX exporters | Aggregates reconcile with seeded active transactions |
| I6 Imports/files | Preview, synchronous atomic import, history, attachments, local storage | Inputs above 10 MB/5,000 rows are rejected; invalid import inserts zero transactions; final summary and cleanup paths pass |
| I7 Administration | Audit list, users, profile/password | Admin/self-service authorization and conflict tests pass |
| I8 Frontend integration | Replace mock services feature-by-feature | UI consumes OpenAPI responses and preserves documented states |

## Required Application unit-test matrix

| Module | Minimum cases |
|---|---|
| Authentication | valid login; unknown email; wrong password; inactive/deleted user; safe response; login audit |
| Dashboard | valid range; invalid range; empty data; deleted rows excluded; totals and recent limit |
| Categories | income/expense separation; active only; stable name order |
| Income | create roles; Viewer forbidden; validation; Employee owns update; non-owner forbidden; admin/owner update; delete roles; missing/deleted |
| Expense | same authorization matrix; origin/payment/tax validation; derived amount consistency |
| Reports | allowed/forbidden roles; filters; category type; active-only totals; exporter selection; export audit |
| Imports | file guards; header/row mapping; category validation; preview has no writes; atomic success; atomic rollback; failed-batch errors |
| Attachments | owner policy; file guards; metadata success; stored-file compensation; delete cleanup |
| Audit | Admin/Owner allowed; others forbidden; filters and paging; no mutation path |
| Users | Admin-only; create hashing; duplicate username/email; update; enable/disable; password never mapped |
| Profile | self lookup; allowed-field mapping; role/status ignored or rejected; wrong current password; successful rehash |

## Integration tests

- OpenAPI authorization expectations are tested per operation with unauthenticated, forbidden, and allowed actors.
- PostgreSQL tests verify enum mappings, check/foreign-key constraints, active-only views, soft deletion, audit triggers, and `SET LOCAL app.current_user_id`.
- File tests use an isolated temporary storage root and verify path traversal cannot escape it.
- Import tests use representative `.xls` and `.xlsx` fixtures and verify a failing row commits zero transaction rows.
- API errors validate media type, status, field errors, and trace ID against OpenAPI.

## Definition of Done for each endpoint

- Controller operation and DTO match OpenAPI without undocumented fields.
- Application service contains validation and authorization; Controller contains no business logic or SQL.
- Repository uses parameterized EF Core/Npgsql access and honors cancellation.
- Successful and failure paths have automated tests.
- Logs contain trace ID but no password, token, hash, raw file contents, or sensitive stack trace.
- The endpoint is exercised from Swagger UI or an equivalent OpenAPI client.

## Step 1–6 completion index

| Step | Completed design artifacts |
|---|---|
| 1 | Scope, feature catalog, UC01–17, INVEST backlog, complete acceptance criteria |
| 2 | Information architecture, screen hierarchy, task flow, UI states, accessibility/responsive rules, role screenshots |
| 3 | C4 System Context, Container, and Component diagrams |
| 4 | PostgreSQL SQL/DBML/ERD and validated OpenAPI 3.0.4 contract |
| 5 | Full React feature structure and three-tier backend/test structure |
| 6 | Core and remaining class diagrams, runtime sequences, and operation traceability |

## Finalized V1 architecture decisions

- Logout: client-side discard; 30-minute JWT; no refresh token or server-side revocation.
- Import: synchronous, atomic, maximum 10 MB/5,000 rows; `200` final summary.
- Report/export: identical approved filter set and totals.
- Soft-delete audit: business actions `CREATE`, `UPDATE`, `SOFT_DELETE`, `RESTORE` with redacted snapshots.
- Import validation: Import orchestration reuses the authoritative Application ledger validators/business rules.
- Architecture: Simplified Clean Architecture / 3-project variant; no speculative Domain project.

Production platform, exchange-rate provider, log/audit retention, and file-backup topology remain operational decisions. Master coverage is in `docs/traceability/master-traceability.md`. Existing tests are executable evidence only for the behavior they assert; planned test IDs are not automatically satisfied by the aggregate passing count.
