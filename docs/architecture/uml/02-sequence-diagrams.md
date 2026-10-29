# Sequence Diagrams — Authentication, Income, and Expense

> **Scope:** Step 6 · **Status:** Executable baseline implemented  
> The `/api/v1/...` endpoints follow [OpenAPI 3.0.4](../../api/openapi.yaml).

The diagrams share one presentation pattern: **Actor → Page → Form → Controller → Application Service → Repository → PostgreSQL**. Requests use solid arrows, responses use dashed arrows; `alt` describes mutually exclusive outcomes and `opt` describes optional processing.

## 1. Login — `POST /api/v1/auth/login`

```mermaid
sequenceDiagram
    actor User as User
    participant Page as Login Page
    participant Form as Login Form
    participant API as AuthController
    participant Service as AuthenticationService
    participant Repo as IUserRepository
    participant Password as PasswordService
    participant Token as TokenService
    participant DB as PostgreSQL

    User->>Page: Open login page
    activate Page
    Page->>Form: Display login form
    activate Form
    User->>Form: Enter email and password
    User->>Form: Click Login

    alt Email or password is empty
        Form-->>User: Show required-field error
    else Input is valid
        Form->>API: POST /api/v1/auth/login
        activate API
        API->>Service: LoginAsync(email, password)
        activate Service
        Service->>Repo: FindByEmailAsync(email)
        activate Repo
        Repo->>DB: SELECT app_users by email
        activate DB
        DB-->>Repo: UserAccount or null
        deactivate DB
        Repo-->>Service: UserAccount or null
        deactivate Repo

        alt Not found or account locked
            Service-->>API: INVALID_CREDENTIALS
            API-->>Form: 401 Unauthorized
            Form-->>User: Email or password is incorrect
        else Account active
            Service->>Password: Verify(passwordHash, password)
            activate Password
            Password-->>Service: Verification result
            deactivate Password
            alt Password incorrect
                Service-->>API: INVALID_CREDENTIALS
                API-->>Form: 401 Unauthorized
                Form-->>User: Email or password is incorrect
            else Password correct
                Service->>Token: Issue(user, expiresAt)
                activate Token
                Token-->>Service: Bearer token
                deactivate Token
                Service->>Repo: Update lastLoginAt
                activate Repo
                Repo->>DB: UPDATE app_users
                activate DB
                DB-->>Repo: Update succeeded
                deactivate DB
                Repo-->>Service: Completed
                deactivate Repo
                Service-->>API: LoginResult
                API-->>Form: 200 Token + user profile
                Form->>Page: Save token and session
                Page-->>User: Redirect to Dashboard
            end
        end
        deactivate Service
        deactivate API
    end
    deactivate Form
    deactivate Page
```

The API intentionally returns the same `401` error for a non-existent email, a locked account, and a wrong password to prevent account enumeration.

## 2. Add income — `POST /api/v1/incomes`

```mermaid
sequenceDiagram
    actor User as Admin / Shop Owner / Employee
    participant Page as Income Page
    participant Form as Income Form
    participant API as IncomesController
    participant Service as LedgerService
    participant Repo as ILedgerRepository
    participant DB as PostgreSQL

    User->>Page: Select Add Income
    activate Page
    Page->>Form: Open income form
    activate Form
    User->>Form: Enter income details
    User->>Form: Click Save

    opt Required field missing or wrong format
        Form-->>User: Show field-level error
    end

    Form->>API: POST /api/v1/incomes + Bearer token
    activate API
    alt Token missing or invalid
        API-->>Form: 401 Unauthorized
    else Authenticated
        API->>Service: CreateAsync(INCOME, request, actor)
        activate Service
        alt Viewer has no create permission
            Service-->>API: Forbidden
            API-->>Form: 403 Forbidden
            Form-->>User: Show permission-denied message
        else Has create permission
            Service->>Service: Validate description, amount, tax, and after-tax amount
            alt Business data invalid
                Service-->>API: Validation error
                API-->>Form: 400 Problem Details
                Form-->>User: Show data error
            else Data valid
                Service->>Repo: AddAsync(income)
                activate Repo
                Repo->>DB: INSERT incomes
                activate DB
                DB->>DB: Trigger writes audit_logs
                DB-->>Repo: New income ID
                deactivate DB
                Repo-->>Service: LedgerEntry
                deactivate Repo
                Service-->>API: Income created
                API-->>Form: 201 Created
                Form->>Page: Close form and reload list
                Page-->>User: Show new income entry
            end
        end
        deactivate Service
    end
    deactivate API
    deactivate Form
    deactivate Page
```

## 3. Employee edits income — `PUT /api/v1/incomes/{id}`

