# 10. Quality Requirements

Mapped to [QG-1 … QG-5](01-introduction-and-goals.md) and the measurable [NFR baseline](../../requirements/non-functional-requirements.md). Values are V1 engineering baselines, not contractual service-level agreements.

Structure: ID, Quality Attribute, Scenario, Environment, Expected Response, Measurement.

## QR-01 Authorization

|                       |                                                              |
| --------------------- | ------------------------------------------------------------ |
| **ID**                | QR-01                                                        |
| **Quality Attribute** | Security / Authorization (QG-2)                              |
| **Scenario**          | A logged-in VIEWER calls `POST` to create Income (or Expense, Import) |
| **Environment**       | .NET Backend + PostgreSQL; independent of React hiding the button |
| **Expected Response** | 403 Forbidden; no INSERT into incomes/expenses/import_batches |
| **Measurement**       | API test; audit contains no business INSERT for that user    |

## QR-02 Employee own-update and no-delete

|                       |                                                       |
| --------------------- | ----------------------------------------------------- |
| **ID**                | QR-02                                                 |
| **Quality Attribute** | Security                                              |
| **Scenario**          | EMPLOYEE edits a record created by another user, or attempts soft delete |
| **Environment**       | Authenticated API                                     |
| **Expected Response** | 403; record remains unchanged / `deleted_at` remains NULL |
| **Measurement**       | Test against `created_by`                             |

## QR-03 Data Integrity — USD and active set

|                       |                                                                         |
| --------------------- | ----------------------------------------------------------------------- |
| **ID**                | QR-03                                                                   |
| **Quality Attribute** | Data Correctness (QG-1)                                                 |
| **Scenario**          | Create Income with a currency other than USD, or Dashboard includes a soft-deleted record |
| **Environment**       | API + database CHECK + views                                                  |
| **Expected Response** | Reject currency ≠ USD; key performance indicators and reports include only `deleted_at IS NULL`    |
| **Measurement**       | SQL constraint; compare API totals with active `SUM(amount)`            |

## QR-04 Auditability

|                       |                                                                                               |
| --------------------- | --------------------------------------------------------------------------------------------- |
| **ID**                | QR-04                                                                                         |
| **Quality Attribute** | Auditability (QG-3)                                                                           |
| **Scenario**          | Successful login; soft-delete expense; confirm import; export report                          |
| **Environment**       | Backend + `audit_logs`                                                                        |
| **Expected Response** | LOGIN / SOFT_DELETE / IMPORT / EXPORT records with actor, entity, timestamp, redacted before/after and correlation ID when available; no password/hash/token |
| **Measurement**       | Query `audit_logs`; review payload                                                            |

## QR-05 Import atomicity

|                       |                                                                                                                                                                               |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                | QR-05                                                                                                                                                                         |
| **Quality Attribute** | Data Integrity                                                                                                                                                                |
| **Scenario**          | Confirm import; some rows fail during processing                                                                                                                              |
| **Environment**       | Excel Import + Persistence transaction                                                                                                                                        |
| **Expected Response** | The synchronous request rejects files over 10 MB/5,000 rows; any severe validation error yields a final FAILED summary and zero ledger inserts; otherwise all rows commit and status is COMPLETED |
| **Measurement**       | Final `totalRows`, `validRows`, `importedRows`, `failedRows`, `validationErrors`; database row counts and rollback test |

## QR-06 Performance (dashboard)

|                       |                                                                      |
| --------------------- | -------------------------------------------------------------------- |
| **ID**                | QR-06                                                                |
| **Quality Attribute** | Performance                                                          |
| **Scenario**          | User opens Dashboard using the default date range with V1 single-shop data |
| **Environment**       | Documented reference workload: >=100,000 records and 50 concurrent active users |
| **Expected Response** | P95 latency <= 2 seconds |
| **Measurement**       | `PERF-REPORT-001` load test |

## QR-07 Recoverability

|                       |                                                                                                       |
| --------------------- | ----------------------------------------------------------------------------------------------------- |
| **ID**                | QR-07                                                                                                 |
| **Quality Attribute** | Recoverability                                                                                        |
| **Scenario**          | PostgreSQL volume is lost                                                                             |
| **Environment**       | Target production PostgreSQL |
| **Expected Response** | Daily backup retained 30 days; RPO <= 24 hours; RTO <= 4 hours |
| **Measurement**       | `OPS-RESTORE-001` timed restore exercise |

## QR-08 Usability — role shell

|                       |                                                             |
| --------------------- | ----------------------------------------------------------- |
| **ID**                | QR-08                                                       |
| **Quality Attribute** | Usability (QG-4)                                            |
| **Scenario**          | VIEWER opens app; EMPLOYEE opens `#/reports`                |
| **Environment**       | React + API                                                 |
| **Expected Response** | VIEWER does not see add/edit/delete/import; EMPLOYEE receives 403 for reports |
| **Measurement**       | Role × menu checklist (`docs/03-use-cases.md`)              |

## QR-09 Maintainability — persistence boundary

|                       |                                                                    |
| --------------------- | ------------------------------------------------------------------ |
| **ID**                | QR-09                                                              |
| **Quality Attribute** | Maintainability (QG-5)                                             |
| **Scenario**          | Add a field to `incomes`                                           |
| **Environment**       | .NET projects/modules                                                         |
| **Expected Response** | SQL remains inside Persistence; Income Management contains no SQL driver code |
| **Measurement**       | `ARCH-001`–`ARCH-014` plus project-reference inspection           |
