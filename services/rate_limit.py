import time
from collections import deque

_MAX_CALLS_PER_MINUTE = 10
_timestamps: deque[float] = deque()


def allow_groq_call() -> bool:
    now = time.monotonic()
    while _timestamps and now - _timestamps[0] > 60:
        _timestamps.popleft()
    if len(_timestamps) >= _MAX_CALLS_PER_MINUTE:
        return False
    _timestamps.append(now)
    return True