```mermaid
sequenceDiagram
    actor Employee as Employee
    participant Page as Income Page
    participant Form as Income Edit Form
    participant API as IncomesController
    participant Service as LedgerService
    participant Repo as ILedgerRepository
    participant DB as PostgreSQL

    Employee->>Page: Select edit income
    activate Page
    Page->>Form: Open form with current data
    activate Form
    Employee->>Form: Change details and click Save
    Form->>API: PUT /api/v1/incomes/{id}
    activate API
    API->>Service: UpdateAsync(INCOME, id, request, actor)
    activate Service
    Service->>Repo: GetAsync(INCOME, id)
    activate Repo
    Repo->>DB: SELECT active income record
    activate DB
    DB-->>Repo: Record or null
    deactivate DB
    Repo-->>Service: LedgerEntry or null
    deactivate Repo

    alt Not found or already soft-deleted
        Service-->>API: NotFound
        API-->>Form: 404 Not Found
        Form-->>Employee: Show income-not-found message
    else Income found
        alt createdBy differs from employee ID
            Service-->>API: Forbidden
            API-->>Form: 403 Forbidden
            Form-->>Employee: Cannot edit another user's record
        else Employee owns the record
            Service->>Service: Validate updated data
            alt Data invalid
                Service-->>API: Validation error
                API-->>Form: 400 Problem Details
            else Data valid
                Service->>Repo: UpdateAsync(income)
                activate Repo
                Repo->>DB: UPDATE incomes
                activate DB
                DB->>DB: Trigger writes audit_logs
                DB-->>Repo: Update succeeded
                deactivate DB
                Repo-->>Service: Completed
                deactivate Repo
                Service-->>API: Income updated
                API-->>Form: 200 OK
                Form->>Page: Close form and reload data
                Page-->>Employee: Show update result
            end
        end
    end
    deactivate Service
    deactivate API
    deactivate Form
    deactivate Page
```

Admin and Shop Owner can edit any record; Employee can only edit records they created.

## 4. Add expense — `POST /api/v1/expenses`

```mermaid
sequenceDiagram
    actor User as Admin / Shop Owner / Employee
    participant Page as Expense Page
    participant Form as Expense Form
    participant API as ExpensesController
    participant Service as LedgerService
    participant Repo as ILedgerRepository
    participant DB as PostgreSQL

    User->>Page: Select Add Expense
    activate Page
    Page->>Form: Open expense form
    activate Form
    User->>Form: Enter details and click Save
    Form->>API: POST /api/v1/expenses + Bearer token
    activate API

    alt Token missing or invalid
        API-->>Form: 401 Unauthorized
    else Authenticated
        API->>Service: CreateAsync(EXPENSE, request, actor)
        activate Service
        alt Viewer has no create permission
            Service-->>API: Forbidden
            API-->>Form: 403 Forbidden
        else Has create permission
            Service->>Service: Validate amount, tax, and after-tax amount
            alt Data invalid
                Service-->>API: Validation error
                API-->>Form: 400 Problem Details
                Form-->>User: Show data error
            else Data valid
                Service->>Repo: AddAsync(expense)
                activate Repo
                Repo->>DB: INSERT expenses
                activate DB
                DB->>DB: Trigger writes audit_logs
                DB-->>Repo: New expense ID
                deactivate DB
                Repo-->>Service: LedgerEntry
                deactivate Repo
                Service-->>API: Expense created
                API-->>Form: 201 Created
                Form->>Page: Close form and reload list
                Page-->>User: Show new expense entry
            end
        end
        deactivate Service
    end
    deactivate API
    deactivate Form
    deactivate Page
```

## 5. Soft-delete expense — `DELETE /api/v1/expenses/{id}`

```mermaid
sequenceDiagram
    actor User as User
    participant Page as Expense Page
    participant Dialog as Confirmation Dialog
    participant API as ExpensesController
    participant Service as LedgerService
    participant Repo as ILedgerRepository
    participant DB as PostgreSQL

    User->>Page: Select Delete Expense
    activate Page
    Page->>Dialog: Show delete confirmation
    activate Dialog

    alt User selects Cancel
        Dialog-->>Page: Close dialog
    else User confirms
        Dialog->>API: DELETE /api/v1/expenses/{id}
        activate API
        API->>Service: DeleteAsync(EXPENSE, id, actor)
        activate Service
        alt Employee or Viewer
            Service-->>API: Forbidden
            API-->>Dialog: 403 Forbidden
            Dialog-->>User: No permission to delete
        else Admin or Shop Owner
            Service->>Repo: GetAsync(EXPENSE, id)
            activate Repo
            Repo->>DB: SELECT active expense record
            activate DB
            DB-->>Repo: Record or null
            deactivate DB
            Repo-->>Service: LedgerEntry or null
            deactivate Repo
            alt Not found or already deleted
                Service-->>API: NotFound
                API-->>Dialog: 404 Not Found
            else Record found
                Service->>Repo: Update deletedAt and deletedBy
                activate Repo
                Repo->>DB: UPDATE expenses
                activate DB
                DB->>DB: Trigger writes audit_logs
                DB-->>Repo: Update succeeded
                deactivate DB
                Repo-->>Service: Completed
                deactivate Repo
                Service-->>API: Completed
                API-->>Dialog: 204 No Content
                Dialog->>Page: Close and reload list
                Page-->>User: Record disappears from active list
            end
        end
        deactivate Service
        deactivate API
    end
    deactivate Dialog
    deactivate Page
```

The endpoint uses HTTP `DELETE`, but the database only updates `deleted_at` and `deleted_by`; the record is not physically deleted.

## 6. Common error conventions

| HTTP | Meaning | Use case |
|---|---|---|
| `400` | Bad Request | Request or business data is invalid |
| `401` | Unauthorized | Token missing, invalid, or expired |
| `403` | Forbidden | Authenticated but lacks permission |
| `404` | Not Found | Does not exist or has been soft-deleted |
| `409` | Conflict | Duplicate data or business conflict |
| `500` | Internal Server Error | Unexpected error, returned with a trace ID |

Error responses use the RFC 7807 structure defined in the [OpenAPI contract](../../api/openapi.yaml).

**Related:** [Class diagrams](01-class-diagrams.md) · [General Runtime View](../arc42/06-runtime-view.md) · [Folder structure](../../07-folder-structure.md)
