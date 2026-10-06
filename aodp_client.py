import time
from collections import deque
from threading import Lock

import httpx

CITIES = ["Caerleon", "Bridgewatch", "Lymhurst", "Martlock", "Thetford", "FortSterling"]
# The AODP API takes "BlackMarket" (no space) as the ?locations= query value,
# but every row it returns for that location has city == "Black Market" (with
# a space) — the two constants below are intentionally different strings.
BLACK_MARKET = "BlackMarket"
BLACK_MARKET_CITY = "Black Market"
LOCATIONS = CITIES + [BLACK_MARKET]

SERVER_HOSTS = {
    "Americas": "west.albion-online-data.com",
    "Europe": "europe.albion-online-data.com",
}

MAX_URL_LENGTH = 4000
CACHE_TTL_SECONDS = 60
_cache = {}
_fetch_lock = Lock()
_request_times = deque()
_rate_lock = Lock()


def reserve_request():
    """Shared budget for current prices and history, including concurrent requests."""
    with _rate_lock:
        tick = time.monotonic()
        while _request_times and tick - _request_times[0] >= 300:
            _request_times.popleft()
        if len(_request_times) >= 300 or sum(tick - t < 60 for t in _request_times) >= 180:
            raise AodpFetchError('Limite de consultas atingido. Aguarde um minuto e tente novamente.')
        _request_times.append(tick)


class AodpFetchError(Exception):
    pass


def _build_url(host, item_ids, locations):
    ids_part = ",".join(item_ids)
    locations_part = ",".join(locations)
    return f"https://{host}/api/v2/stats/prices/{ids_part}?locations={locations_part}"


def batch_item_ids(item_ids, host, locations, max_url_length=MAX_URL_LENGTH):
    batches = []
    current = []
    for item_id in item_ids:
        candidate = current + [item_id]
        if current and len(_build_url(host, candidate, locations)) > max_url_length:
            batches.append(current)
            current = [item_id]
        else:
            current = candidate
    if current:
        batches.append(current)
    return batches


def cache_timestamp(server, item_ids):
    cached = _cache.get((server, tuple(item_ids)))
    return cached[0] if cached else 0


def fetch_prices(server, item_ids):
    # Serialize scans to share cache and avoid duplicate concurrent requests.
    with _fetch_lock:
        return _fetch_prices(server, item_ids)


def _fetch_prices(server, item_ids):
    host = SERVER_HOSTS[server]
    cache_key = (server, tuple(item_ids))
    now = time.time()

    cached = _cache.get(cache_key)
    if cached and now - cached[0] < CACHE_TTL_SECONDS:
        return cached[1]

    rows = []
    for batch in batch_item_ids(item_ids, host, LOCATIONS):
        reserve_request()
        ids_part = ",".join(batch)
        url = f"https://{host}/api/v2/stats/prices/{ids_part}"
        try:
            response = httpx.get(url, params={"locations": ",".join(LOCATIONS)}, timeout=10.0)
            response.raise_for_status()
        except httpx.HTTPError as exc:
            if isinstance(exc, httpx.TimeoutException):
                message = 'O serviço de preços demorou demais para responder. Tente atualizar novamente.'
            elif isinstance(exc, (httpx.ConnectError, httpx.ProxyError)):
                message = 'Não foi possível conectar ao serviço de preços. Verifique a conexão e o proxy do ambiente em que a ferramenta foi iniciada.'
            elif isinstance(exc, httpx.HTTPStatusError):
                message = f'O serviço de preços retornou HTTP {exc.response.status_code}. Tente novamente em alguns instantes.'
            else:
                message = 'A conexão com o serviço de preços foi interrompida. Tente atualizar novamente.'
            raise AodpFetchError(message) from exc
        try:
            payload = response.json()
        except ValueError as exc:
            raise AodpFetchError('AODP returned invalid JSON') from exc
        if not isinstance(payload, list) or any(not isinstance(row, dict) for row in payload):
            raise AodpFetchError('AODP returned an invalid price list')
        rows.extend(payload)

    if len(_cache) >= 8:
        _cache.pop(next(iter(_cache)))
    _cache[cache_key] = (time.time(), rows)
    return rows
