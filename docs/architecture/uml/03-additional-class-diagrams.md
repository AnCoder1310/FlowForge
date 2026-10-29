# Class Diagrams — Remaining V1 Modules

> Design status: TARGET V1
>
> Implementation status: TARGET DESIGN with executable backend baseline; production adapters remain

These diagrams complete the class-level design beyond Authentication, Income, and Expense. Names map directly to the target folders and OpenAPI `operationId` values.

## Dashboard, Categories, and Reports

```mermaid
classDiagram
    direction LR
    class DashboardController { +GetAsync(DashboardQueryRequest, CancellationToken) Task }
    class CategoriesController { +ListIncomeAsync(CancellationToken) Task +ListExpenseAsync(CancellationToken) Task }
    class ReportsController { +GetAsync(ReportQueryRequest, CancellationToken) Task +ExportAsync(ReportQueryRequest, ExportFormat, CancellationToken) Task }
    class IDashboardService { <<interface>> +GetAsync(DateRange, ActorContext, CancellationToken) Task }
    class ICategoryService { <<interface>> +ListIncomeAsync(CancellationToken) Task +ListExpenseAsync(CancellationToken) Task }
    class IReportService { <<interface>> +GetAsync(ReportQuery, ActorContext, CancellationToken) Task +ExportAsync(ReportQuery, ExportFormat, ActorContext, CancellationToken) Task }
    class DashboardService
    class CategoryService
    class ReportService
    class IFinancialReadRepository { <<interface>> +GetDashboardAsync(DateRange, CancellationToken) Task +GetReportAsync(ReportQuery, CancellationToken) Task }
    class ICategoryRepository { <<interface>> +ListActiveIncomeAsync(CancellationToken) Task +ListActiveExpenseAsync(CancellationToken) Task +ExistsAsync(CategoryType, long, CancellationToken) Task }
    class IReportExporter { <<interface>> +ExportAsync(ReportData, ExportFormat, CancellationToken) Task }
    class IAuditLogRepository { <<interface>> +AddAsync(AuditLog, CancellationToken) Task }
    class FinancialReadRepository
    class CategoryRepository
    class PdfReportExporter
    class XlsxReportExporter

    DashboardController --> IDashboardService
    CategoriesController --> ICategoryService
    ReportsController --> IReportService
    DashboardService ..|> IDashboardService
    CategoryService ..|> ICategoryService
    ReportService ..|> IReportService
    DashboardService --> IFinancialReadRepository
    ReportService --> IFinancialReadRepository
    ReportService --> IReportExporter
    ReportService --> IAuditLogRepository
    CategoryService --> ICategoryRepository
    FinancialReadRepository ..|> IFinancialReadRepository
    CategoryRepository ..|> ICategoryRepository
    PdfReportExporter ..|> IReportExporter
    XlsxReportExporter ..|> IReportExporter
```

Dashboard and reports query only active USD records. Export first obtains the same `ReportData` used by the JSON report, then selects the requested exporter and writes an `EXPORT` audit event.

## Imports and Attachments

```mermaid
classDiagram
    direction LR
    class ImportsController { +PreviewAsync(IFormFile, ImportType, CancellationToken) Task +ListAsync(ImportQueryRequest, CancellationToken) Task +CreateAsync(IFormFile, ImportType, CancellationToken) Task +GetAsync(long, CancellationToken) Task }
    class AttachmentsController { +UploadIncomeAsync(long, IFormFile, CancellationToken) Task +UploadExpenseAsync(long, IFormFile, CancellationToken) Task +DeleteAsync(long, CancellationToken) Task }
    class IImportService { <<interface>> +PreviewAsync(ImportFile, ImportType, ActorContext, CancellationToken) Task +ListAsync(ImportQuery, ActorContext, CancellationToken) Task +ProcessAsync(ImportFile, ImportType, ActorContext, CancellationToken) Task +GetAsync(long, ActorContext, CancellationToken) Task }
    class IAttachmentService { <<interface>> +UploadAsync(TransactionType, long, FileInput, ActorContext, CancellationToken) Task +DeleteAsync(long, ActorContext, CancellationToken) Task }
    class ImportService
    class AttachmentService
    class IExcelParser { <<interface>> +ParseAsync(Stream, ImportType, CancellationToken) Task }
    class IFileStorage { <<interface>> +SaveAsync(Stream, SafeFileName, CancellationToken) Task +DeleteAsync(StorageKey, CancellationToken) Task }
    class IImportBatchRepository { <<interface>> +ListAsync(ImportQuery, CancellationToken) Task +FindAsync(long, CancellationToken) Task +AddAsync(ImportBatch, CancellationToken) Task +UpdateAsync(ImportBatch, CancellationToken) Task }
    class IAttachmentRepository { <<interface>> +FindAsync(long, CancellationToken) Task +AddAsync(Attachment, CancellationToken) Task +RemoveAsync(Attachment, CancellationToken) Task }
    class ITransactionRepository { <<interface>> +FindOwnerAsync(TransactionType, long, CancellationToken) Task +InsertImportedAsync(ParsedWorkbook, long, CancellationToken) Task }
    class IUnitOfWork { <<interface>> +ExecuteAsync(long, Func, CancellationToken) Task }
    class ImportValidator
    class AttachmentPolicy
    class NpoiExcelParser
    class LocalFileStorage

    ImportsController --> IImportService
    AttachmentsController --> IAttachmentService
    ImportService ..|> IImportService
    AttachmentService ..|> IAttachmentService
    ImportService --> IExcelParser
    ImportService --> ImportValidator
    ImportService --> IImportBatchRepository
    ImportService --> ITransactionRepository
    ImportService --> IUnitOfWork
    AttachmentService --> AttachmentPolicy
    AttachmentService --> IAttachmentRepository
    AttachmentService --> ITransactionRepository
    AttachmentService --> IFileStorage
    NpoiExcelParser ..|> IExcelParser
    LocalFileStorage ..|> IFileStorage
```

