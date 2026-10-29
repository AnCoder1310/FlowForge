# HandmadeFinance — arc42 Architecture Documentation

> **Status:** Baseline · **Audience:** developers, reviewers, and maintainers

This documentation uses arc42 to explain goals, constraints, decisions, and runtime scenarios. C4 Mermaid diagrams provide the primary structural views; arc42 does not define a separate architecture.

```mermaid
flowchart LR
    goals["1–2<br/>Goals & constraints"]
    context["3<br/>Context · C4 C1"]
    strategy["4<br/>Strategy"]
    blocks["5<br/>Building blocks · C4 C2/C3"]
    runtime["6–7<br/>Runtime & deployment"]
    quality["8–12<br/>Concepts, ADRs, quality, risks"]
    goals --> context --> strategy --> blocks --> runtime --> quality
    style context fill:#1168bd,color:#fff
    style blocks fill:#1168bd,color:#fff
    style goals fill:#e8f1fc,stroke:#3a7bd5
    style strategy fill:#e8f1fc,stroke:#3a7bd5
    style runtime fill:#e8f1fc,stroke:#3a7bd5
    style quality fill:#e8f1fc,stroke:#3a7bd5
```

## Contents

| Section | Content |
|---|---|
| 1 | [Introduction and Goals](01-introduction-and-goals.md) |
| 2 | [Architecture Constraints](02-architecture-constraints.md) |
| 3 | [Context and Scope](03-context-and-scope.md) |
| 4 | [Solution Strategy](04-solution-strategy.md) |
| 5 | [Building Block View](05-building-block-view.md) |
| 6 | [Runtime View](06-runtime-view.md) |
| 7 | [Deployment View](07-deployment-view.md) |
| 8 | [Cross-cutting Concepts](08-crosscutting-concepts.md) |
| 9 | [Architecture Decisions](09-architecture-decisions.md) |
| 10 | [Quality Requirements](10-quality-requirements.md) |
| 11 | [Risks and Technical Debt](11-risks-and-technical-debt.md) |
| 12 | [Glossary](12-glossary.md) |

## Baseline

- **Current:** the React/Vite mock runs entirely in the browser.
- **Target:** React Web → ASP.NET Core Web API → PostgreSQL.
- **Principle:** the backend is the trust boundary; the domain does not depend on transport or SQL details.
- **Step 7 baseline:** Simplified Clean Architecture (Api/Application/Infrastructure), ASP.NET Core Controllers, 30-minute JWT Bearer, EF Core/Npgsql, synchronous NPOI import, and local `IFileStorage`.
- **Deferred deployment choices:** production hosting, managed storage, backups, exchange-rate provider, and centralized monitoring.

Related: [C4 C1 → C2 → C3 → C4](../c4/README.md) · [C4 Code for two core features](../c4/04-code.md) · [Use Case Diagram](../../03-use-cases.md#use-case-diagram).

Governance and verification: [Architecture conformance](../architecture-conformance.md) · [Document governance](../document-governance.md) · [Consistency audit](../../reviews/architecture-consistency-audit.md) · [Threat model](../../security/threat-model.md).
