# Business Rules — HandmadeFinance V1

> Design status: TARGET V1  
> Implementation status: PARTIAL — executable baseline exists; production-adapter verification remains

Only rules confirmed by project documentation are catalogued here. Deployment choices outside V1 are recorded separately and do not weaken these rules.

## BR-001 — Roles

- **Source:** `03-use-cases.md`, `08-invest-requirements.md`
- **Related US:** US01–US17
- **Related API:** all protected operations
- **Rule:** The only V1 roles are `ADMIN`, `SHOP_OWNER`, `EMPLOYEE`, and `VIEWER`. Backend authorization is authoritative.

## BR-002 — Employee ownership

- **Source:** AC-UC06, AC-UC10
- **Related US:** US06, US10
- **Related API:** `updateIncome`, `updateExpense`, attachment mutations
- **Rule:** An Employee may update only a transaction they created. Employees cannot soft-delete transactions.

## BR-003 — Soft deletion

- **Source:** AC-UC07, AC-UC11
- **Related US:** US07, US11
- **Related API:** `softDeleteIncome`, `softDeleteExpense`
- **Rule:** Income and expense deletion sets deletion metadata and retains the row. Deleted transactions are excluded from active lists, dashboard aggregates, and reports.

## BR-004 — Canonical currency

- **Source:** `01-scope.md`, AC-UC03, AC-UC13
- **Related US:** US03–US14
- **Related API:** dashboard, income, expense, and report operations
- **Rule:** Monetary values are persisted and returned in USD. EUR is presentation-only conversion.

## BR-005 — Positive transaction amounts

- **Source:** AC-UC05, AC-UC09, `shop_finance.sql`
- **Related US:** US05, US09
- **Related API:** `createIncome`, `updateIncome`, `createExpense`, `updateExpense`
- **Rule:** Transaction amounts must satisfy the validation and database constraints in the approved contract; primary income/expense amounts are positive.

## BR-006 — Active categories

- **Source:** OpenAPI category descriptions and acceptance criteria
- **Related US:** US04, US05, US08, US09, US12
- **Related API:** `listIncomeCategories`, `listExpenseCategories`
- **Rule:** Category lookups expose active categories and transaction writes must reference the appropriate category type.

## BR-007 — Import preview

- **Source:** AC-UC12
- **Related US:** US12
- **Related API:** `previewImport`
- **Rule:** Preview validates/parses the workbook and returns row results without inserting income or expense records.

## BR-008 — Import atomicity

- **Source:** AC-UC12, `docs/api/README.md`
- **Related US:** US12
- **Related API:** `createImport`
- **Rule:** If any row is invalid, the batch inserts zero income/expense records. A valid batch commits all imported records.
- **Execution:** synchronous within 10 MB/5,000 rows; the response is the final import summary.

## BR-009 — Report authorization

- **Source:** AC-UC13–14
- **Related US:** US13, US14
- **Related API:** `getReport`, `exportReport`
- **Rule:** Reports and exports are available to Administrator, Shop Owner, and Viewer, but not Employee. Export must represent the same approved filter set as the visible report.
- **Contract:** export reuses the same approved filters and totals as `getReport`.

## BR-010 — User administration

- **Source:** AC-UC16
- **Related US:** US16
- **Related API:** user operations
- **Rule:** Only Administrator may manage users. Passwords and password hashes are never returned.

## BR-011 — Personal profile

- **Source:** AC-UC17
- **Related US:** US17
- **Related API:** profile operations
- **Rule:** Users may update only approved self-service fields and cannot change their own role or active status. Password change requires the current password.

## BR-012 — Sensitive audit data

- **Source:** security and logging constraints
- **Related US:** cross-cutting
- **Related API:** all audited mutations
- **Rule:** Passwords, password hashes, tokens, signing keys, secrets, and raw sensitive file content must not be stored in logs or audit payloads.

## BR-013 — Logout token semantics

- **Source:** US02 and `POST /auth/logout`
- **Related US:** US02
- **Related API:** `logout`
- **Status:** ACCEPTED
- **Rule:** access tokens expire after 30 minutes. Logout removes token/private session state on the client; V1 has no refresh token or server-side revocation store.

## BR-014 — Audit action taxonomy

- **Source:** soft-delete rules and database audit design
- **Related US:** US07, US11
- **Related API:** `softDeleteIncome`, `softDeleteExpense`
- **Status:** ACCEPTED
- **Rule:** business actions are `CREATE`, `UPDATE`, `SOFT_DELETE`, and `RESTORE`. Technical trigger verbs must be mapped to these actions. Each record contains actor, entity type/id, timestamp, redacted before/after, and correlation ID when available.
