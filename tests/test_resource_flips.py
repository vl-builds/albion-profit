from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
import main
import resource_flips as rf

NOW = datetime(2026, 9, 27, 12, tzinfo=timezone.utc)
META = [{'id': 'T4_WOOD', 'name': 'Troncos de Pinho', 'family': 'WOOD', 'tier': 4, 'enchantment': 0}]


def price(city, ask, bid, **extra):
    return dict(item_id='T4_WOOD', city=city, quality=1,
                sell_price_min=ask, buy_price_max=bid,
                sell_price_min_date=NOW.isoformat(), buy_price_max_date=NOW.isoformat(), **extra)


@pytest.mark.parametrize('buy,sell,capital,net', [
    ('direct', 'instant', 100, 84),
    ('direct', 'order', 106.25, 123.75),
    ('order', 'instant', 82, 102),
    ('order', 'order', 88.25, 141.75),
])
def test_tax_and_budget_for_each_execution_mode(buy, sell, capital, net):
    rows = rf.opportunities([price('Lymhurst', 100, 80), price('Fort Sterling', 250, 200)], META,
                            origin='Lymhurst', destination='FortSterling', buy_mode=buy, sell_mode=sell,
                            quantity=100, budget=1000, now=NOW)
    assert len(rows) == 1
    r = rows[0]
    assert r['quantity'] == int(1000 // capital)
    assert r['unit_profit'] == pytest.approx(net)
    assert r['capital'] <= 1000
    assert r['profit'] == pytest.approx(round(r['quantity'] * net, 2))


def test_same_city_requires_two_orders_and_premium_reduces_tax():
    raw = [price('Lymhurst', 200, 100)]
    assert not rf.opportunities(raw, META, now=NOW)
    normal = rf.opportunities(raw, META, now=NOW, buy_mode='order')[0]
    premium = rf.opportunities(raw, META, now=NOW, buy_mode='order', premium=True)[0]
    assert premium['unit_profit'] - normal['unit_profit'] == 8


@pytest.mark.parametrize('stamp,value', [
    ((NOW - timedelta(minutes=61)).isoformat(), 100),
    ((NOW + timedelta(minutes=1)).isoformat(), 100),
    ('0001-01-01T00:00:00', 100), ('invalid', 100),
    (NOW.isoformat(), float('nan')), (NOW.isoformat(), 0),
])
def test_invalid_and_expired_quotes_are_excluded(stamp, value):
    a = price('Lymhurst', 100, 80)
    a.update(sell_price_min=value, sell_price_min_date=stamp)
    assert not rf.opportunities([a, price('Thetford', 250, 200)], META,
                               origin='Lymhurst', now=NOW)


def test_black_market_and_nonresource_quality_are_excluded():
    a = price('Thetford', 250, 200)
    a['quality'] = 2
    assert not rf.opportunities([price('Lymhurst', 100, 80), a, price('Black Market', 300, 250)], META, now=NOW)


def test_naive_aodp_timestamp_is_returned_with_utc_zone_for_browser():
    row = price('Lymhurst', 100, 80)
    row['sell_price_min_date'] = '2026-09-27T11:59:00'
    assert rf.quote(row, 'sell', NOW, 60) == (100, '2026-09-27T11:59:00+00:00', 1.0)


def test_history_is_separate_by_destination_and_missing_is_unknown(monkeypatch):
    yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    class Response:
        def raise_for_status(self): pass
        def json(self):
            return [{'item_id': 'T4_WOOD', 'quality': 1, 'location': city,
                     'data': [{'timestamp': yesterday, 'item_count': count, 'avg_price': 100}]}
                    for city, count in [('Lymhurst', 200), ('Fort Sterling', 500)]]
    monkeypatch.setattr(rf, '_history_cache', {})
    monkeypatch.setattr(rf, 'reserve_request', lambda: None)
    monkeypatch.setattr(rf.httpx, 'get', lambda *a, **kw: Response())
    result = rf.history_by_city('Americas', ['T4_WOOD'])
    assert result[('T4_WOOD', 'FortSterling')]['units_per_reported_day'] == 500
    assert result[('T4_WOOD', 'Lymhurst')]['reported_days'] == 1
    assert result[('T4_WOOD', 'Thetford')]['units_per_reported_day'] is None


def test_endpoint_filtering_and_history_failure_preserve_prices(monkeypatch):
    called = []
    def prices(server, ids):
        called.extend(ids)
        raw = [price('Lymhurst', 100, 80), price('Thetford', 250, 200)]
        for row in raw:
            row['buy_price_max_date'] = row['sell_price_min_date'] = datetime.now(timezone.utc).isoformat()
        return raw
    def unavailable(*args): raise rf.AodpFetchError('Histórico indisponível')
    monkeypatch.setattr(rf, 'fetch_prices', prices)
    monkeypatch.setattr(rf, 'history_by_city', unavailable)
    client = TestClient(main.app)
    result = client.get('/api/resources/opportunities?family=WOOD&tier=4&enchantment=0').json()
    assert called == ['T4_WOOD']
    assert result['items'][0]['history'] is None
    assert result['history_error']
    assert client.get('/api/resources/opportunities?budget=-1').status_code == 422
    assert client.get('/api/resources/opportunities?destination=BlackMarket').status_code == 422
    assert client.get('/api/resources/opportunities?tier=2&enchantment=4').json()['queried'] == 0
