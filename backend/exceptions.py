from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from services.security_utils import sanitize_log
import logging

logger = logging.getLogger("mindhive")

class MindHiveException(Exception):
    """Base class for all MindHive exceptions"""
    def __init__(self, message: str, status_code: int = 500, detail: str = None):
        self.message = message
        self.status_code = status_code
        self.detail = detail or message
        super().__init__(self.message)

class DocumentProcessingError(MindHiveException):
    def __init__(self, message: str = "Error processing document"):
        super().__init__(message, status_code=500)

class DatabaseError(MindHiveException):
    def __init__(self, message: str = "Database operation failed"):
        super().__init__(message, status_code=503)

class AIServiceError(MindHiveException):
    def __init__(self, message: str = "AI service is currently unavailable"):
        super().__init__(message, status_code=502)

class UnauthorizedError(MindHiveException):
    def __init__(self, message: str = "Unauthorized access"):
        super().__init__(message, status_code=401)

class NotFoundError(MindHiveException):
    def __init__(self, message: str = "Resource not found"):
        super().__init__(message, status_code=404)

async def mindhive_exception_handler(request: Request, exc: MindHiveException):
    """Unified handler for all MindHiveExceptions"""
    # Log the error using our security-safe utility
    error_msg = f"[{request.method} {request.url.path}] {exc.message}"
    if exc.status_code >= 500:
        print(sanitize_log(f"CRITICAL: {error_msg}"))
    else:
        print(sanitize_log(f"WARNING: {error_msg}"))

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "error",
            "message": exc.message,
            "detail": exc.detail,
            "path": request.url.path
        }
    )

async def generic_exception_handler(request: Request, exc: Exception):
    """Fallback handler for unexpected system errors"""
    error_msg = f"UNHANDLED ERROR: [{request.method} {request.url.path}] {str(exc)}"
    print(sanitize_log(error_msg))
    
    return JSONResponse(
        status_code=500,
        content={
            "status": "error",
            "message": "An internal system error occurred",
            "detail": "Our team has been notified.",
            "path": request.url.path
        }
    )
