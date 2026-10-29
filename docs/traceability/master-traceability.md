# Master Traceability Matrix — HandmadeFinance V1

> Design status: TARGET V1  
> Test status: 250 automated tests passed on 2026-09-18; named verification IDs remain PLANNED unless explicitly mapped to executable evidence

## Functional traceability

The original US01–US17 coverage is preserved and extended with stable planned test IDs.

| Requirement | Use Case | Acceptance Criteria | Screen | C4 Component | API operationId | Database | Target module / UML | Verification |
|---|---|---|---|---|---|---|---|---|
| US01 | UC01 | AC-UC01 | SCR-01 | Identity & Access | `login` | `app_users`, `audit_logs` | `features/auth`; Authentication; S01 | `INT-AUTH-001`, `SEC-AUTH-001` PLANNED |
| US02 | UC02 | AC-UC02 | Shell → SCR-01 | Identity & Access | `logout` | No revocation store | `features/auth`; Authentication; S02 | `INT-AUTH-002`, `SEC-JWT-001` PLANNED |
| US03 | UC03 | AC-UC03 | SCR-02 | Dashboard & Reporting | `getDashboard` | active ledger views | Dashboard; S03 | `INT-DASH-001`, `PERF-REPORT-001` PLANNED |
| US04 | UC04 | AC-UC04 | SCR-10/13 | Income & Expense | `listIncomes`, `getIncome`, `listIncomeCategories` | `incomes`, `income_categories`, `attachments` | Incomes/Categories; read pattern | `INT-INCOME-001` PLANNED |
| US05 | UC05 | AC-UC05 | SCR-11 | Income & Expense, File Storage | `createIncome`, `uploadIncomeAttachment` | income/category/attachment/audit tables | Incomes/Attachments; create/S08 | `UNIT-APP-INCOME-001`, `INT-INCOME-002` PLANNED |
| US06 | UC06 | AC-UC06 | SCR-12 | Identity & Access, Income & Expense | `updateIncome`, attachment operations | `incomes`, `attachments`, `audit_logs` | Incomes/Attachments; update/S08 | `INT-RBAC-OWN-001`, `INT-INCOME-003` PLANNED |
| US07 | UC07 | AC-UC07 | SCR-10 | Income & Expense, Audit | `softDeleteIncome` | `incomes`, `audit_logs` | Incomes; delete pattern | `INT-INCOME-004`, `SEC-AUDIT-001` PLANNED |
| US08 | UC08 | AC-UC08 | SCR-20/23 | Income & Expense | `listExpenses`, `getExpense`, `listExpenseCategories` | expense/category/attachment tables | Expenses/Categories; read pattern | `INT-EXPENSE-001` PLANNED |
| US09 | UC09 | AC-UC09 | SCR-21 | Income & Expense, File Storage | `createExpense`, `uploadExpenseAttachment` | expense/category/attachment/audit tables | Expenses/Attachments; create/S08 | `UNIT-APP-EXPENSE-001`, `INT-EXPENSE-002` PLANNED |
| US10 | UC10 | AC-UC10 | SCR-22 | Identity & Access, Income & Expense | `updateExpense`, attachment operations | `expenses`, `attachments`, `audit_logs` | Expenses/Attachments; update/S08 | `INT-RBAC-OWN-002`, `INT-EXPENSE-003` PLANNED |
| US11 | UC11 | AC-UC11 | SCR-20 | Income & Expense, Audit | `softDeleteExpense` | `expenses`, `audit_logs` | Expenses; delete pattern | `INT-EXPENSE-004`, `SEC-AUDIT-001` PLANNED |
| US12 | UC12 | AC-UC12 | SCR-40 | Excel Import, Ledger, File Storage | `previewImport`, `createImport`, `listImports`, `getImport` | `import_batches`, ledger/category/audit tables | Imports; S04–S05 | `INT-IMPORT-001..003`, `CONTRACT-API-IMPORT-001` PLANNED |
| US13 | UC13 | AC-UC13 | SCR-30 | Dashboard & Reporting | `getReport` | reporting views | Reports; S06 | `INT-REPORT-001`, `PERF-REPORT-001` PLANNED |
| US14 | UC14 | AC-UC14 | SCR-30 | Dashboard & Reporting | `exportReport` | reporting views, `audit_logs` | Reports/exporters; S07 | `INT-REPORT-002`, `SEC-EXPORT-001` PLANNED |
| US15 | UC15 | AC-UC15 | SCR-50 | Audit Log | `listAuditLogs` | `audit_logs` | Audit; read pattern | `INT-AUDIT-001`, `SEC-AUDIT-002` PLANNED |
| US16 | UC16 | AC-UC16 | SCR-60 | User & Profile, Identity | user operations | `app_users`, `audit_logs` | Users; S09 | `INT-RBAC-ADMIN-001`, `INT-USERS-001` PLANNED |
| US17 | UC17 | AC-UC17 | SCR-70 | User & Profile, Identity | profile operations | `app_users`, `audit_logs` | Profile; S10 | `INT-PROFILE-001`, `INT-AUTH-003` PLANNED |

