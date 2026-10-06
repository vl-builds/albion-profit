from datetime import datetime, timedelta, timezone
import httpx
import pytest
from fastapi.testclient import TestClient
import main
import liquidity
from aodp_client import AodpFetchError

NOW = datetime(2026, 9, 20, tzinfo=timezone.utc)


def history(quality=1, missing=(), count=100):
    return {'location':'Black Market', 'item_id':'T5_ARMOR_PLATE_SET1', 'quality':quality,
            'data':[{'timestamp':(NOW-timedelta(days=i)).isoformat(), 'item_count':count, 'avg_price':18000}
                    for i in range(1,8) if i not in missing]}


def stats(rows):
    return liquidity.summarize_history(rows, ['T5_ARMOR_PLATE_SET1'], NOW)['items']


def test_frequency_coverage_and_quality_are_independent():
    a,b = stats([history(), history(2, missing=(1,2,3))])[:2]
    assert a['frequent'] and a['reported_units'] == 700
    assert a['units_per_reported_day'] == 100 and a['weighted_price'] == 18000
    assert a['price_cv_pct'] == 0
    assert b['status'] == 'insufficient' and not b['frequent']
    assert b['reported_days'] == 4 and b['units_per_reported_day'] == 100
    assert stats([])[0]['reported_units'] is None


def test_duplicates_other_markets_and_current_day_do_not_inflate_volume():
    row = history()
    row['data'] += [row['data'][0], {'timestamp':NOW.isoformat(),'item_count':99999,'avg_price':1}]
    result = stats([row, row, {**history(),'location':'Caerleon'}])[0]
    assert result['reported_units'] == 700 and result['reported_days'] == 7


def test_no_sales_differs_from_missing_and_old_history_is_not_frequent():
    zero = stats([history(count=0)])[0]
    assert zero['reported_units'] == 0 and zero['status'] == 'sufficient'
    assert not zero['frequent'] and zero['weighted_price'] is None
    old = history(missing=(1,2))
    assert stats([old])[0]['status'] == 'insufficient'


def test_bad_points_are_unknown_and_weighted_price_uses_units():
    row = history(missing=(1,2,3,4,5))
    row['data'][0].update(item_count=1, avg_price=100)
    row['data'][1].update(item_count=3, avg_price=200)
    row['data'] += [{'timestamp':'bad'}, {'timestamp':NOW.isoformat(),'item_count':float('nan'),'avg_price':1}]
    result = stats([row])[0]
    assert result['weighted_price'] == 175 and result['price_cv_pct'] > 0


def test_history_cache_is_per_server_item_and_failure_is_not_zero(monkeypatch):
    liquidity._cache.clear()
    calls = []
    def get(url, **kwargs):
        calls.append(url)
        return httpx.Response(200, json=[history()], request=httpx.Request('GET',url))
    monkeypatch.setattr(liquidity.httpx,'get', get)
    monkeypatch.setattr(liquidity,'reserve_request',lambda:None)
    liquidity.fetch_liquidity('Americas',['T5_ARMOR_PLATE_SET1'])
    liquidity.fetch_liquidity('Americas',['T5_ARMOR_PLATE_SET1'])
    liquidity.fetch_liquidity('Europe',['T5_ARMOR_PLATE_SET1'])
    assert len(calls) == 2
    def fail(*args, **kwargs): raise httpx.ConnectError('offline')
    monkeypatch.setattr(liquidity.httpx,'get',fail)
    with pytest.raises(AodpFetchError): liquidity.fetch_liquidity('Americas',['T4_BAG'])
    liquidity._cache.clear()


def test_history_endpoint_validates_ids_and_preserves_upstream_failure(monkeypatch):
    client = TestClient(main.app)
    assert client.get('/api/liquidity',params={'item_ids':'not-an-item'}).status_code == 422
    def fail(*args): raise AodpFetchError('offline')
    monkeypatch.setattr(main,'fetch_liquidity',fail)
    assert client.get('/api/liquidity',params={'item_ids':'T4_BAG'}).status_code == 502


def test_price_series_is_chronological_and_does_not_invent_missing_or_zero_sale_days():
    row = history(missing=(3, 5))
    row['data'][0].update(item_count=0, avg_price=0)
    row['data'] += [row['data'][1], {'timestamp': NOW.isoformat(), 'item_count': 50, 'avg_price': 5}]
    series = stats([row, row])[0]['price_history']
    assert [p['date'] for p in series] == ['2026-09-13', '2026-09-14', '2026-09-16', '2026-09-18']
    assert all(p['avg_price'] == 18000 and p['item_count'] == 100 for p in series)
    assert stats([])[0]['price_history'] == []
    assert stats([history(count=0)])[0]['price_history'] == []


def test_liquid_filter_rejects_spikes_missing_and_inactive_days():
    normal = stats([history()])[0]
    assert normal['liquid'] and normal['suggested_qty_limit'] == 10
    assert normal['median_daily_units'] == 100
    spike = history(count=1)
    spike['data'][0]['item_count'] = 10000
    assert not stats([spike])[0]['liquid']
    partial = stats([history(missing=(3, 4), count=10)])[0]
    assert partial['frequent'] and not partial['liquid']
    assert stats([])[0]['suggested_qty_limit'] == 0
    inactive = history(count=100)
    for point in inactive['data'][:3]:
        point['item_count'] = 0
    assert not stats([inactive])[0]['liquid']


def test_liquid_cap_uses_full_window_and_median():
    row = history(missing=(3, 4), count=100)
    row['data'][0]['item_count'] = 10000
    result = stats([row])[0]
    assert result['liquid'] and result['suggested_qty_limit'] == 10
    assert stats([history(missing=(3, 4), count=100)])[0]['suggested_qty_limit'] == 7


def test_daily_sales_preserves_missing_zero_and_deduplicated_days():
    row = history(missing=(2,))
    row['data'][0]['item_count'] = 0
    result = stats([row, row])[0]
    daily = result['daily_sales']
    assert len(daily) == 7
    assert daily[0] == {'date': '2026-09-13', 'item_count': 100}
    assert daily[-2] == {'date': '2026-09-18', 'item_count': None}
    assert daily[-1] == {'date': '2026-09-19', 'item_count': 0}
    assert sum(d['item_count'] or 0 for d in daily) == result['reported_units']
