# Detailed UML — FlowForge (DWOP)

> **Status:** Code-level design for Python FastAPI & React SPA; fully implemented and verified with automated test suites.

This UML documentation provides class and sequence models for the core subsystems of FlowForge:

| Document | Content |
|---|---|
| [Class diagrams](01-class-diagrams.md) | Routers, Domain Models, Services, DAG Engine, Workers, and AI Copilot |
| [Sequence diagrams](02-sequence-diagrams.md) | Login, DAG creation with Kahn cycle validation, Execution triggering, Worker polling, and AI Self-Healing |
| [Remaining class diagrams](03-additional-class-diagrams.md) | Audit Trail, Telemetry Metrics, User RBAC, and Profile management |
| [API traceability and sequences](03-api-traceability.md) | All 24 OpenAPI endpoints mapped to use cases, services, RBAC rules, and database entities |
| [Master traceability](../../traceability/master-traceability.md) | US01–US13 mapped end-to-end across requirements, screens, C4, API, DB, and test suites |

## Relationship to C4 and arc42

- **C4 Level 3 & 4:** Describes architectural components and code-level structural dependencies.
- **UML Class Diagrams:** Documents concrete Python domain classes, Pydantic DTOs, and Service methods.
- **UML Sequence Diagrams:** Illustrates runtime message passing across presentation, application services, DAG engine, worker fleet, and persistent store.
