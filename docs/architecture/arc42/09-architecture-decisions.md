# 9. Architecture Decisions

Each Architecture Decision Record contains: Context, Decision, Alternatives, Consequences, Status.

Status **Accepted** means the decision is approved for Step 7 even if code does not exist yet.

## ADR-001 React.js for Web Frontend

| | |
|---|---|
| **Context** | A web user interface is needed for income/expenses, dashboard, import, and authorization. |
| **Decision** | Web Frontend = React.js single-page application calling REST. |
| **Alternatives** | Server-rendered Razor Pages/MVC; mobile-only. Not selected because they are outside the V1 web scope. |
| **Consequences** | The frontend team can work independently from .NET; all monetary and authorization rules remain enforced by the API. |
| **Status** | Accepted |

## ADR-002 .NET for Backend

| | |
|---|---|
| **Context** | The system needs application programming interfaces, role-based access control, import, and SQL access. |
| **Decision** | The Backend Application is written in C# on .NET. |
| **Alternatives** | Node, Java. The repository has no requirement for those choices. |
| **Consequences** | ASP.NET Core attribute Controllers implement the OpenAPI operations; the API remains one deployable. |
| **Status** | Accepted |

## ADR-003 Modular Monolith instead of Microservices

| | |
|---|---|
| **Context** | One income/expense bounded context and one PostgreSQL database. |
| **Decision** | Modular Monolith; .NET Backend components live in one deployable. |
| **Alternatives** | Separate Income/Expense/Auth microservices — higher operational complexity with no current driver. |
| **Consequences** | Modules do not issue SQL directly; they share Persistence. |
| **Status** | Accepted |

## ADR-004 PostgreSQL as Primary Database

| | |
|---|---|
| **Context** | User–transaction–batch–audit relationships and aggregate views. |
| **Decision** | PostgreSQL with schema `shop_finance`. |
| **Alternatives** | Spreadsheet-only; document database — neither fits currency/foreign-key constraints well. |
| **Consequences** | Local Docker uses port 5433; production hosting provider remains an operator-owned pre-go-live choice. |
| **Status** | Accepted |

## ADR-005 REST/HTTPS/JSON

| | |
|---|---|
| **Context** | React needs a synchronous contract for CRUD + import. |
| **Decision** | REST JSON; HTTPS in production. |
| **Alternatives** | GraphQL, gRPC — no complex-client requirement justifies them. |
| **Consequences** | HTTP paths and schemas must remain synchronized with the [OpenAPI 3.0.4 specification](../../api/openapi.yaml). |
| **Status** | Accepted |

## ADR-006 USD as Canonical Currency

| | |
|---|---|
| **Context** | The shop views both USD and EUR but must not maintain two ledgers. |
| **Decision** | Store USD; EUR is display conversion. Enforced by SQL CHECK. |
| **Alternatives** | Multi-currency rows; store both — risks inconsistent totals. |
| **Consequences** | Exchange-rate source To Be Determined; source reports remain USD. |
| **Status** | Accepted |

## ADR-007 Soft Delete for Financial Transactions

| | |
|---|---|
| **Context** | Income/expense history must not be lost. |
| **Decision** | Use `deleted_at` / `deleted_by`; active lists filter for NULL. |
| **Alternatives** | Hard delete — loses business audit trail. |
| **Consequences** | Partial unique indexes on users/categories use `deleted_at IS NULL`. |
| **Status** | Accepted |

## ADR-008 Backend-Enforced Authorization

| | |
|---|---|
| **Context** | Four roles; Viewer/Employee can call APIs manually. |
| **Decision** | Identity & Access is mandatory in .NET; React only improves user experience. |
| **Alternatives** | Hide UI buttons only — insufficient. |
| **Consequences** | Every write scenario contains a 403 path. V1 uses short-lived Bearer JWT access tokens with no refresh token; logout removes the client token and it expires naturally. |
| **Status** | Accepted |

## ADR-009 Data Access and Transactions

