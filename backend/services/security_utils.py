import socket
from urllib.parse import urlparse
import ipaddress
import os
from cachetools import TTLCache
from fastapi import HTTPException



def sanitize_log(message: str) -> str:
    """Redacts sensitive environment variables from log messages."""
    if not message or not isinstance(message, str):
        return message
        
    sensitive_keys = [
        "SUPABASE_SERVICE_KEY",
        "SUPABASE_ANON_KEY",
        "GEMINI_API_KEY",
        "NVIDIA_API_KEY",
        "DB_PWD"
    ]
    
    sanitized = message
    for key in sensitive_keys:
        val = os.environ.get(key)
        if val and len(val) > 5: # Only redact if it's a significant string
            sanitized = sanitized.replace(val, f"[{key}_REDACTED]")
            
    return sanitized



def is_safe_url(url: str) -> bool:
    """
    Checks if a URL is safe to fetch from a server context.
    Blocks localhost, private IP ranges, and cloud metadata IPs.
    """
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ["http", "https"]:
            return False
            
        hostname = parsed.hostname
        if not hostname:
            return False
            
        # 1. Block literal localhost strings
        if hostname.lower() in ["localhost", "127.0.0.1", "0.0.0.0"]:
            return False
            
        # 2. Resolve hostname to IP to check for private ranges
        # This prevents "DNS Rebinding" and "Localhost Alias" bypasses
        try:
            ip = ipaddress.ip_address(socket.gethostbyname(hostname))
        except Exception:
            # If we can't resolve it, it's either invalid or an unusual format
            return False
            
        if ip.is_loopback:
            return False
        if ip.is_private:
            return False
        if ip.is_link_local:
            return False
        if ip.is_multicast:
            return False
            
        # 3. Specific block for Cloud Metadata IP (AWS/GCP/Azure)
        if str(ip) == "169.254.169.254":
            return False
            
        return True
    except Exception:
        return False
