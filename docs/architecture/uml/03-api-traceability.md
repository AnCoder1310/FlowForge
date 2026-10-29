# API Design Traceability

> Design status: TARGET V1 — key execution decisions accepted
>
> Implementation status: EXECUTABLE API BASELINE; named verification mapping remains in progress

Every OpenAPI operation maps to an owning module, Application service, authorization rule, and sequence pattern. This is the implementation index for Step 7.

| OpenAPI operation | Use case | Application owner | Authorization | Sequence |
|---|---|---|---|---|
| `login`, `logout` | UC01–02 | `IAuthService` | Public / authenticated | S01, S02 |
| `getDashboard` | UC03 | `IDashboardService` | All roles | S03 |
| `listIncomeCategories`, `listExpenseCategories` | UC04, UC08 | `ICategoryService` | All roles | S03 read pattern |
| `listIncomes`, `getIncome` | UC04 | `IIncomeService` | All roles | S03 read pattern |
| `createIncome`, `updateIncome`, `softDeleteIncome` | UC05–07 | `IIncomeService` | Write matrix + Employee ownership | Core sequences 2–3 and delete pattern |
| `listExpenses`, `getExpense` | UC08 | `IExpenseService` | All roles | S03 read pattern |
| `createExpense`, `updateExpense`, `softDeleteExpense` | UC09–11 | `IExpenseService` | Write matrix + Employee ownership | Core sequences 4–5 and update pattern |
| `previewImport`, `createImport`, `listImports`, `getImport` | UC12 | `IImportService` | Admin, Owner, Employee | S04–S05 |
| `getReport`, `exportReport` | UC13–14 | `IReportService` | Admin, Owner, Viewer | S06–S07 |
| `uploadIncomeAttachment`, `uploadExpenseAttachment`, `deleteAttachment` | UC05–06, UC09–10 | `IAttachmentService` | Transaction write + Employee ownership | S08 |
| `listAuditLogs` | UC15 | `IAuditService` | Admin, Owner | S03 read pattern |
| `listUsers`, `getUser`, `createUser`, `updateUser`, `updateUserStatus` | UC16 | `IUserService` | Admin | S09 |
| `getProfile`, `updateProfile`, `changePassword` | UC17 | `IProfileService` | All roles; self only | S10 |

## S01–S03 — Session and read-query patterns