| | |
|---|---|
| **Context** | Step 7 needs typed PostgreSQL access while preserving the existing schema, constraints, views, and audit triggers. |
| **Decision** | Use Entity Framework Core with the Npgsql provider. Map the existing `shop_finance` schema explicitly; use `IUnitOfWork` transactions and `SET LOCAL app.current_user_id` before audited writes. |
| **Alternatives** | Dapper or raw ADO.NET would provide control but require more manual mapping for this project. |
| **Consequences** | Migrations must not silently rename existing objects; integration tests use PostgreSQL rather than an in-memory provider. |
| **Status** | Accepted |

## ADR-010 Password and Token Security

| | |
|---|---|
| **Context** | Passwords and API credentials require a concrete Step 7 implementation. |
| **Decision** | Use ASP.NET Core `PasswordHasher<AppUser>` and JWT Bearer authentication. Access tokens contain user ID and role, are short-lived, and contain no sensitive profile data. Signing keys come from secrets/configuration, never source control. |
| **Alternatives** | Custom hashing is unsafe; server sessions require persistence not present in V1. |
| **Consequences** | Logout cannot revoke an already-issued V1 token server-side; reducing token lifetime limits exposure. Refresh tokens are outside V1. |
| **Status** | Accepted |

## ADR-011 File Processing and Storage

| | |
|---|---|
| **Context** | Imports require `.xls` and `.xlsx`; attachments require durable metadata and replaceable storage. |
| **Decision** | Use NPOI behind `IExcelParser`. Use `IFileStorage`; the local implementation writes outside the web root using generated names while PostgreSQL stores metadata. Validate extension, signature, media type, and configured size limit. |
| **Alternatives** | Browser parsing violates the backend trust boundary; binding directly to cloud storage reduces portability. |
| **Consequences** | Production may replace local storage without changing Application code. Import commits all rows or none. |
| **Status** | Accepted |

## ADR-012 API Errors and Observability Baseline

| | |
|---|---|
| **Context** | React and tests need deterministic errors and request correlation. |
| **Decision** | Use ASP.NET Core Problem Details as specified by OpenAPI. Middleware creates a trace ID, maps known Application exceptions, logs through `ILogger`, and never returns stack traces. |
| **Alternatives** | Ad-hoc envelopes drift across controllers. |
| **Consequences** | Every error response is testable; a production log sink remains a deployment concern. |
| **Status** | Accepted |

## ADR-013 Synchronous Atomic Import for V1

| | |
|---|---|
| **Context** | V1 accepts at most 10 MB/5,000 rows and has no accepted requirement for queues, workers, retries, or large-scale background processing. |
| **Decision** | `POST /imports` parses, validates, and commits synchronously. Any severe validation error commits zero ledger rows; success returns `200` with the final summary. |
| **Alternatives** | Asynchronous `202` plus job ID/status/retry semantics adds operational complexity without a V1 driver. |
| **Consequences** | The request is bounded by size/row limits and cancellation; import history remains queryable but is not a job-control API. |
| **Status** | Accepted |

## ADR-014 Simplified Clean Architecture and Audit Taxonomy

| | |
|---|---|
| **Context** | The target already has Api, Application, and Infrastructure projects; soft-delete DML is technically an UPDATE but needs business meaning. |
| **Decision** | Keep the 3-project Clean Architecture variant. Application owns framework-independent rules and abstractions. Business audit actions are `CREATE`, `UPDATE`, `SOFT_DELETE`, and `RESTORE`; persistence maps technical DML and redacts sensitive snapshots. |
| **Alternatives** | A separate Domain project and a public INSERT/UPDATE/DELETE taxonomy add ceremony or obscure business intent. |
| **Consequences** | Architecture tests enforce dependency direction; existing SQL trigger design requires mapping/redaction before implementation. |
| **Status** | Accepted |

## Decisions deferred beyond Step 7 baseline

Production hosting, managed file storage, exchange-rate provider, centralized monitoring, backup, and deployment automation remain deployment decisions; they do not block local API implementation.
