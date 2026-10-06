from datetime import datetime, timezone

from aodp_client import BLACK_MARKET_CITY, CITIES

CITY_LOCATIONS = set(CITIES)


def _parse_date(date_str):
    dt = datetime.fromisoformat(date_str)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def _age_minutes(date_str, now):
    return (now - _parse_date(date_str)).total_seconds() / 60


def _base_item_id(item_id):
    return item_id.split("@")[0]


def _build_opportunity(item_id, quality, city_rows, bm_rows, item_names, item_weights, tax_pct, max_age_min, now):
    city_rows = [r for r in city_rows if 0 <= _age_minutes(r["sell_price_min_date"], now) <= max_age_min]
    bm_rows = [r for r in bm_rows if 0 <= _age_minutes(r["buy_price_max_date"], now) <= max_age_min]
    if not city_rows or not bm_rows:
        return None

    best_city_row = min(city_rows, key=lambda r: r["sell_price_min"])
    best_bm_row = max(bm_rows, key=lambda r: r["buy_price_max"])

    city_age = _age_minutes(best_city_row["sell_price_min_date"], now)
    bm_age = _age_minutes(best_bm_row["buy_price_max_date"], now)

    city_price = best_city_row["sell_price_min"]
    bm_price = best_bm_row["buy_price_max"]
    profit = bm_price * (1 - tax_pct / 100) - city_price
    margin_pct = (profit / city_price) * 100 if city_price else 0

    weight = item_weights.get(_base_item_id(item_id)) if item_weights else None
    profit_per_kg = round(profit / weight, 2) if weight else None

    return {
        "item_id": item_id,
        "item_name": item_names.get(item_id, item_id),
        "quality": quality,
        "source_city": best_city_row["city"],
        "city_price": city_price,
        "city_price_age_min": round(city_age, 1),
        "city_price_date": best_city_row['sell_price_min_date'],
        "city_price_source": best_city_row.get('sell_price_min_source', 'api'),
        "bm_price": bm_price,
        "bm_price_age_min": round(bm_age, 1),
        "bm_price_date": best_bm_row['buy_price_max_date'],
        "bm_price_source": best_bm_row.get('buy_price_max_source', 'api'),
        "tax_pct": tax_pct,
        "profit": round(profit, 2),
        "margin_pct": round(margin_pct, 2),
        "weight": weight,
        "profit_per_kg": profit_per_kg,
    }


def _group_by_item_and_quality(raw_prices):
    grouped = {}
    for row in raw_prices:
        # AODP responses use the display name; requests and saved cargo use the ID.
        if row["city"] == "Fort Sterling":
            row = {**row, "city": "FortSterling"}
        key = (row["item_id"], row["quality"])
        grouped.setdefault(key, []).append(row)
    return grouped


def compute_opportunities(raw_prices, item_names, tax_pct, max_age_min, item_weights=None, now=None):
    if now is None:
        now = datetime.now(timezone.utc)

    opportunities = []
    for (item_id, quality), rows in _group_by_item_and_quality(raw_prices).items():
        city_rows = [r for r in rows if r["city"] in CITY_LOCATIONS and r["sell_price_min"] > 0]
        bm_rows = [r for r in rows if r["city"] == BLACK_MARKET_CITY and r["buy_price_max"] > 0]
        opp = _build_opportunity(item_id, quality, city_rows, bm_rows, item_names, item_weights, tax_pct, max_age_min, now)
        if opp:
            opportunities.append(opp)

    opportunities.sort(key=lambda o: o["profit"], reverse=True)
    return opportunities


def compute_all_city_opportunities(raw_prices, item_names, tax_pct, max_age_min, item_weights=None, now=None):
    now = now or datetime.now(timezone.utc)
    opportunities = [opp for city in CITIES if city != 'Caerleon'
                     for opp in compute_city_opportunities(raw_prices, item_names, tax_pct,
                                                          max_age_min, city, item_weights, now)]
    return sorted(opportunities, key=lambda opp: opp['profit'], reverse=True)


def compute_city_opportunities(raw_prices, item_names, tax_pct, max_age_min, origin_city, item_weights=None, now=None):
    if now is None:
        now = datetime.now(timezone.utc)

    opportunities = []
    for (item_id, quality), rows in _group_by_item_and_quality(raw_prices).items():
        city_rows = [r for r in rows if r["city"] == origin_city and r["sell_price_min"] > 0]
        bm_rows = [r for r in rows if r["city"] == BLACK_MARKET_CITY and r["buy_price_max"] > 0]
        opp = _build_opportunity(item_id, quality, city_rows, bm_rows, item_names, item_weights, tax_pct, max_age_min, now)
        if opp:
            opportunities.append(opp)

    opportunities.sort(key=lambda o: o["profit"], reverse=True)
    return opportunities
