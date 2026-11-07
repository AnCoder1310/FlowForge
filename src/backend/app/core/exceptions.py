from fastapi import HTTPException

class AppException(HTTPException):
    def __init__(self, status_code: int, error_code: str, detail: str, metadata: dict | None = None):
        super().__init__(status_code=status_code, detail=detail)
        self.error_code = error_code
        self.detail_message = detail
        self.metadata = metadata or {}

    @classmethod
    def validation(cls, message: str) -> "AppException":
        return cls(400, "VALIDATION_ERROR", message)

    @classmethod
    def circular_dependency(
        cls,
        message: str,
        *,
        cycle_nodes: list[str],
        blocked_nodes: list[str],
        processed_count: int,
        total_nodes: int,
    ) -> "AppException":
        return cls(
            400,
            "CIRCULAR_DEPENDENCY",
            message,
            {
                "cycleNodes": cycle_nodes,
                "blockedNodes": blocked_nodes,
                "processedCount": processed_count,
                "totalNodes": total_nodes,
            },
        )

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

    @classmethod
    def bad_gateway(cls, message: str) -> "AppException":
        return cls(502, "BAD_GATEWAY", message)

    @classmethod
    def service_unavailable(cls, message: str) -> "AppException":
        return cls(503, "SERVICE_UNAVAILABLE", message)

    @classmethod
    def gateway_timeout(cls, message: str) -> "AppException":
        return cls(504, "GATEWAY_TIMEOUT", message)
