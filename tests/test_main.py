from datetime import datetime, timezone
import pytest

from fastapi.testclient import TestClient

import main
from aodp_client import AodpFetchError


def _sample_raw_prices():
    now_iso = datetime.now(timezone.utc).isoformat()
    return [
        {
            "item_id": "T4_BAG", "city": "Caerleon", "quality": 1,
            "sell_price_min": 1000, "sell_price_min_date": now_iso,
            "buy_price_max": 0, "buy_price_max_date": now_iso,
        },
        {
            "item_id": "T4_BAG", "city": "Black Market", "quality": 1,
            "sell_price_min": 0, "sell_price_min_date": now_iso,
            "buy_price_max": 1500, "buy_price_max_date": now_iso,
        },
    ]


def test_opportunities_endpoint_returns_calculated_list(monkeypatch):
    monkeypatch.setattr(main, "fetch_prices", lambda server, item_ids: _sample_raw_prices())

    client = TestClient(main.app)
    response = client.get("/api/opportunities", params={"server": "Americas", "max_age_min": 999999})

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["item_id"] == "T4_BAG"
    assert body[0]["tax_pct"] == 8  # default: non-premium


def test_opportunities_endpoint_applies_premium_tax(monkeypatch):
    monkeypatch.setattr(main, "fetch_prices", lambda server, item_ids: _sample_raw_prices())

    client = TestClient(main.app)
    response = client.get("/api/opportunities", params={"premium": True, "max_age_min": 999999})

    assert response.json()[0]["tax_pct"] == 4


def test_opportunities_endpoint_returns_502_on_fetch_error(monkeypatch):
    def raise_error(server, item_ids):
        raise AodpFetchError("network down")

    monkeypatch.setattr(main, "fetch_prices", raise_error)

    client = TestClient(main.app)
    response = client.get("/api/opportunities")

    assert response.status_code == 502
    assert "error" in response.json()


def _cargo_raw_prices():
    now_iso = datetime.now(timezone.utc).isoformat()
    return [
        {
            "item_id": "T4_BAG", "city": "Bridgewatch", "quality": 1,
            "sell_price_min": 1000, "sell_price_min_date": now_iso,
            "buy_price_max": 0, "buy_price_max_date": now_iso,
        },
        {
            "item_id": "T4_BAG", "city": "Black Market", "quality": 1,
            "sell_price_min": 0, "sell_price_min_date": now_iso,
            "buy_price_max": 1500, "buy_price_max_date": now_iso,
        },
    ]


def test_cargo_plan_endpoint_returns_ok_status_and_plan(monkeypatch):
    monkeypatch.setattr(main, "fetch_prices", lambda server, item_ids: _cargo_raw_prices())
    monkeypatch.setattr(main, "ITEM_WEIGHTS", {"T4_BAG": 3.4})

    client = TestClient(main.app)
    response = client.get("/api/cargo-plan", params={
        "city": "Bridgewatch", "budget": 100000, "available_weight": 500, "max_age_min": 999999,
    })

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["items"][0]["item_id"] == "T4_BAG"


def test_cargo_plan_rejects_invalid_city(monkeypatch):
    monkeypatch.setattr(main, "fetch_prices", lambda server, item_ids: _cargo_raw_prices())

    client = TestClient(main.app)
    response = client.get("/api/cargo-plan", params={
        "city": "Caerleon", "budget": 100000, "available_weight": 500,
    })

    assert response.status_code == 422


def test_cargo_plan_rejects_non_positive_budget(monkeypatch):
    monkeypatch.setattr(main, "fetch_prices", lambda server, item_ids: _cargo_raw_prices())

    client = TestClient(main.app)
    response = client.get("/api/cargo-plan", params={
        "city": "Bridgewatch", "budget": 0, "available_weight": 500,
    })

    assert response.status_code == 422


def test_cargo_plan_returns_no_opportunities_status(monkeypatch):
    monkeypatch.setattr(main, "fetch_prices", lambda server, item_ids: _cargo_raw_prices())
    monkeypatch.setattr(main, "ITEM_WEIGHTS", {"T4_BAG": 3.4})

    client = TestClient(main.app)
    response = client.get("/api/cargo-plan", params={
        "city": "Lymhurst", "budget": 100000, "available_weight": 500, "max_age_min": 999999,
    })

    assert response.json()["status"] == "no_opportunities"


def test_cargo_plan_returns_no_item_fits_status(monkeypatch):
    monkeypatch.setattr(main, "fetch_prices", lambda server, item_ids: _cargo_raw_prices())
    monkeypatch.setattr(main, "ITEM_WEIGHTS", {"T4_BAG": 3.4})

    client = TestClient(main.app)
    response = client.get("/api/cargo-plan", params={
        "city": "Bridgewatch", "budget": 1, "available_weight": 500, "max_age_min": 999999,
    })

    assert response.json()["status"] == "no_item_fits"


