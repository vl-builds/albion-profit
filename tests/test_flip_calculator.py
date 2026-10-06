from datetime import datetime, timedelta, timezone

from flip_calculator import compute_city_opportunities, compute_opportunities

NOW = datetime(2026, 9, 18, 12, 0, 0, tzinfo=timezone.utc)


def _iso(dt):
    return dt.isoformat()


def _row(item_id, city, quality, sell_price_min=0, sell_price_min_date=None,
         buy_price_max=0, buy_price_max_date=None):
    return {
        "item_id": item_id,
        "city": city,
        "quality": quality,
        "sell_price_min": sell_price_min,
        "sell_price_min_date": sell_price_min_date or _iso(NOW),
        "buy_price_max": buy_price_max,
        "buy_price_max_date": buy_price_max_date or _iso(NOW),
    }


def test_computes_profit_and_margin_for_a_valid_pair():
    raw = [
        _row("T4_BAG", "Caerleon", quality=1, sell_price_min=1000),
        _row("T4_BAG", "Black Market", quality=1, buy_price_max=1500),
    ]
    result = compute_opportunities(raw, {"T4_BAG": "Bag"}, tax_pct=8, max_age_min=60, now=NOW)

    assert len(result) == 1
    opp = result[0]
    assert opp["item_id"] == "T4_BAG"
    assert opp["item_name"] == "Bag"
    assert opp["source_city"] == "Caerleon"
    assert opp["city_price"] == 1000
    assert opp["bm_price"] == 1500
    assert opp["profit"] == round(1500 * 0.92 - 1000, 2)
    assert opp["margin_pct"] == round((opp["profit"] / 1000) * 100, 2)


def test_fort_sterling_api_name_works_for_city_and_global_scans():
    raw = [
        _row("T4_BAG", "Fort Sterling", quality=1, sell_price_min=1000),
        _row("T4_BAG", "Lymhurst", quality=1, sell_price_min=1200),
        _row("T4_BAG", "Black Market", quality=1, buy_price_max=1500),
    ]
    global_result = compute_opportunities(raw, {}, 8, 60, now=NOW)
    city_result = compute_city_opportunities(raw, {}, 8, 60, "FortSterling", now=NOW)
    assert global_result == city_result
    assert len(city_result) == 1
    assert city_result[0]["source_city"] == "FortSterling"
    assert city_result[0]["profit"] == 380
    assert raw[0]["city"] == "Fort Sterling"


def test_zero_price_on_either_side_excludes_the_item():
    raw_city_zero = [
        _row("T4_BAG", "Caerleon", quality=1, sell_price_min=0),
        _row("T4_BAG", "Black Market", quality=1, buy_price_max=1500),
    ]
    raw_bm_zero = [
        _row("T4_BAG", "Caerleon", quality=1, sell_price_min=1000),
        _row("T4_BAG", "Black Market", quality=1, buy_price_max=0),
    ]
    assert compute_opportunities(raw_city_zero, {}, tax_pct=8, max_age_min=60, now=NOW) == []
    assert compute_opportunities(raw_bm_zero, {}, tax_pct=8, max_age_min=60, now=NOW) == []


def test_premium_tax_yields_higher_profit_than_non_premium():
    raw = [
        _row("T4_BAG", "Caerleon", quality=1, sell_price_min=1000),
        _row("T4_BAG", "Black Market", quality=1, buy_price_max=1500),
    ]
    premium = compute_opportunities(raw, {}, tax_pct=4, max_age_min=60, now=NOW)[0]
    non_premium = compute_opportunities(raw, {}, tax_pct=8, max_age_min=60, now=NOW)[0]
    assert premium["profit"] > non_premium["profit"]


def test_stale_price_beyond_max_age_is_excluded():
    stale_date = _iso(NOW - timedelta(minutes=120))
    raw = [
        _row("T4_BAG", "Caerleon", quality=1, sell_price_min=1000, sell_price_min_date=stale_date),
        _row("T4_BAG", "Black Market", quality=1, buy_price_max=1500),
    ]
    assert compute_opportunities(raw, {}, tax_pct=8, max_age_min=60, now=NOW) == []


def test_qualities_are_never_cross_compared():
    raw = [
        # Quality 1: cheap city, no BM buyer -> should NOT borrow quality 2's BM price.
        _row("T4_BAG", "Caerleon", quality=1, sell_price_min=100),
        # Quality 2: expensive city, high BM buyer -> its own valid pair.
        _row("T4_BAG", "Caerleon", quality=2, sell_price_min=900),
        _row("T4_BAG", "Black Market", quality=2, buy_price_max=2000),
    ]
    result = compute_opportunities(raw, {}, tax_pct=8, max_age_min=60, now=NOW)
    assert len(result) == 1
    assert result[0]["quality"] == 2


