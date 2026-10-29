# 11. Risks and Technical Debt

The frontend baseline for this documentation is **React.js**.

## 11.1 Architecture Risk

| ID | Risk | Consequence | Direction |
| -- | ---- | ----------- | --------- |
| R-01 | Local file storage is not suitable for horizontally scaled production | Files may be unavailable on another instance | Replace `IFileStorage` with managed shared/object storage before scale-out |
| R-02 | Production host/topology is OPEN | No standardized public hosting design | Operator selects provider/topology before go-live; HTTPS and NFR-BCP-001 remain mandatory |
| R-03 | V1 JWT cannot be revoked before expiry | A copied token remains valid briefly after logout | Short lifetime, HTTPS, secret rotation; add refresh/revocation only if required |
| R-04 | EUR exchange-rate source To Be Determined | Wrong conversion can distort displayed reports (the database remains USD) | Exchange-rate Architecture Decision Record; clearly label “display only” |
| R-05 | Malformed workbooks may stress the parser | Memory or processing pressure | NPOI limits, signature/size validation, cancellation, and adversarial tests |
| R-06 | Implementations may drift from the OpenAPI contract | Incompatible React and .NET integrations | Validate both implementations against [OpenAPI 3.0.4](../../api/openapi.yaml) in CI |
| R-07 | Production monitoring vendor/sink is not selected | Hard to verify availability/performance baselines | Keep structured logs, trace IDs, health endpoints, and portable metrics; select operator tooling before go-live |

## 11.2 Technical Debt

| ID | Debt | Notes |
| -- | ---- | ----- |
| TD-01 | Schema contains audit triggers but .NET Backend does not yet exist | Align app-level LOGIN/EXPORT/IMPORT with triggers |
| TD-02 | Import is intentionally all-or-nothing | Revisit only if users later require partial acceptance |
| TD-03 | Employee delete permission matrix has `canDeleteOwn = false` | Backend must follow the use-case matrix; do not invent “own delete” |

## 11.3 Decision Status

| Topic | Status |
| ----- | ------ |
| ASP.NET Core API style | Attribute Controllers — accepted |
| SQL access | Entity Framework Core + Npgsql — accepted |
| Password hashing | ASP.NET Core `PasswordHasher<AppUser>` — accepted |
| Authentication session mechanism | Short-lived JWT Bearer, no V1 refresh token — accepted |
| Logout | Client token discard; no V1 server-side revocation — accepted |
| Import execution | Synchronous, atomic, max 10 MB/5,000 rows — accepted |
| File storage | `IFileStorage`; local outside-web-root implementation for Step 7 |
| Exchange-rate source | To Be Determined |
| Excel parse library | NPOI — accepted |
| Production host/topology | OPEN before go-live; HTTPS and backup/RPO/RTO requirements are already fixed |
| Continuous Integration / Continuous Delivery, metrics, log aggregator | To Be Determined |
| JSON error envelope | OpenAPI `ProblemDetails` — accepted |

Consequence of ADR-001…005: implementation must follow the React + .NET + PostgreSQL baseline; until a Platform as a Service is selected, risk R-02 remains open.
