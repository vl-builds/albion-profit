import asyncio
import json
from datetime import datetime, timezone
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

import main
from live_prices import LivePrices, iso, RETENTION_SECONDS
from flip_calculator import compute_city_opportunities

NOW = 1789800000


def order(**changes):
    return json.dumps({'Id': 1, 'ItemTypeId': 'T4_BAG', 'LocationId': 1002,
                       'QualityLevel': 1, 'EnchantmentLevel': 0, 'UnitPriceSilver': 1000,
                       'Amount': 2, 'AuctionType': 'offer', 'Expires': iso(NOW + 3600), **changes})


@pytest.fixture
def live():
    clock = [NOW]
    service = LivePrices(['T4_BAG', 'T4_BAG@1'], clock=lambda: clock[0])
    return service, clock


def test_live_pair_uses_silver_without_rescaling_and_isolates_server_and_quality(live):
    service, _ = live
    assert service.ingest('Americas', order())
    assert service.ingest('Americas', order(Id=2, LocationId=3003, AuctionType='request', UnitPriceSilver=1500))
    rows, state = service.snapshot('Americas', ['T4_BAG'], 'Lymhurst')
    result = compute_city_opportunities(rows, {}, 8, 60, 'Lymhurst', now=datetime.fromtimestamp(NOW, timezone.utc))
    assert result[0]['profit'] == 380
    assert result[0]['city_price_source'] == 'live'
    assert result[0]['bm_price_source'] == 'live'
    assert not service.snapshot('Europe', ['T4_BAG'])[0]
    assert service.ingest('Europe', order(QualityLevel=2))
    assert service.ingest('Europe', order(Id=2, QualityLevel=1, LocationId=3003, AuctionType='request'))
    assert not compute_city_opportunities(service.snapshot('Europe', ['T4_BAG'])[0], {}, 8, 60, 'Lymhurst')


def test_update_same_order_replaces_old_price_and_zero_removes_it(live):
    service, clock = live
    service.ingest('Americas', order())
    clock[0] += 2
    service.ingest('Americas', order(UnitPriceSilver=1200))
    rows, _ = service.snapshot('Americas', ['T4_BAG'])
    assert len(rows) == 1 and rows[0]['sell_price_min'] == 1200
    assert len(service.orders['Americas']) == 1
    service.ingest('Americas', order(Amount=0))
    assert not service.snapshot('Americas', ['T4_BAG'])[0]


def test_best_recent_order_expires_without_renewing_old_api_price(live):
    service, clock = live
    rest = {'item_id': 'T4_BAG', 'quality': 1, 'city': 'Lymhurst',
            'sell_price_min': 900, 'sell_price_min_date': iso(NOW - 30), 'buy_price_max': 0}
    service.seed('Americas', [rest])
    service.ingest('Americas', order())
    service.ingest('Americas', order(Id=2, UnitPriceSilver=1100))
    rows, _ = service.snapshot('Americas', ['T4_BAG'])
    assert rows[0]['sell_price_min'] == 1000
    clock[0] += RETENTION_SECONDS
    rows, _ = service.snapshot('Americas', ['T4_BAG'])
    assert rows == [rest]
    assert not service.orders['Americas']


def test_older_rest_seed_never_overwrites_newer_observation(live):
    service, _ = live
    rest = {'item_id': 'T4_BAG', 'quality': 1, 'city': 'Lymhurst',
            'sell_price_min': 900, 'sell_price_min_date': iso(NOW), 'buy_price_max': 0}
    service.seed('Americas', [rest])
    service.seed('Americas', [{**rest, 'sell_price_min': 10, 'sell_price_min_date': iso(NOW - 50)}])
    assert service.snapshot('Americas', ['T4_BAG'])[0] == [rest]


def test_old_cheaper_order_does_not_hide_fresh_order_with_short_age_filter(live):
    service, clock = live
    service.ingest('Americas', order())
    clock[0] += 120
    service.ingest('Americas', order(Id=2, UnitPriceSilver=1100))
    rows, _ = service.snapshot('Americas', ['T4_BAG'], max_age_min=1)
    assert rows[0]['sell_price_min'] == 1100
    assert service.snapshot('Americas', ['T4_BAG'], max_age_min=10)[0][0]['sell_price_min'] == 1100


@pytest.mark.parametrize('changes', [
    {'LocationId': 3005, 'AuctionType': 'request'},  # Caerleon normal is not BM
    {'LocationId': 5003}, {'QualityLevel': 6}, {'QualityLevel': True},
    {'EnchantmentLevel': 1}, {'UnitPriceSilver': -1}, {'UnitPriceSilver': float('nan')},
    {'Amount': -1}, {'ItemTypeId': 'T4_TOOL_PICK'}, {'Expires': 'bad'},
])
def test_invalid_or_irrelevant_orders_are_ignored(live, changes):
    service, _ = live
    assert not service.ingest('Americas', order(**changes))
    assert not service.snapshot('Americas', ['T4_BAG'])[0]