S01 Login is defined in [core sequence diagrams](02-sequence-diagrams.md#1-login--post-apiv1authlogin).

```mermaid
sequenceDiagram
    actor User
    participant Web as ReactAuthService
    participant Api as AuthController
    participant Auth as AuthService
    User->>Web: Log out
    Web->>Api: POST /api/v1/auth/logout
    Api->>Auth: LogoutAsync(actor)
    Auth-->>Api: Completed
    Api-->>Web: 204 No Content
    Web->>Web: Remove access token and cached private data
    Web-->>User: Show Login
```

```mermaid
sequenceDiagram
    actor User
    participant Web as FeatureServiceJS
    participant Api as Controller
    participant App as QueryService
    participant Repo as ReadRepository
    participant Db as PostgreSQL
    User->>Web: Open page or change filters
    Web->>Api: GET resource with query and Bearer token
    alt Unauthenticated
        Api-->>Web: 401 ProblemDetails
    else Role forbidden
        Api-->>Web: 403 ProblemDetails
    else Authorized
        Api->>App: QueryAsync(filters, actor)
        App->>App: Validate filters
        alt Invalid range or paging
            App-->>Api: Validation errors
            Api-->>Web: 400 ValidationProblemDetails
        else Valid
            App->>Repo: Query active records
            Repo->>Db: Parameterized SELECT
            Db-->>Repo: Rows and totals
            Repo-->>App: Result
            App-->>Api: Response model
            Api-->>Web: 200 JSON
        end
    end
```

The read pattern applies to Dashboard, Categories, transaction lists/details, report JSON, import history, audit log, users, and profile. A missing detail record maps to `404`.

## S04–S05 — Import preview and atomic processing

> **Execution-model note:** V1 import is synchronous and atomic, limited to 10 MB/5,000 rows. The response represents the final result.

```mermaid
sequenceDiagram
    actor User as AdminOwnerEmployee
    participant Web as ImportServiceJS
    participant Api as ImportsController
    participant App as ImportService
    participant Guard as ImportValidator
    participant Parser as IExcelParser
    User->>Web: Select file and type
    Web->>Api: POST /api/v1/imports/preview
    Api->>App: PreviewAsync(file, type, actor)
    App->>Guard: Validate type, size, extension, signature
    alt Invalid file
        Guard-->>App: Errors
        App-->>Api: Validation failure
        Api-->>Web: 400 or 413 ProblemDetails
    else Valid file
        App->>Parser: ParseAsync(stream, type)
        Parser-->>App: Rows
        App->>Guard: Validate headers, fields, categories, conflicts
        App-->>Api: ImportPreview with row errors
        Api-->>Web: 200 ImportPreview
    end
```

```mermaid
sequenceDiagram
    actor User as AdminOwnerEmployee
    participant Api as ImportsController
    participant App as ImportService
    participant Parser as IExcelParser
    participant Batch as IImportBatchRepository
    participant Tx as ITransactionRepository
    participant Uow as IUnitOfWork
    participant Db as PostgreSQL
    User->>Api: POST /api/v1/imports
    Api->>App: ProcessAsync(file, type, actor)
    App->>Parser: Parse all rows
    App->>App: Apply authoritative ledger validators/business rules
    alt Any row invalid
        App->>Batch: Save FAILED batch and row errors
        App-->>Api: Failed ImportBatch
        Api-->>User: 200 final summary; importedRows=0
    else Every row valid
        App->>Uow: ExecuteAsync(actor.userId)
        Uow->>Db: BEGIN and SET LOCAL actor
        App->>Batch: Add PROCESSING batch
        App->>Tx: InsertImportedAsync(all rows, batchId)
        Tx->>Db: INSERT all transactions
        App->>Batch: Mark COMPLETED
        Uow->>Db: COMMIT
        App-->>Api: Completed ImportBatch
        Api-->>User: 200 final summary; importedRows=totalRows
    end
```

## S06–S07 — Report and export

```mermaid
sequenceDiagram
    actor User as AdminOwnerViewer
    participant Web as ReportServiceJS
    participant Api as ReportsController
    participant App as ReportService
    participant Repo as IFinancialReadRepository
    participant Exporter as IReportExporter
    participant Audit as IAuditLogRepository
    User->>Web: Select filters
    Web->>Api: GET /api/v1/reports
    Api->>App: GetAsync(query, actor)
    App->>Repo: GetReportAsync(query)
    Repo-->>App: USD ReportData
    App-->>Api: ReportResponse
    Api-->>Web: 200 JSON
    User->>Web: Export same filters
    Web->>Api: GET /api/v1/reports/export
    Api->>App: ExportAsync(query, format, actor)
    App->>Repo: GetReportAsync(query)
    App->>Exporter: ExportAsync(data, format)
    Exporter-->>App: File bytes and media type
    App->>Audit: Add EXPORT event
    App-->>Api: FileResult
    Api-->>Web: 200 PDF or XLSX
```

## S08 — Attachment upload/delete

```mermaid
sequenceDiagram
    actor User as AuthorizedWriter
    participant Api as AttachmentsController
    participant App as AttachmentService
    participant Tx as ITransactionRepository
    participant Policy as AttachmentPolicy
    participant Store as IFileStorage
    participant Repo as IAttachmentRepository
    User->>Api: Upload file for transaction
    Api->>App: UploadAsync(type, id, file, actor)
    App->>Tx: FindOwnerAsync(type, id)
    App->>Policy: EnsureCanModify(actor, owner)
    App->>App: Validate size, type, and signature
    App->>Store: SaveAsync(stream, generatedName)
    Store-->>App: StorageKey
    App->>Repo: AddAsync(metadata)
    alt Metadata write fails
        App->>Store: DeleteAsync(StorageKey)
        App-->>Api: 500 ProblemDetails
    else Success
        App-->>Api: Attachment
        Api-->>User: 201 JSON
    end
```

Delete performs the same ownership policy, removes metadata transactionally, then removes the stored object. A retry-safe cleanup job handles a storage deletion failure.

## S09 — Administrator user mutation

```mermaid
sequenceDiagram
    actor Admin
    participant Api as UsersController
    participant App as UserService
    participant Policy as UserPolicy
    participant Repo as IUserRepository
    participant Hash as IPasswordHasher
    participant Uow as IUnitOfWork
    Admin->>Api: Create, update, or change status
    Api->>App: CommandAsync(request, actor)
    App->>Policy: EnsureAdministrator(actor)
    App->>Repo: Check username and email conflicts
    alt Conflict
        App-->>Api: Conflict
        Api-->>Admin: 409 ProblemDetails
    else Valid
        opt New password supplied
            App->>Hash: Hash(password)
        end
        App->>Uow: Save user and audit atomically
        App-->>Api: Safe User response
        Api-->>Admin: 200 or 201 JSON
    end
```

## S10 — Self-service profile/password

```mermaid
sequenceDiagram
    actor User
    participant Api as ProfileController
    participant App as ProfileService
    participant Repo as IUserRepository
    participant Hash as IPasswordHasher
    User->>Api: Update profile or change password
    Api->>App: CommandAsync(request, actor)
    App->>Repo: FindAsync(actor.userId)
    alt Profile update
        App->>App: Map allowed name, phone, avatar fields only
        App->>Repo: UpdateAsync(user)
        App-->>Api: Safe User response
        Api-->>User: 200 JSON
    else Password change
        App->>Hash: Verify(currentPassword, passwordHash)
        alt Incorrect current password
            App-->>Api: Validation failure
            Api-->>User: 400 ProblemDetails
        else Correct
            App->>Hash: Hash(newPassword)
            App->>Repo: UpdateAsync(user)
            Api-->>User: 204 No Content
        end
    end
```

**Related:** [Core sequences](02-sequence-diagrams.md) · [All class diagrams](03-additional-class-diagrams.md) · [OpenAPI](../../api/openapi.yaml)

The cross-step requirement-to-screen-to-API-to-database mapping is maintained in [Master Traceability](../../traceability/master-traceability.md).
