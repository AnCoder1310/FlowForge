# 5. Building Block View

This section is aligned with C4: Level 1 represents the whole system, Level 2 shows Containers, and Level 3 zooms into the .NET Backend.

## 5.1 Level 1 — HandmadeFinance

HandmadeFinance is a software system serving four roles: Administrator, Shop Owner, Employee, and Viewer. See [C1 System Context](../c4/01-system-context.md).

## 5.2 Level 2 — Containers

```mermaid
flowchart TB
    operator(["👤 Administrator / Shop Owner / Employee"])
    reader(["👤 Viewer"])

    subgraph platform["HandmadeFinance [Software System Boundary]"]
        direction TB
        subgraph presentation["Presentation"]
            web["Web Frontend<br/><i>[Container: React.js + Vite]</i><br/>UI, routing, forms, tables, and charts"]
        end
        subgraph application["Application"]
            backend[".NET Backend<br/><i>[Container: ASP.NET Core Web API]</i><br/>Authentication, RBAC, business rules,<br/>imports, reporting, and auditing"]
        end
        subgraph data["Data"]
            database[("PostgreSQL<br/><i>[Container: Database]</i><br/>Users, categories, incomes, expenses,<br/>imports, attachments, and audit logs")]
        end
    end

    workbook[("Excel Workbook<br/><i>[External Data]</i><br/>User-provided .xlsx / .xls file")]

    operator --> web
    reader --> web
    web -- "REST / HTTPS / JSON" --> backend
    web -- "upload file import" --> backend
    workbook -.->|"selected from the user's device"| web
    backend -- "SQL / PostgreSQL protocol" --> database

    style web fill:#1168bd,color:#fff
    style backend fill:#1168bd,color:#fff
    style database fill:#1168bd,color:#fff
```

| Container | Public surface | Owned data |
|---|---|---|
| Web Frontend | Hash routes, forms, tables, charts | Temporary client/session state |
| .NET Backend | REST/JSON endpoints | Business rules and transaction orchestration |
| PostgreSQL | Backend access only | Users, categories, incomes, expenses, imports, attachments, audits |

## 5.3 Level 3 — .NET Backend Components

```mermaid
flowchart TB
    subgraph rt[".NET Backend [Container]"]
        direction TB
        api["HTTP API<br/><i>[Component: ASP.NET Core]</i><br/>REST endpoints, request validation,<br/>response and error mapping"]
        identity["Identity & Access<br/><i>[Component]</i><br/>Login, session/token, RBAC,<br/>and own-record policy"]
        user["User & Profile<br/><i>[Component]</i><br/>Accounts, roles, status, and profiles"]
        ledger["Income & Expense<br/><i>[Component]</i><br/>CRUD, categories, tax, status,<br/>and soft deletion"]
        importer["Excel Import<br/><i>[Component]</i><br/>File validation, preview,<br/>batch import, and row-level results"]
        reporting["Dashboard & Reporting<br/><i>[Component]</i><br/>KPIs, trends, breakdowns,<br/>and export data"]
        audit["Audit Log<br/><i>[Component]</i><br/>Records business actions<br/>for traceability"]
        persistence["Persistence<br/><i>[Component]</i><br/>Repositories, transaction boundaries,<br/>and SQL mapping"]
    end

    web["Web Frontend<br/><i>[Container: React.js]</i>"]
    db[("PostgreSQL<br/><i>[Container: Database]</i>")]
    file[("Excel Workbook<br/><i>[External Data]</i>")]

    web --> api
    file -.->|"uploaded through the Web Frontend"| api
    api --> identity
    api --> user
    api --> ledger
    api --> importer
    api --> reporting
    identity --> persistence
    user --> persistence
    ledger --> persistence
    importer --> ledger
    importer --> persistence
    reporting --> persistence
    user -.->|"administrative events"| audit
    ledger -.->|"transaction events"| audit
    importer -.->|"batch results"| audit
    audit --> persistence
    persistence --> db

    style api fill:#1168bd,color:#fff
    style identity fill:#1168bd,color:#fff
    style user fill:#1168bd,color:#fff
    style ledger fill:#0b4f9e,color:#fff
    style importer fill:#1168bd,color:#fff
    style reporting fill:#1168bd,color:#fff
    style audit fill:#1168bd,color:#fff
    style persistence fill:#1168bd,color:#fff
```

| Component | Responsibility | API usage |
|---|---|---|
| HTTP API | Parse/validate requests and map responses/errors | All use-case endpoints |
| Identity & Access | Login, credentials/session, RBAC, own-record policy | Login and every protected endpoint |
| User & Profile | User lifecycle and profile | Users, profile |
| Income & Expense | CRUD, category, tax, status, soft delete | Incomes, expenses |
| Excel Import | Validate/preview/process batch | Import |
| Dashboard & Reporting | KPI, time series, category aggregate, export model | Dashboard, reports |
| Audit Log | Append traceable actions | Audit queries; receives internal events |
| Persistence | Repositories, transactions, and SQL mapping | Used internally by other components |

## 5.4 UI-to-Component Mapping

| UI | Primary component |
|---|---|
| Login and route permissions | Identity & Access |
| User and profile management | User & Profile |
| Income and expense management | Income & Expense |
| Import Excel | Excel Import + Income & Expense |
| Dashboard and reports | Dashboard & Reporting |
| Activity log | Audit Log |

## 5.5 Dependency Rules

1. The HTTP API orchestrates only and writes no SQL.
2. Import does not bypass Income & Expense validation.
3. Audit records are written in the same business transaction when consistency is required.
4. Reporting does not modify transactions.
5. Only Persistence communicates with PostgreSQL.

Complete C3 diagram: [C3 — Component](../c4/03-component.md).

## 5.6 Level 4 — Two Core Features

The code-level target for `Income Management` and `Expense Management` is described with ASP.NET Core Controllers, Services, Policies, Validators, Domain Entities, and Repositories in [C4 Level 4](../c4/04-code.md). This is a target design; no C# source exists yet for implementation comparison.