def test_cargo_plan_returns_502_on_fetch_error(monkeypatch):
    def raise_error(server, item_ids):
        raise AodpFetchError("network down")

    monkeypatch.setattr(main, "fetch_prices", raise_error)

    client = TestClient(main.app)
    response = client.get("/api/cargo-plan", params={
        "city": "Bridgewatch", "budget": 100000, "available_weight": 500,
    })

    assert response.status_code == 502


def test_cargo_plan_with_only_losses_returns_no_opportunities(monkeypatch):
    raw = _cargo_raw_prices()
    raw[1]["buy_price_max"] = 900
    monkeypatch.setattr(main, "fetch_prices", lambda server, item_ids: raw)
    client = TestClient(main.app)
    response = client.get("/api/cargo-plan", params={
        "city": "Bridgewatch", "budget": 100000, "available_weight": 500,
    })
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "no_opportunities"
    assert body["items"] == []
    assert body["totals"]["profit"] == 0


def test_opportunities_city_filter_uses_requested_city_even_if_not_cheapest(monkeypatch):
    raw = _cargo_raw_prices()
    raw.append({**raw[0], "city": "Lymhurst", "sell_price_min": 1200})
    monkeypatch.setattr(main, "fetch_prices", lambda server, item_ids: raw)
    response = TestClient(main.app).get("/api/opportunities", params={"city": "Lymhurst"})
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["source_city"] == "Lymhurst"
    assert response.json()[0]["city_price"] == 1200


@pytest.mark.parametrize("server", ["Americas", "Europe"])
def test_opportunities_passes_selected_server_to_data_source(monkeypatch, server):
    seen = []
    def fetch(selected, item_ids):
        seen.append(selected)
        return _cargo_raw_prices()
    monkeypatch.setattr(main, "fetch_prices", fetch)
    response = TestClient(main.app).get("/api/opportunities", params={"server": server})
    assert response.status_code == 200
    assert seen == [server]


@pytest.mark.parametrize("endpoint,base", [
    ("/api/opportunities", {}),
    ("/api/cargo-plan", {"city": "Lymhurst", "budget": 100000, "available_weight": 50}),
])
@pytest.mark.parametrize("invalid", [{"server": "invalid"}, {"max_age_min": 0},
    {"max_age_min": "nan"}, {"max_age_min": "inf"}, {"city": "invalid"}])
def test_market_parameters_are_validated_before_fetch(monkeypatch, endpoint, base, invalid):
    def unexpected_fetch(*args):
        pytest.fail("Invalid parameters must not reach the data source")
    monkeypatch.setattr(main, "fetch_prices", unexpected_fetch)
    assert TestClient(main.app).get(endpoint, params={**base, **invalid}).status_code == 422


def test_all_cities_keeps_each_origin_for_same_item(monkeypatch):
    raw = _sample_raw_prices()
    raw += [{**raw[0], "city": city, "sell_price_min": price} for city, price in
            [("Lymhurst", 1100), ("Martlock", 1200), ("Fort Sterling", 1300)]]
    monkeypatch.setattr(main, "fetch_prices", lambda *args: raw)
    client = TestClient(main.app)
    result = client.get('/api/opportunities', params={'all_cities': True}).json()
    assert [item['source_city'] for item in result] == ['Lymhurst', 'Martlock', 'FortSterling']
    assert [item['profit'] for item in result] == [280, 180, 80]
    assert client.get('/api/opportunities', params={'all_cities': True, 'city': 'Lymhurst'}).status_code == 422


def test_all_cities_live_stream_matches_rest(monkeypatch):
    import asyncio
    import json
    raw = _sample_raw_prices()
    raw += [{**raw[0], 'city': city} for city in ['Lymhurst', 'Martlock']]
    monkeypatch.setattr(main.LIVE, 'snapshot', lambda *args: (raw, {'state':'connected'}))
    class Request:
        async def is_disconnected(self): return False
    async def check():
        response = await main.live_stream(Request(), server='Americas', city=None, all_cities=True,
                                         premium=False, max_age_min=60, family=None, tier=4, enchantment=0)
        payload = json.loads((await anext(response.body_iterator)).removeprefix('data: '))
        assert {item['source_city'] for item in payload['items']} == {'Lymhurst', 'Martlock'}
        await response.body_iterator.aclose()
    asyncio.run(check())


def test_cautious_cargo_rejects_old_or_thin_margin_quotes(monkeypatch):
    from datetime import timedelta
    raw = _sample_raw_prices()
    raw[0]['city'] = 'Thetford'
    raw[1]['buy_price_max'] = 1150  # positive normal profit, loss after a 10% fall
    monkeypatch.setattr(main, 'fetch_prices', lambda *args: raw)
    client = TestClient(main.app)
    params = {'city':'Thetford', 'budget':100000, 'available_weight':100,
              'recent_only':True, 'stress_drop_pct':10, 'max_age_min':60}
    assert client.get('/api/cargo-plan', params=params).json()['status'] == 'no_opportunities'
    raw[1]['buy_price_max'] = 1500
    raw[1]['buy_price_max_date'] = (datetime.now(timezone.utc)-timedelta(minutes=3)).isoformat()
    assert client.get('/api/cargo-plan', params=params).json()['status'] == 'no_opportunities'
    raw[1]['buy_price_max_date'] = datetime.now(timezone.utc).isoformat()
    assert client.get('/api/cargo-plan', params=params).json()['status'] == 'ok'


