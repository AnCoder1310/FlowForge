# 8. Cross-cutting Concepts

Step 7 choices are recorded in [Architecture Decisions](09-architecture-decisions.md); production platform choices remain replaceable behind abstractions.

## 8.1 Authentication

Users log in with email/password and the account must have `is_active`. The API returns a short-lived Bearer JWT with user ID and role; V1 has no refresh token. Logout deletes the client token, which otherwise expires naturally. Audit action: `LOGIN`. Never return `password_hash`.

## 8.2 Authorization

React: hide button / menu / disable. **Security:** Identity & Access protects every write API and sensitive read APIs (reports, audit, users).

Own-record rule: EMPLOYEE can update only when `created_by` matches. Delete: EMPLOYEE always receives 403.

## 8.3 Validation

Backend validates required fields, `amount > 0`, `tax_percent` between 0–100, category existence, and configured file type/signature/size limits. Import limits are at most 10 MB and 5,000 rows; deployment may lower but not raise these without an architecture/NFR review. Frontend validation improves user experience but does not replace backend validation.

## 8.4 Error Handling

| Situation | Handling |
| --------- | -------- |
| Unauthenticated | 401 |
| Forbidden | 403 |
| Validation | 400 + safe message |
| Not found / already soft-deleted | 404 |
| Import error | Batch `FAILED`, `error_details` JSONB |

The exact RFC 7807-compatible error shapes are `ProblemDetails` and `ValidationProblemDetails` in the OpenAPI contract.

## 8.5 Logging vs Audit

Operational logs use ASP.NET Core `ILogger` with trace/request ID and safe technical context. Business audit uses `audit_logs` (actor, action, module, detail, table name, record ID, timestamps, IP, request ID). The production log sink is deployment-specific.

Never log: password, hash, session secret, token.

## 8.6 Database Transactions

Creating income + attachment and confirming synchronous import (multiple rows + batch) run in **one transaction** through Persistence. Audit triggers run in the same transaction; persistence maps technical DML to the business taxonomy `CREATE`, `UPDATE`, `SOFT_DELETE`, `RESTORE`.

## 8.7 Soft Delete

`deleted_at` (+ `deleted_by` on incomes/expenses). Active rows satisfy `deleted_at IS NULL`. User/category tables also have `deleted_at` in the schema.

Audit minimum: actor user ID, action, entity type/id, timestamp, redacted before/after, and correlation ID when available. Passwords, hashes, tokens, keys, secrets, and raw file contents are excluded.

## 8.8 Currency

Canonical **USD**. `CHECK (currency_code = 'USD')`. EUR = Presentation Conversion. Do not maintain two lists. Exchange-rate source: **To Be Determined**.

## 8.9 Time / Timezone

Postgres Docker and new users default to `Asia/Ho_Chi_Minh`. Timestamp columns use `timestamptz`; the API exchanges ISO 8601 instants and React displays them in the authenticated user's timezone.

## 8.10 Security

HTTPS is mandatory outside local development. Frontend does not issue SQL. `PasswordHasher<AppUser>` writes only `password_hash`. CORS uses an explicit configured frontend origin; wildcard origins are not allowed with authorization headers.

## 8.11 File Handling

`attachments.storage_path` and `import_batches.stored_file_path` contain opaque storage keys. Binary data is not stored in PostgreSQL. `IFileStorage` uses a directory outside the web root locally and can be replaced in production.

## 8.12 Data Integrity

Category FKs, CHECK between import source and batch, exactly one attachment owner, unique email/username when `deleted_at IS NULL`, report views over active records.
