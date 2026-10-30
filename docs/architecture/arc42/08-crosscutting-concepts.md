# 8. Cross-Cutting Concepts

## 8.1 Security & Authentication

- **Password Hashing:** PBKDF2-HMAC-SHA256 with 100,000 iterations and 16-byte random salt.
- **Session Tokens:** Stateless HMAC-SHA256 Bearer Token containing `sub` (user_id), `role`, and expiration timestamp.
- **Authorization Boundary:** FastAPI dependency injection (`require_roles([UserRole.ADMIN, ...])`) checks permissions before router execution.

## 8.2 Error Handling & RFC 7807

All API error responses adhere to RFC 7807 Problem Details:
```json
{
  "status": 400,
  "errorCode": "CYCLE_DETECTED",
  "detail": "Cyclic dependency detected in workflow DAG definition."
}
```

## 8.3 Queue Isolation & Concurrency

- 5 isolated task queues: `default`, `compute`, `data-io`, `payment`, `ai-agent`.
- Worker nodes declare `supported_queues` and maximum concurrency slots.

## 8.4 Immutable Audit Logging

Sensitive operations write append-only records with actor ID, action verb, target module, detail, and UTC timestamp.
