# 9. Architecture Decisions (ADRs)

| ADR | Title | Decision | Status |
|---|---|---|---|
| **ADR-001** | Frontend Technology | React 18 + Vite SPA with Tailwind CSS / dark-light design system. | ACCEPTED |
| **ADR-002** | Backend Framework | Python FastAPI (ASGI) for async concurrency, Pydantic validation, and native OpenAPI generation. | ACCEPTED |
| **ADR-003** | DAG Cycle Detection | Kahn's Topological Sorting Algorithm ($O(V + E)$) executed synchronously on creation. | ACCEPTED |
| **ADR-004** | Queue Isolation | 5 independent worker queues to decouple compute-heavy workloads from I/O and payment tasks. | ACCEPTED |
| **ADR-005** | Database Strategy | Dual support for SQLite (zero-config local dev) and PostgreSQL 16 (production). | ACCEPTED |
| **ADR-006** | Token Authentication | Stateless HMAC-SHA256 signed Bearer Token with 24-hour expiration. | ACCEPTED |
| **ADR-007** | AI Integration | LLM Copilot for Prompt-to-DAG generation and automated failure root cause diagnostics. | ACCEPTED |
| **ADR-008** | Audit Trail | Append-only immutable table recording all lifecycle transitions and security events. | ACCEPTED |