def test_expired_orders_and_malformed_messages_do_not_break_stream(live):
    service, _ = live
    for message in [b'not-json', b'[]', b'{}', b'null']:
        assert not service.ingest('Americas', message)
    service.ingest('Americas', order(Expires=iso(NOW - 1)))
    assert not service.snapshot('Americas', ['T4_BAG'])[0]


def test_memory_bound_discards_oldest_order(live, monkeypatch):
    import live_prices
    service, _ = live
    monkeypatch.setattr(live_prices, 'MAX_ORDERS', 2)
    for i in [1, 2, 3]:
        service.ingest('Americas', order(Id=i))
    assert list(service.orders['Americas']) == [2, 3]


def test_rest_endpoint_live_toggle_and_cargo_agree(live, monkeypatch):
    service, _ = live
    monkeypatch.setattr(main, 'LIVE', service)
    date = iso(NOW - 20)
    raw = [{'item_id': 'T4_BAG', 'quality': 1, 'city': city,
            'sell_price_min': sell, 'sell_price_min_date': date,
            'buy_price_max': buy, 'buy_price_max_date': date}
           for city, sell, buy in [('Lymhurst', 1000, 0), ('Black Market', 0, 1500)]]
    monkeypatch.setattr(main, 'fetch_prices', lambda *args: raw)
    service.ingest('Americas', order(UnitPriceSilver=1100))
    client = TestClient(main.app)
    params = {'city': 'Lymhurst', 'family': 'Bolsas', 'tier': 4, 'enchantment': 0, 'max_age_min': 999999}
    rest = client.get('/api/opportunities', params=params).json()[0]
    mixed = client.get('/api/opportunities', params={**params, 'live': True}).json()[0]
    plan = client.get('/api/cargo-plan', params={**params, 'live': True, 'budget': 2000, 'available_weight': 20}).json()
    assert rest['city_price'] == 1000
    assert mixed['city_price'] == 1100
    assert plan['items'][0]['unit_cost'] == 1100
    assert plan['items'][0]['city_price_source'] == 'live'
    assert raw[0]['sell_price_min'] == 1000


def test_sse_emits_selected_server_then_cleans_up(live, monkeypatch):
    service, _ = live
    monkeypatch.setattr(main, 'LIVE', service)
    service.set_state('Europe', 'connected')
    service.ingest('Europe', order())
    class Request:
        async def is_disconnected(self):
            return False
    async def check():
        response = await main.live_stream(Request(), server='Europe', city=main.TransportOrigin.Lymhurst,
                                         premium=False, max_age_min=60, family=None, tier=4, enchantment=0)
        event = await anext(response.body_iterator)
        payload = json.loads(event.removeprefix('data: '))
        assert payload['server'] == 'Europe'
        assert payload['status']['state'] == 'connected'
        assert payload['status']['received'] == 1
        await response.body_iterator.aclose()
    asyncio.run(check())


def test_app_lifespan_starts_and_stops_connections(monkeypatch):
    start, stop = AsyncMock(), AsyncMock()
    monkeypatch.setattr(main.LIVE, 'start', start)
    monkeypatch.setattr(main.LIVE, 'stop', stop)
    with TestClient(main.app) as client:
        assert client.get('/api/catalog').status_code == 200
    start.assert_awaited_once()
    stop.assert_awaited_once()


def test_connection_retries_and_closes_on_cancellation(monkeypatch):
    import live_prices
    clients = []
    original_sleep = asyncio.sleep
    async def scenario():
        ready = asyncio.Event()
        class Client:
            def __init__(self):
                self.is_connected = False
                self.closed = False
                self.subject = None
                clients.append(self)
            async def connect(self, **kwargs):
                if len(clients) == 1:
                    raise OSError('offline')
                self.is_connected = True
            async def subscribe(self, subject, **kwargs):
                self.subject = subject
            async def flush(self, **kwargs):
                ready.set()
            async def close(self):
                self.closed = True
                self.is_connected = False
        async def fast_sleep(delay):
            await original_sleep(0)
        monkeypatch.setattr(live_prices.nats.aio.client, 'Client', Client)
        monkeypatch.setattr(live_prices.asyncio, 'sleep', fast_sleep)
        service = LivePrices(['T4_BAG'])
        task = asyncio.create_task(service._run('Americas'))
        await asyncio.wait_for(ready.wait(), timeout=1)
        assert service.states['Americas']['state'] == 'connected'
        task.cancel()
        await asyncio.gather(task, return_exceptions=True)
        assert len(clients) == 2
        assert all(c.closed for c in clients)
        assert clients[-1].subject == 'marketorders.deduped'
        assert not service.clients
    asyncio.run(scenario())


def test_newer_lower_bm_observation_replaces_old_high_price(live):
    service, clock = live
    service.ingest('Americas', order(Id=1, LocationId=3003, AuctionType='request', UnitPriceSilver=17696))
    clock[0] += 15
    service.ingest('Americas', order(Id=2, LocationId=3003, AuctionType='request', UnitPriceSilver=9480))
    rows, _ = service.snapshot('Americas', ['T4_BAG'], max_age_min=60)
    assert rows[0]['buy_price_max'] == 9480
    assert rows[0]['buy_price_max_date'] == iso(NOW+15)
