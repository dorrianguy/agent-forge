"""
Agent Forge - Authentication & Authorization
API key-based authentication with rate limiting
"""

import os
import time
import hashlib
import secrets
from datetime import datetime
from typing import Dict, Any, Optional, Tuple
from functools import wraps
from collections import defaultdict
import logging

from fastapi import HTTPException, Request, Depends
from fastapi.security import APIKeyHeader

from . import database as db

logger = logging.getLogger('AgentForge.Auth')

# API Key header
API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=False)

# Rate limiting storage (in production, use Redis)
_rate_limits: Dict[str, list] = defaultdict(list)
_rate_limit_window = 60  # seconds


def hash_api_key(key: str) -> str:
    """Hash an API key for storage"""
    return hashlib.sha256(key.encode()).hexdigest()


def generate_api_key() -> Tuple[str, str]:
    """Generate a new API key and its ID"""
    key_id = f"afk_{secrets.token_hex(8)}"
    key_secret = secrets.token_urlsafe(32)
    full_key = f"{key_id}.{key_secret}"
    return full_key, key_id


def create_api_key(name: str, permissions: list = None) -> Dict[str, str]:
    """Create a new API key and store it"""
    full_key, key_id = generate_api_key()
    key_hash = hash_api_key(full_key)

    db.create_api_key(
        key_id=key_id,
        key_hash=key_hash,
        name=name,
        permissions=permissions or ['read', 'write']
    )

    logger.info(f'[Auth] Created API key: {key_id} for {name}')

    return {
        'key_id': key_id,
        'api_key': full_key,  # Only returned once at creation
        'name': name,
        'permissions': permissions or ['read', 'write']
    }


def validate_api_key(api_key: str) -> Optional[Dict[str, Any]]:
    """Validate an API key"""
    if not api_key:
        return None

    key_hash = hash_api_key(api_key)
    return db.validate_api_key(key_hash)


def check_rate_limit(key_id: str, limit: int = 100) -> bool:
    """Check if request is within rate limit"""
    now = time.time()
    window_start = now - _rate_limit_window

    # Clean old entries
    _rate_limits[key_id] = [t for t in _rate_limits[key_id] if t > window_start]

    # Check limit
    if len(_rate_limits[key_id]) >= limit:
        return False

    # Add current request
    _rate_limits[key_id].append(now)
    return True


def get_remaining_requests(key_id: str, limit: int = 100) -> int:
    """Get remaining requests in current window"""
    now = time.time()
    window_start = now - _rate_limit_window
    current_count = len([t for t in _rate_limits[key_id] if t > window_start])
    return max(0, limit - current_count)


class AuthResult:
    """Authentication result"""
    def __init__(self, authenticated: bool, key_data: Dict = None, error: str = None):
        self.authenticated = authenticated
        self.key_data = key_data or {}
        self.error = error
        self.key_id = key_data.get('id') if key_data else None
        self.permissions = key_data.get('permissions', []) if key_data else []


async def get_api_key_auth(
    request: Request,
    api_key: str = Depends(API_KEY_HEADER)
) -> AuthResult:
    """
    Dependency for API key authentication
    Returns AuthResult - endpoints decide how to handle unauthenticated requests
    """
    # Check for master key (for admin operations)
    master_key = os.environ.get('AGENT_FORGE_MASTER_KEY')
    if master_key and api_key == master_key:
        return AuthResult(
            authenticated=True,
            key_data={
                'id': 'master',
                'name': 'Master Key',
                'permissions': ['read', 'write', 'admin'],
                'rate_limit': 10000
            }
        )

    # No API key provided
    if not api_key:
        return AuthResult(authenticated=False, error="No API key provided")

    # Validate key
    key_data = validate_api_key(api_key)
    if not key_data:
        return AuthResult(authenticated=False, error="Invalid API key")

    # Check rate limit
    if not check_rate_limit(key_data['id'], key_data.get('rate_limit', 100)):
        return AuthResult(
            authenticated=True,
            key_data=key_data,
            error="Rate limit exceeded"
        )

    return AuthResult(authenticated=True, key_data=key_data)


def require_auth(permissions: list = None):
    """
    Decorator to require authentication on endpoints
    Usage: @require_auth(['write'])
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Get auth from kwargs (injected by FastAPI)
            auth: AuthResult = kwargs.get('auth')

            if not auth:
                raise HTTPException(status_code=500, detail="Auth dependency not injected")

            if not auth.authenticated:
                raise HTTPException(
                    status_code=401,
                    detail=auth.error or "Authentication required",
                    headers={"WWW-Authenticate": "ApiKey"}
                )

            if auth.error == "Rate limit exceeded":
                raise HTTPException(
                    status_code=429,
                    detail="Rate limit exceeded. Please try again later.",
                    headers={"Retry-After": str(_rate_limit_window)}
                )

            # Check permissions
            if permissions:
                for perm in permissions:
                    if perm not in auth.permissions:
                        raise HTTPException(
                            status_code=403,
                            detail=f"Permission denied. Required: {perm}"
                        )

            return await func(*args, **kwargs)
        return wrapper
    return decorator


def require_admin():
    """Decorator to require admin permission"""
    return require_auth(['admin'])


# ==================== Public Key Management Endpoints ====================

async def list_keys(auth: AuthResult = Depends(get_api_key_auth)) -> list:
    """List all API keys (admin only)"""
    if not auth.authenticated or 'admin' not in auth.permissions:
        raise HTTPException(status_code=403, detail="Admin access required")

    return db.list_api_keys()


async def revoke_key(key_id: str, auth: AuthResult = Depends(get_api_key_auth)) -> Dict:
    """Revoke an API key (admin only)"""
    if not auth.authenticated or 'admin' not in auth.permissions:
        raise HTTPException(status_code=403, detail="Admin access required")

    with db.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('UPDATE api_keys SET is_active = 0 WHERE id = ?', (key_id,))

        if cursor.rowcount > 0:
            logger.info(f'[Auth] Revoked API key: {key_id}')
            return {"success": True, "message": f"Key {key_id} revoked"}

    raise HTTPException(status_code=404, detail="API key not found")


# ==================== Bootstrap ====================

def ensure_master_key():
    """Ensure a master key exists (for initial setup)"""
    master_key = os.environ.get('AGENT_FORGE_MASTER_KEY')

    if not master_key:
        # Generate and log master key if not set
        generated_key = secrets.token_urlsafe(32)
        logger.warning(f'[Auth] No AGENT_FORGE_MASTER_KEY set. Generated temporary key: {generated_key}')
        logger.warning('[Auth] Set AGENT_FORGE_MASTER_KEY environment variable for production!')
        os.environ['AGENT_FORGE_MASTER_KEY'] = generated_key
        return generated_key

    return master_key


# Initialize on import
ensure_master_key()
