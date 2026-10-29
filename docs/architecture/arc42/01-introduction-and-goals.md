# 1. Introduction and Goals

HandmadeFinance is a web application for managing **income and expenses** for a handmade shop: recording money in and money out, tracking total revenue, total expenses, and **Net Result** over time and by category.

## 1.1 Requirements Overview

### Problem

The shop needs a simple place to record transactions and understand cash performance, not a complete accounting or sales system.

### Business goal (V1)

- Record **Income** and **Expense** with categories, tax, record status, and source (manual / Excel).
- Dashboard and reports use **one USD dataset**; EUR is only a display-time conversion.
- Excel Import supports validation, preview, batch tracking, and audit.
- Four fixed roles with authorization; important actions are audited.
- Attachments: metadata + storage path; binary files are not stored in PostgreSQL.

### Functional scope (mapped to feature catalog)

| ID | Capability |
| -- | ---------- |
| F01 | Authentication |
| F02 | Dashboard |
| F03 | Income Management |
| F04 | Expense Management |
| F05 | Reports |
| F06 | Excel Import |
| F07 | Attachments |
| F08 | Audit Log |
| F09 | User Management (Admin) |
| F10 | Profile |

Detailed UCs: [docs/03-use-cases.md](../../03-use-cases.md).

### Non-goals (V1)

No inventory / SKU management, payroll, double-entry accounting, electronic invoicing, payment gateways, Etsy API, or AI/chatbot.

## 1.2 Quality Goals

Three to five architecture priorities (detailed scenarios: [10-quality-requirements.md](10-quality-requirements.md)).

| ID | Quality Goal | Why it matters |
| -- | ------------ | -------------- |
| QG-1 | Data Correctness | Income/expense totals and Net Result must match active records; USD is the canonical currency |
| QG-2 | Security | Roles and permissions must be rejected by the .NET Backend even if React hides the button |
| QG-3 | Auditability | CREATE/UPDATE/SOFT_DELETE/RESTORE/LOGIN/EXPORT/IMPORT must be traceable to actor, entity, time, and correlation context without secrets |
| QG-4 | Usability | Each of the four roles sees the correct menu; Viewer must not be exposed to write actions |
| QG-5 | Maintainability | Modular Monolith + a single Persistence layer for SQL makes business modules easier to extend |

## 1.3 Stakeholders

| Stakeholder | Concerns |
| ----------- | -------- |
| Shop Owner (`SHOP_OWNER`) | Track income/expenses, reports, audit log |
| Administrator (`ADMIN`) | Users, access configuration, full business permissions |
| Employee (`EMPLOYEE`) | Record / edit own transactions, import |
| Viewer (`VIEWER`) | Read dashboard, income, expenses, reports, profile |
| Developer / maintainer | Module boundaries, schema, ADRs |
| Operator (local / future production) | Existing PostgreSQL Docker setup; select production provider/topology before go-live |

The four roles are detailed in [Section 3](03-context-and-scope.md).
