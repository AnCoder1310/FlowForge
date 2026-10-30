# 11. Risks and Technical Debt

| Risk / Debt | Impact | Mitigation Strategy |
|---|---|---|
| In-memory store fallback | In development mode, restarting the process resets transient task queue states if SQLite persistence is bypassed. | Ensure all mutations commit to SQLite (`src/database/workflow_orchestrator.db`) or PostgreSQL. |
| Brokerless Queue Polling | HTTP long-polling introduces latency compared to event streaming for ultra-high throughput worker clusters. | Architectural roadmap: Add Redis Streams or RabbitMQ/Kafka broker adapter in V2. |
| External LLM Latency | AI Prompt-to-DAG relies on external LLM response times. | Implement client timeout fallback and deterministic heuristics generator when offline. |