## Quality/NFR traceability

| Requirement | ADR | C4 Component | API / Module | Implementation Mechanism | Verification |
|---|---|---|---|---|---|
| NFR-PERF-001/002 | ADR-009 | HTTP API, Persistence | CRUD modules | paginated parameterized queries; bounded writes and audit transaction | `PERF-CRUD-001/002` PLANNED |
| NFR-PERF-003/004 | ADR-006/009 | Dashboard & Reporting | `getDashboard`, `getReport`, `exportReport` | active indexed PostgreSQL views; shared report data; bounded synchronous export | `PERF-REPORT-001`, `PERF-EXPORT-001` PLANNED |
| NFR-CAP-001/002 | ADR-003/004 | Backend, PostgreSQL | all | modular monolith and representative indexed dataset | `PERF-CAP-001`, `PERF-CONC-001` PLANNED |
| NFR-IMPORT-001/002, QR-05 | ADR-011/013 | Excel Import, Ledger, Persistence | import operations | signature/type checks; 10 MB/5,000 rows; authoritative validators; one transaction | `INT-IMPORT-001..003`, `PERF-IMPORT-001` PLANNED |
| NFR-SEC-001 | ADR-008/010 | Identity & Access | login/logout | 30-minute JWT; client discard; no refresh/revocation store | `INT-AUTH-001/002`, `SEC-JWT-001` PLANNED |
| NFR-SEC-002/003 | ADR-010 | Identity & Access | login/changePassword | minimum 8 characters; 5 failures/15 min account plus equivalent IP protection | `INT-AUTH-002`, `SEC-AUTH-001` PLANNED |
| NFR-SEC-004, QR-01/02 | ADR-008 | Identity & Access | protected operations | deny-by-default RBAC and ownership policies | `INT-RBAC-*`, `ARCH-009` PLANNED |
| NFR-SEC-005, QR-04 | ADR-012/014 | Audit Log, HTTP API | cross-cutting | structured redaction; CREATE/UPDATE/SOFT_DELETE/RESTORE; correlation ID | `SEC-LOG-001`, `SEC-AUDIT-001` PLANNED |
| NFR-MAINT-001/002, QR-09 | ADR-003/009/014 | all backend components | solution/CI | 3-project dependency rules; coverage/static/contract gates | `ARCH-001..014`, CI coverage PLANNED |
| NFR-REL-001 | ADR-003 | Backend, PostgreSQL | deployment | health monitoring and monthly availability calculation | `OPS-AVAIL-001` PLANNED |
| NFR-BCP-001, QR-07 | ADR-004 | PostgreSQL | operations | daily backup, 30-day retention, RPO 24 h, RTO 4 h | `OPS-RESTORE-001` PLANNED |
| NFR-OBS-001 | ADR-012 | HTTP API | middleware/health | structured logs, trace ID, health endpoints, secret exclusion | `INT-OBS-001`, `SEC-LOG-001` PLANNED |
| NFR-ACC-001, QR-08 | ADR-001 | React Web | all screens | labels, non-color status, keyboard/focus checks | `A11Y-001` PLANNED |

## Conformance

Every OpenAPI operation is represented above through its owning user story. [Architecture conformance](../architecture/architecture-conformance.md) defines executable rules `ARCH-001`–`ARCH-014`; [threat model](../security/threat-model.md) maps abuse cases to security verification. No planned identifier is evidence of a passing test merely because the aggregate suite passes. Named tests must be mapped before changing an individual verification ID to `PASS`. Remaining work is listed in [Project Progress](../../README.md#project-progress).
