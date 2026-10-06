import aodp_client
import pytest
from aodp_client import batch_item_ids, fetch_prices, AodpFetchError


@pytest.fixture(autouse=True)
def reset_request_limits(monkeypatch):
    from collections import deque
    monkeypatch.setattr(aodp_client, '_request_times', deque())


def test_cache_expires_after_one_minute(monkeypatch):
    clock = [1000]
    calls = []
    monkeypatch.setattr(aodp_client, '_cache', {})
    monkeypatch.setattr(aodp_client.time, 'time', lambda: clock[0])
    def get(*args, **kwargs):
        calls.append(1)
        return _FakeResponse([])
    monkeypatch.setattr(aodp_client.httpx, 'get', get)
    fetch_prices('Americas', ['T4_BAG'])
    clock[0] += 59
    fetch_prices('Americas', ['T4_BAG'])
    assert len(calls) == 1
    clock[0] += 1
    fetch_prices('Americas', ['T4_BAG'])
    assert len(calls) == 2
    assert aodp_client.cache_timestamp('Americas', ['T4_BAG']) == 1060


def test_invalid_api_payload_is_not_cached(monkeypatch):
    monkeypatch.setattr(aodp_client, '_cache', {})
    monkeypatch.setattr(aodp_client.httpx, 'get', lambda *a, **kw: _FakeResponse({'error': 'bad'}))
    with pytest.raises(AodpFetchError):
        fetch_prices('Americas', ['T4_BAG'])
    assert not aodp_client._cache


def test_rate_limit_stops_before_network_request(monkeypatch):
    from collections import deque
    monkeypatch.setattr(aodp_client, '_cache', {})
    monkeypatch.setattr(aodp_client, '_request_times', deque([aodp_client.time.monotonic()] * 180))
    monkeypatch.setattr(aodp_client.httpx, 'get', lambda *a, **kw: pytest.fail('Network call over limit'))
    with pytest.raises(AodpFetchError, match='Limite'):
        fetch_prices('Americas', ['T4_BAG'])


def test_batch_item_ids_keeps_all_ids_in_one_batch_when_short():
    ids = ["T4_BAG", "T5_BAG", "T6_BAG"]
    batches = batch_item_ids(ids, host="west.albion-online-data.com", locations=["Caerleon", "BlackMarket"])
    assert batches == [ids]


def test_batch_item_ids_splits_when_url_would_exceed_max_length():
    ids = ["T4_BAG", "T5_BAG", "T6_BAG", "T7_BAG"]
    # Force a tiny max length so every id lands in its own batch.
    batches = batch_item_ids(ids, host="west.albion-online-data.com", locations=["Caerleon"], max_url_length=60)
    assert batches == [["T4_BAG"], ["T5_BAG"], ["T6_BAG"], ["T7_BAG"]]
    # No id is dropped or duplicated.
    assert [i for batch in batches for i in batch] == ids


class _FakeResponse:
    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self):
        pass

    def json(self):
        return self._payload


@pytest.mark.parametrize('failure, message', [
    (aodp_client.httpx.ConnectError('connection refused'), 'proxy'),
    (aodp_client.httpx.ProxyError('proxy unavailable'), 'proxy'),
    (aodp_client.httpx.ReadTimeout('timeout'), 'demorou'),
    (aodp_client.httpx.HTTPStatusError('upstream error',
        request=aodp_client.httpx.Request('GET', 'https://example.com'),
        response=aodp_client.httpx.Response(429)), 'HTTP 429'),
])
def test_failure_explains_cause_and_preserves_cache(monkeypatch, failure, message):
    old_rows = [{'item_id': 'T4_BAG', 'sell_price_min_date': '2026-09-01T00:00:00'}]
    cached = {('Americas', ('T4_BAG',)): (1, old_rows)}
    monkeypatch.setattr(aodp_client, '_cache', cached.copy())
    def fail(*args, **kwargs):
        raise failure
    monkeypatch.setattr(aodp_client.httpx, 'get', fail)
    with pytest.raises(AodpFetchError, match=message):
        fetch_prices('Americas', ['T4_BAG'])
    assert aodp_client._cache == cached


def test_fetch_prices_returns_rows_from_all_batches(monkeypatch):
    calls = []

    def fake_get(url, params=None, timeout=None):
        calls.append((url, params))
        return _FakeResponse([{"item_id": "T4_BAG", "city": "Caerleon", "quality": 1}])

    monkeypatch.setattr(aodp_client, "_cache", {})
    monkeypatch.setattr(aodp_client.httpx, "get", fake_get)

    rows = fetch_prices("Americas", ["T4_BAG", "T5_BAG"])

    assert rows == [{"item_id": "T4_BAG", "city": "Caerleon", "quality": 1}]
    assert len(calls) == 1


def test_fetch_prices_uses_cache_on_second_call(monkeypatch):
    call_count = {"n": 0}

    def fake_get(url, params=None, timeout=None):
        call_count["n"] += 1
        return _FakeResponse([{"item_id": "T4_BAG", "city": "Caerleon", "quality": 1}])

    monkeypatch.setattr(aodp_client, "_cache", {})
    monkeypatch.setattr(aodp_client.httpx, "get", fake_get)

    fetch_prices("Americas", ["T4_BAG"])
    fetch_prices("Americas", ["T4_BAG"])

    assert call_count["n"] == 1


def test_fetch_prices_raises_aodp_fetch_error_on_http_failure(monkeypatch):
    import httpx as real_httpx

    def fake_get(url, params=None, timeout=None):
        raise real_httpx.ConnectError("boom", request=None)

    monkeypatch.setattr(aodp_client, "_cache", {})
    monkeypatch.setattr(aodp_client.httpx, "get", fake_get)

    try:
        fetch_prices("Americas", ["T4_BAG"])
        assert False, "expected AodpFetchError"
    except AodpFetchError:
        pass