def test_picks_cheapest_city_price_across_multiple_cities():
    raw = [
        _row("T4_BAG", "Caerleon", quality=1, sell_price_min=1200),
        _row("T4_BAG", "Martlock", quality=1, sell_price_min=900),
        _row("T4_BAG", "Black Market", quality=1, buy_price_max=1500),
    ]
    result = compute_opportunities(raw, {}, tax_pct=8, max_age_min=60, now=NOW)
    assert result[0]["source_city"] == "Martlock"
    assert result[0]["city_price"] == 900


def test_results_sorted_by_profit_descending():
    raw = [
        _row("T4_BAG", "Caerleon", quality=1, sell_price_min=1000),
        _row("T4_BAG", "Black Market", quality=1, buy_price_max=1200),
        _row("T5_BAG", "Caerleon", quality=1, sell_price_min=1000),
        _row("T5_BAG", "Black Market", quality=1, buy_price_max=3000),
    ]
    result = compute_opportunities(raw, {}, tax_pct=8, max_age_min=60, now=NOW)
    assert [opp["item_id"] for opp in result] == ["T5_BAG", "T4_BAG"]


def test_opportunity_includes_weight_and_profit_per_kg():
    raw = [
        _row("T4_BAG", "Caerleon", quality=1, sell_price_min=1000),
        _row("T4_BAG", "Black Market", quality=1, buy_price_max=1500),
    ]
    weights = {"T4_BAG": 3.4}
    result = compute_opportunities(raw, {}, tax_pct=8, max_age_min=60, item_weights=weights, now=NOW)

    assert result[0]["weight"] == 3.4
    assert result[0]["profit_per_kg"] == round(result[0]["profit"] / 3.4, 2)


def test_opportunity_handles_missing_weight_gracefully():
    raw = [
        _row("T4_BAG", "Caerleon", quality=1, sell_price_min=1000),
        _row("T4_BAG", "Black Market", quality=1, buy_price_max=1500),
    ]
    result = compute_opportunities(raw, {}, tax_pct=8, max_age_min=60, item_weights={}, now=NOW)

    assert result[0]["weight"] is None
    assert result[0]["profit_per_kg"] is None


def test_city_opportunities_uses_only_the_requested_city_as_source():
    raw = [
        _row("T4_BAG", "Caerleon", quality=1, sell_price_min=900),   # globally cheapest
        _row("T4_BAG", "Martlock", quality=1, sell_price_min=1200),  # still profitable here
        _row("T4_BAG", "Black Market", quality=1, buy_price_max=2000),
    ]
    global_result = compute_opportunities(raw, {}, tax_pct=8, max_age_min=60, now=NOW)
    city_result = compute_city_opportunities(raw, {}, tax_pct=8, max_age_min=60, origin_city="Martlock", now=NOW)

    assert global_result[0]["source_city"] == "Caerleon"
    # The bug this function fixes: Martlock must still appear even though
    # it is NOT the globally-cheapest city for this item.
    assert len(city_result) == 1
    assert city_result[0]["source_city"] == "Martlock"
    assert city_result[0]["city_price"] == 1200


def test_city_opportunities_ignores_other_cities_even_if_cheaper():
    raw = [
        _row("T4_BAG", "Caerleon", quality=1, sell_price_min=100),  # very cheap, but not the requested city
        _row("T4_BAG", "Black Market", quality=1, buy_price_max=2000),
    ]
    city_result = compute_city_opportunities(raw, {}, tax_pct=8, max_age_min=60, origin_city="Martlock", now=NOW)

    assert city_result == []


def test_stale_cheapest_city_does_not_hide_fresh_alternative():
    raw = [
        _row("T4_BAG", "Bridgewatch", quality=1, sell_price_min=1000,
             sell_price_min_date=_iso(NOW - timedelta(minutes=120))),
        _row("T4_BAG", "Lymhurst", quality=1, sell_price_min=1100,
             sell_price_min_date=_iso(NOW - timedelta(minutes=60))),
        _row("T4_BAG", "Martlock", quality=1, sell_price_min=1300),
        _row("T4_BAG", "Black Market", quality=1, buy_price_max=2000),
    ]
    result = compute_opportunities(raw, {}, tax_pct=8, max_age_min=60, now=NOW)
    assert len(result) == 1
    assert result[0]["source_city"] == "Lymhurst"
    assert result[0]["city_price"] == 1100
    assert result[0]["city_price_age_min"] == 60
    assert result[0]["profit"] == 740


def test_stale_black_market_price_is_excluded_for_scanner_and_cargo():
    raw = [
        _row("T4_BAG", "Lymhurst", quality=1, sell_price_min=1100),
        _row("T4_BAG", "Black Market", quality=1, buy_price_max=2000,
             buy_price_max_date=_iso(NOW - timedelta(minutes=120))),
    ]
    assert compute_opportunities(raw, {}, 8, 60, now=NOW) == []
    assert compute_city_opportunities(raw, {}, 8, 60, "Lymhurst", now=NOW) == []
