# 12. Glossary

Definitions follow HandmadeFinance semantics from the documentation and schema.

| Term | Definition |
| ---- | ---------- |
| **HandmadeFinance** | V1 Software System for managing income and expenses for a handmade shop. |
| **Income** | Money received; table `incomes`; `amount` = pre-tax amount in USD. |
| **Expense** | Money paid out; table `expenses`; includes `payee`, `origin_scope`, `payment_method`. |
| **Net Result** | Net profit: total active Income minus total active Expense for the same period, stored/calculated in USD. |
| **Income Category** | Income classification (`income_categories`; seeds: Sales, Other Income). |
| **Expense Category** | Expense classification (`expense_categories`; raw materials, packaging, shipping, etc.). |
| **Canonical Currency** | The single currency used for storage and calculation in the database. |
| **USD** | V1 Canonical Currency; `currency_code` CHECK allows USD only. |
| **EUR** | Display currency; Presentation Conversion, not a second dataset. |
| **Soft Delete** | Logically hide a record using `deleted_at` (+ `deleted_by` on transactions); normal flows do not physically delete it. |
| **Audit Log** | `audit_logs`: actor, action, module, entity, timestamp, detail; contains no secrets. |
| **Audit Action** | Business taxonomy `CREATE`, `UPDATE`, `SOFT_DELETE`, `RESTORE`; persistence maps lower-level SQL trigger events. |
| **Import Batch** | One Excel import execution (`import_batches`); status PENDING / PROCESSING / COMPLETED / FAILED. |
| **MANUAL** | `data_source` for manual entry; `import_batch_id` is NULL. |
| **EXCEL_IMPORT** | `data_source` for Excel; requires `import_batch_id`. |
| **Record Status** | `DRAFT`, `PENDING`, `COMPLETED` — transaction record status. |
| **Admin** | Role `ADMIN` — full business permissions + user management. |
| **Shop Owner** | Role `SHOP_OWNER` — income/expenses/reports/audit; no user management. |
| **Employee** | Role `EMPLOYEE` — create/edit own records and import; no delete, reports, or audit log. |
| **Viewer** | Role `VIEWER` — read-only access to dashboard, income, expenses, reports, profile. |
| **Attachment** | Supporting document: metadata + `storage_path`; belongs to exactly one Income or one Expense; binary content is not stored in PostgreSQL. |
| **Sales Channel** | Sales channel: ETSY_STORE, WEBSITE_DIRECT, INSTAGRAM_SHOP, LOCAL_MARKET, B2B_WHOLESALE. |
| **Payment Method** | CREDIT_CARD, BANK_TRANSFER, CASH, PAYPAL. |
| **Modular Monolith** | One .NET Backend with multiple logical Components and one PostgreSQL database. |
| **Container** | Deployable/runtime building block: React Frontend, .NET Backend, PostgreSQL. |
| **Component** | Logical module inside the .NET Backend (HTTP API, Identity, Income, etc.). |
