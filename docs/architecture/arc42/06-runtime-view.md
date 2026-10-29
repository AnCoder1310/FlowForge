# 6. Runtime View

The sequences below describe the target architecture. Exact endpoints and Bearer JWT security are defined in the OpenAPI contract.

## 6.1 Login

```mermaid
sequenceDiagram
    actor U as User
    participant W as React Web
    participant A as HTTP API
    participant I as Identity & Access
    participant P as Persistence
    participant D as PostgreSQL
    U->>W: Enter email and password
    W->>A: Send login request
    A->>I: Validate credential
    I->>P: Find active account
    P->>D: SELECT user
    D-->>P: User + password hash + role
    P-->>I: User
    I-->>A: Session/token or error
    A-->>W: Safe user data + credential
    W-->>U: Dashboard or error message
```

## 6.2 Create or Update Income/Expense

```mermaid
sequenceDiagram
    actor U as Admin/Owner/Employee
    participant W as React Web
    participant A as HTTP API
    participant I as Identity & Access
    participant L as Income & Expense
    participant R as Persistence
    participant D as PostgreSQL
    U->>W: Submit transaction form
    W->>A: POST/PUT transaction
    A->>I: Check session + permission
    I->>L: Authenticated actor context
    L->>L: Validate fields, tax, own-record rule
    L->>R: Begin transaction
    R->>D: INSERT/UPDATE transaction + audit
    D-->>R: Commit
    R-->>L: Saved record
    L-->>A: DTO
    A-->>W: 200/201 or error contract
```

Employees can update only records whose `createdBy` matches the current user. Only Administrators and Shop Owners can soft-delete records.

## 6.3 Import Excel

```mermaid
sequenceDiagram
    actor U as Admin/Owner/Employee
    participant W as React Web
    participant A as HTTP API
    participant X as Excel Import
    participant L as Income & Expense
    participant R as Persistence
    U->>W: Select file and data type
    W->>A: Upload/preview request
    A->>X: Validate type, header, rows
    X-->>W: Preview + row-level errors
    U->>W: Confirm import
    W->>A: POST import (<=10 MB, <=5,000 rows)
    A->>X: Parse and validate every row synchronously
    alt Any row invalid
        X->>R: Save FAILED batch with row errors
        R-->>W: 200 final summary; importedRows=0
    else Every row valid
        X->>R: Begin one database transaction
        loop each validated row
            X->>L: Build income/expense through domain rules
            L->>R: Insert with batch ID
        end
        X->>R: Mark COMPLETED + audit, then commit
        R-->>W: 200 final summary; importedRows=totalRows
    end
```

## 6.4 Dashboard and Reporting

```mermaid
sequenceDiagram
    actor U as Authorized user
    participant W as React Web
    participant A as HTTP API
    participant Q as Dashboard & Reporting
    participant R as Persistence
    participant D as PostgreSQL
    U->>W: Select period, type, source, and category
    W->>A: GET report query
    A->>Q: Filter + actor context
    Q->>R: Aggregate query
    R->>D: SELECT/SUM/GROUP BY active records
    D-->>Q: Aggregate rows
    Q-->>W: KPI, series, category breakdown
    W-->>U: Chart/table with optional USD to EUR display
```

## 6.5 Common Errors

| Situation | Expected result |
|---|---|
| Unauthenticated | `401` and redirect to login |
| Forbidden | `403`; independent of hidden UI controls |
| Invalid data | `400/422` with field-level errors |
| Record missing or soft-deleted | `404` |
| Database failure | Roll back the transaction; return an error ID without exposing SQL |

Code-level sequences for Authentication, Income, and Expense are documented in [UML Sequence Diagrams](../uml/02-sequence-diagrams.md). Their HTTP contracts are defined by the [OpenAPI 3.0.4 specification](../../api/openapi.yaml).