def test_liquid_cargo_excludes_unknown_quality_and_caps_quantity(monkeypatch):
    monkeypatch.setattr(main, 'fetch_prices', lambda *args: _cargo_raw_prices())
    monkeypatch.setattr(main, 'ITEM_WEIGHTS', {'T4_BAG': 3.4})
    params = dict(city='Bridgewatch', budget=100000, available_weight=500,
                  max_qty_per_item=50, liquid_only=True)
    client = TestClient(main.app)
    monkeypatch.setattr(main, 'fetch_liquidity', lambda *args: {'items': [
        dict(item_id='T4_BAG', quality=2, liquid=True, suggested_qty_limit=8)]})
    assert client.get('/api/cargo-plan', params=params).json()['status'] == 'no_opportunities'
    monkeypatch.setattr(main, 'fetch_liquidity', lambda *args: {'items': [
        dict(item_id='T4_BAG', quality=1, liquid=True, suggested_qty_limit=3)]})
    result = client.get('/api/cargo-plan', params=params).json()
    assert result['items'][0]['quantity'] == 3
    assert result['items'][0]['liquidity_qty_limit'] == 3
    def fail(*args):
        raise AodpFetchError('offline')
    monkeypatch.setattr(main, 'fetch_liquidity', fail)
    assert client.get('/api/cargo-plan', params=params).status_code == 502

def test_research_profile_is_exact_and_intersects_existing_filters():
    core = main.selected_ids(None, None, None, 'bm_core')
    assert len(core) == 198 and len(set(core)) == 198
    assert 'T5_BAG' in core and 'T6_ARMOR_LEATHER_SET3@1' in core
    assert 'T6_OFF_JESTERCANE_HELL' not in core and 'T4_MAIN_SWORD@2' not in core
    assert 'T7_BAG' not in core
    assert main.selected_ids(None, 8, None, 'bm_core') == []
    filtered = main.selected_ids('Bolsas', 5, 1, 'bm_core')
    assert filtered == ['T5_BAG@1']


def test_expanded_flip_profiles_include_high_tiers_and_artifacts():
    expanded = main.selected_ids(None, None, None, 'bm_expanded')
    advanced = main.selected_ids(None, None, None, 'bm_advanced')
    assert len(expanded) == 3825 and len(set(expanded)) == 3825
    assert len(advanced) == 3825 and len(set(advanced)) == 3825
    assert main.RESEARCH_IDS <= set(expanded)
    assert 'T8_ARMOR_PLATE_SET2@2' in expanded
    assert 'T7_2H_CLEAVER_HELL@2' in expanded
    assert 'T8_2H_KNUCKLES_AVALON@4' in advanced
    assert 'T4_MAIN_SWORD' not in advanced
    assert 'T8_MAIN_SWORD@3' not in expanded
    assert main.selected_ids('Bolsas', 8, 4, 'bm_advanced') == ['T8_BAG@4', 'T8_BAG_INSIGHT@4']


def test_expanded_profiles_are_used_by_price_and_cargo_requests(monkeypatch):
    seen = []
    def fetch(server, ids):
        seen.append(set(ids))
        return []
    monkeypatch.setattr(main, 'fetch_prices', fetch)
    client = TestClient(main.app)
    for profile in ['bm_expanded', 'bm_advanced']:
        for route, extra in [('/api/opportunities', {}), ('/api/cargo-plan', dict(city='Thetford', budget=1000000, available_weight=100))]:
            result = client.get(route, params=dict(profile=profile, tier=8, enchantment=2, **extra))
            assert result.status_code == 200
            assert seen[-1] == set(main.selected_ids(None, 8, 2, profile))
    profiles = {p['id']: p for p in client.get('/api/catalog').json()['flip_profiles']}
    assert set(profiles) == {'bm_core', 'bm_expanded', 'bm_advanced'}
    assert len(profiles['bm_advanced']['item_ids']) == 3825


def test_research_profile_limits_price_and_cargo_requests_and_rejects_unknown(monkeypatch):
    seen = []
    def fetch(server, ids):
        seen.append(ids)
        return []
    monkeypatch.setattr(main, 'fetch_prices', fetch)
    client = TestClient(main.app)
    for route, extra in [('/api/opportunities', {}), ('/api/cargo-plan',dict(city='Thetford',budget=100000,available_weight=100))]:
        response = client.get(route,params=dict(profile='bm_core', **extra))
        assert response.status_code == 200
        assert set(seen[-1]) == main.RESEARCH_IDS
        assert client.get(route,params=dict(profile='unknown', **extra)).status_code == 422
    catalog = client.get('/api/catalog').json()['research_profile']
    assert len(catalog['item_ids']) == 198 and catalog['sources']
