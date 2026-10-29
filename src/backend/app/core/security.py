import base64
import hashlib
import hmac
import json
import os
import time
from typing import Optional
from app.config import settings

class PasswordService:
    @staticmethod
    def hash_password(password: str) -> str:
        salt = os.urandom(16)
        pwd_hash = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100_000, dklen=32)
        salt_b64 = base64.b64encode(salt).decode("utf-8")
        hash_b64 = base64.b64encode(pwd_hash).decode("utf-8")
        return f"{salt_b64}.{hash_b64}"

    @staticmethod
    def verify_password(stored_encoded: str, password: str) -> bool:
        parts = stored_encoded.split(".")
        if len(parts) != 2:
            return False
        try:
            salt = base64.b64decode(parts[0])
            expected_hash = base64.b64decode(parts[1])
            actual_hash = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100_000, dklen=32)
            return hmac.compare_digest(expected_hash, actual_hash)
        except Exception:
            return False

class TokenService:
    @staticmethod
    def _key() -> bytes:
        return settings.SIGNING_KEY.encode("utf-8")

    @classmethod
    def issue(cls, user_id: int, role: str, expires_in_seconds: Optional[int] = None) -> str:
        if expires_in_seconds is None:
            expires_in_seconds = settings.TOKEN_EXPIRE_MINUTES * 60
        expires_at = int(time.time()) + expires_in_seconds
        payload_dict = {
            "UserId": user_id,
            "Role": role,
            "ExpiresAt": expires_at
        }
        payload_bytes = json.dumps(payload_dict, separators=(",", ":")).encode("utf-8")
        payload_b64 = base64.b64encode(payload_bytes).decode("utf-8")
        
        sig = hmac.new(cls._key(), payload_b64.encode("utf-8"), hashlib.sha256).digest()
        sig_b64 = base64.b64encode(sig).decode("utf-8")
        return f"{payload_b64}.{sig_b64}"

    @classmethod
    def validate(cls, token: str) -> Optional[dict]:
        parts = token.split(".")
        if len(parts) != 2:
            return None
        payload_b64, sig_b64 = parts[0], parts[1]
        try:
            expected_sig = hmac.new(cls._key(), payload_b64.encode("utf-8"), hashlib.sha256).digest()
            actual_sig = base64.b64decode(sig_b64)
            if not hmac.compare_digest(expected_sig, actual_sig):
                return None
            
            payload_json = base64.b64decode(payload_b64).decode("utf-8")
            data = json.loads(payload_json)
            if data.get("ExpiresAt", 0) <= int(time.time()):
                return None
            return data
        except Exception:
            return None
