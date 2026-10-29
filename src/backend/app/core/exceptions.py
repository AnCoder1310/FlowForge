from fastapi import HTTPException

class AppException(HTTPException):
    def __init__(self, status_code: int, error_code: str, detail: str):
        super().__init__(status_code=status_code, detail=detail)
        self.error_code = error_code
        self.detail_message = detail

    @classmethod
    def validation(cls, message: str) -> "AppException":
        return cls(400, "VALIDATION_ERROR", message)

    @classmethod
    def unauthorized(cls, message: str = "Authentication is required.") -> "AppException":
        return cls(401, "UNAUTHORIZED", message)

    @classmethod
    def forbidden(cls, message: str = "You do not have permission to perform this action.") -> "AppException":
        return cls(403, "FORBIDDEN", message)

    @classmethod
    def not_found(cls, resource: str) -> "AppException":
        return cls(404, "NOT_FOUND", f"{resource} was not found.")

    @classmethod
    def conflict(cls, message: str) -> "AppException":
        return cls(409, "CONFLICT", message)
