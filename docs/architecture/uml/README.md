# Detailed UML — HandmadeFinance

> **Status:** Code-level design for ASP.NET Core/C#; the backend has not been implemented.

This UML set expands the C3/C4 architecture using the intended class names and target folder structure:

| Document | Content |
|---|---|
| [Class diagrams](01-class-diagrams.md) | Controllers, DTOs, Services, Policies, Validators, Entities, and Repositories for Authentication, Income, and Expense |
| [Sequence diagrams](02-sequence-diagrams.md) | Login, income creation/update, and expense creation/soft deletion, including error paths |
| [Remaining class diagrams](03-additional-class-diagrams.md) | Dashboard, Categories, Reports, Import, Attachments, Audit, Users, and Profile |
| [API traceability and sequences](03-api-traceability.md) | Every OpenAPI operation mapped to its use case, service, authorization rule, and runtime pattern |
| [Master traceability](../../traceability/master-traceability.md) | US01–US17 mapped across requirements, screens, C4, API, database, target modules, UML, and future tests |
| [Folder structure](../../07-folder-structure.md) | Target React and three-tier ASP.NET Core structure |

## Relationship to C4 and arc42

- C4 Level 3 describes architectural components and their major responsibilities.
- C4 Level 4 describes code-level dependency patterns.
- UML documents classes, methods, and call order for Authentication, Income, and Expense.
- The arc42 Runtime View provides broader system-wide runtime scenarios.

The [OpenAPI 3.0.4 specification](../../api/openapi.yaml) is the source of truth for HTTP paths, requests, responses, and the security scheme. The sequence diagrams illustrate the corresponding runtime interactions.

Logout, synchronous atomic import, import-to-ledger validation, report/export parity, and soft-delete audit semantics are accepted V1 decisions. Diagrams describe TARGET code collaboration; executable tests and backend completion remain separate implementation evidence.