The import service parses before the write transaction and commits every validated transaction plus the completed batch atomically. A failed batch stores errors but no imported transactions. Attachment metadata and file operations are coordinated so failed metadata writes remove newly stored files.

### Import validation collaboration

**Status:** ACCEPTED

`ImportService` reuses the authoritative Application income/expense validators and business-rule abstractions before using batch persistence. `ImportService → ITransactionRepository` is persistence orchestration only and never permission to bypass ledger rules.

## Audit, Users, and Profile

```mermaid
classDiagram
    direction LR
    class AuditLogsController { +ListAsync(AuditQueryRequest, CancellationToken) Task }
    class UsersController { +ListAsync(UserQueryRequest, CancellationToken) Task +GetAsync(long, CancellationToken) Task +CreateAsync(CreateUserRequest, CancellationToken) Task +UpdateAsync(long, UpdateUserRequest, CancellationToken) Task +UpdateStatusAsync(long, UpdateUserStatusRequest, CancellationToken) Task }
    class ProfileController { +GetAsync(CancellationToken) Task +UpdateAsync(UpdateProfileRequest, CancellationToken) Task +ChangePasswordAsync(ChangePasswordRequest, CancellationToken) Task }
    class IAuditService { <<interface>> +ListAsync(AuditQuery, ActorContext, CancellationToken) Task }
    class IUserService { <<interface>> +ListAsync(UserQuery, ActorContext, CancellationToken) Task +GetAsync(long, ActorContext, CancellationToken) Task +CreateAsync(UserDraft, ActorContext, CancellationToken) Task +UpdateAsync(long, UserDraft, ActorContext, CancellationToken) Task +UpdateStatusAsync(long, bool, ActorContext, CancellationToken) Task }
    class IProfileService { <<interface>> +GetAsync(ActorContext, CancellationToken) Task +UpdateAsync(ProfileDraft, ActorContext, CancellationToken) Task +ChangePasswordAsync(PasswordChange, ActorContext, CancellationToken) Task }
    class AuditService
    class UserService
    class ProfileService
    class IUserRepository { <<interface>> +ListAsync(UserQuery, CancellationToken) Task +FindAsync(long, CancellationToken) Task +FindByEmailAsync(string, CancellationToken) Task +AddAsync(AppUser, CancellationToken) Task +UpdateAsync(AppUser, CancellationToken) Task }
    class IAuditLogRepository { <<interface>> +ListAsync(AuditQuery, CancellationToken) Task +AddAsync(AuditLog, CancellationToken) Task }
    class IPasswordHasher { <<interface>> +Hash(string) string +Verify(string, string) bool }
    class UserPolicy
    class UserValidator
    class ProfileValidator
    class UserRepository
    class AuditLogRepository

    AuditLogsController --> IAuditService
    UsersController --> IUserService
    ProfileController --> IProfileService
    AuditService ..|> IAuditService
    UserService ..|> IUserService
    ProfileService ..|> IProfileService
    AuditService --> IAuditLogRepository
    UserService --> IUserRepository
    UserService --> UserPolicy
    UserService --> UserValidator
    UserService --> IPasswordHasher
    ProfileService --> IUserRepository
    ProfileService --> ProfileValidator
    ProfileService --> IPasswordHasher
    UserRepository ..|> IUserRepository
    AuditLogRepository ..|> IAuditLogRepository
```

`UserPolicy` permits only `ADMIN`. Profile mapping exposes no role/status mutation. Password hashes are write-only infrastructure values and never appear in an API response.

**Related:** [Core class diagrams](01-class-diagrams.md) · [OpenAPI](../../api/openapi.yaml) · [Folder structure](../../07-folder-structure.md)
