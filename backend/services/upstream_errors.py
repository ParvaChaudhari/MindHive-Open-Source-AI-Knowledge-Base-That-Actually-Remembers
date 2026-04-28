class UpstreamServiceUnavailable(Exception):
    """
    Raised when an upstream dependency (Gemini) is overloaded/unavailable (e.g. HTTP 503).
    Routes should map this to a friendly 503 response.
    """


class UpstreamDailyQuotaReached(Exception):
    """
    Raised when Gemini daily quota is exhausted.
    Routes should map this to a friendly message (typically HTTP 429).
    """

