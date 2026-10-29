# 2. Architecture Constraints

Only constraints grounded in the repository or architecture baseline (Sections 4 and 9) are included. Do not invent deadlines, budget, or team size.

## 2.1 Technical Constraints

| Constraint | Source | Type |
| ---------- | ------ | ---- |
| Web Frontend = **React.js** | Architecture baseline, ADR-001 | DECISION |
| Backend = **.NET (C#)**, Modular Monolith | Architecture baseline, ADR-002, ADR-003 | DECISION |
| API = **REST**, **HTTPS**, **JSON** | ADR-005 | DECISION |
| Database = **PostgreSQL** | `src/database/shop_finance.sql`, docker-compose | FACT + DECISION |
| Schema name `shop_finance`; local database name `handmade_finance` | SQL, `.env.example` | FACT |
| Only .NET Backend may issue SQL to PostgreSQL | Baseline, ADR-004 | DECISION |
| Persistence / Data Access is the only SQL layer | Building Block View | DECISION |
| Local Postgres: image `postgres:16`, host port **5433**, timezone `Asia/Ho_Chi_Minh` | `docker-compose.yml` | FACT |
| In V1, `currency_code` is only `USD` (table CHECK constraint) | SQL | FACT |
| API style = ASP.NET Core attribute Controllers | ADR-002 | DECISION |
| Data access = Entity Framework Core + Npgsql | ADR-009 | DECISION |
| Authentication = 30-minute JWT Bearer, no refresh token or V1 revocation store | ADR-010 | DECISION |
| Excel parsing = NPOI; files accessed through `IFileStorage` | ADR-011 | DECISION |
| Import = synchronous, atomic, max 10 MB/5,000 rows | ADR-013 | DECISION |

Production hosting and managed storage remain replaceable deployment choices. Application code depends on abstractions rather than a cloud vendor.

## 2.2 Organizational Constraints

| Constraint | Source |
| ---------- | ------ |
| PostgreSQL schema is already designed; do not invent tables outside the model | `src/database/` |

## 2.3 Conventions

| Convention | Details |
| ---------- | ------- |
| Role enum | `ADMIN`, `SHOP_OWNER`, `EMPLOYEE`, `VIEWER` — do not add roles |
| UI permission hiding | Menus/buttons are not rendered when permission is missing; unauthorized URL access → 403 |
| Soft-delete list | `deleted_at IS NULL` for active records |
| Business audit actions | `CREATE`, `UPDATE`, `SOFT_DELETE`, `RESTORE` plus cross-cutting `LOGIN`, `EXPORT`, `IMPORT`; technical SQL verbs are mapped |
| Data source | `MANUAL` or `EXCEL_IMPORT` (Excel requires `import_batch_id`) |
| Import status | `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED` |
| Hash routes (information architecture) | `#/login`, `#/dashboard`, `#/incomes`, `#/expenses`, `#/reports`, `#/import`, `#/audit`, `#/users`, `#/profile`, `#/403` |

## 2.4 Business Constraints

| Constraint | Details |
| ---------- | ------- |
| Canonical currency USD | EUR is Presentation Conversion only |
| Four fixed roles | Matrix in [docs/03-use-cases.md](../../03-use-cases.md) |
| Employee cannot delete transactions | `incomeDelete` / `expenseDelete` = false |
| Employee cannot view reports / audit log | `reportRead` / `auditRead` = false |
| Only Admin manages users | `userManagement` |
| V1 does not integrate external systems | No payment gateway, no Etsy API |
