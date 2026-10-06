# Black Market Flip Scanner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local web app that compares Albion Online city market prices
against Black Market buy prices and lists profitable flip opportunities.

**Architecture:** A FastAPI backend fetches raw prices from the public Albion
Online Data Project (AODP) API in URL-size-bounded batches with a 5-minute
in-memory cache, a pure calculator module turns raw prices into ranked flip
opportunities (per item + quality, per-side freshness, premium/non-premium
tax), and a single static HTML/JS page renders the results in a sortable
table with server/tax/age-filter controls.

**Tech Stack:** Python, FastAPI, uvicorn, httpx, pytest, vanilla JS (no
frontend framework/build step).

**Spec:** `docs/superpowers/specs/2026-09-18-black-market-flip-scanner-design.md`

## Global Constraints

- Servers/hosts: `Americas` → `west.albion-online-data.com`, `Europe` →
  `europe.albion-online-data.com`.
- Regular-city locations: `Caerleon, Bridgewatch, Lymhurst, Martlock,
  Thetford, FortSterling`. Black Market location name: `BlackMarket`.
- AODP rate limit: 300 requests / 5 minutes — batch item IDs per request,
  never loop per item.
- Max URL length for a batch: 4000 characters (safety margin under the
  ~4096 limit).
- City side price field: `sell_price_min` / `sell_price_min_date`. Black
  Market side price field: `buy_price_max` / `buy_price_max_date` (Black
  Market only holds buy orders).
- Prices of `0` mean no active order — exclude, not an error.
- Compare strictly within the same `quality` value — never cross qualities.
- Tax: 4% premium / 8% non-premium, **non-premium is the default**.
- In-memory price cache TTL: 300 seconds, keyed by `(server, tuple(item_ids))`.
- No database, no auth, no deployment — runs on localhost only.

---

## File Structure

- `items.json` — curated list of Black Market–sellable items (`id` + `name`).
- `requirements.txt` — `fastapi`, `uvicorn`, `httpx`, `pytest`.
- `aodp_client.py` — HTTP client for the AODP API: URL-size batching, in-memory
  cache, error type.
- `flip_calculator.py` — pure function turning raw AODP rows into ranked flip
  opportunities.
- `main.py` — FastAPI app: `/api/opportunities` endpoint + static file serving.
- `static/index.html` — single page, controls (server, premium toggle, max
  age) + results table.
- `static/app.js` — fetches `/api/opportunities`, renders/sorts the table.
- `tests/test_items_data.py` — validates `items.json` shape.
- `tests/test_aodp_client.py` — batching, caching, error handling.
- `tests/test_flip_calculator.py` — core profit/exclusion/tax/age/quality logic.
- `tests/test_main.py` — endpoint wiring (mocked AODP client).

---

### Task 1: Project scaffold — `items.json` + `requirements.txt`

**Files:**
- Create: `items.json`
- Create: `requirements.txt`
- Test: `tests/test_items_data.py`

**Interfaces:**
- Produces: `items.json` — a JSON array of `{"id": str, "name": str}`
  objects, consumed by `main.py` (Task 5) to build `ITEM_IDS` and
  `ITEM_NAMES`.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_items_data.py
import json
from pathlib import Path

ITEMS_PATH = Path(__file__).parent.parent / "items.json"


def _load_items():
    return json.loads(ITEMS_PATH.read_text(encoding="utf-8"))


def test_items_json_is_a_nonempty_list_of_id_name_objects():
    items = _load_items()
    assert isinstance(items, list)
    assert len(items) > 0
    for item in items:
        assert set(item.keys()) == {"id", "name"}
        assert isinstance(item["id"], str) and item["id"]
        assert isinstance(item["name"], str) and item["name"]


def test_items_json_has_unique_ids():
    items = _load_items()
    ids = [item["id"] for item in items]
    assert len(ids) == len(set(ids))
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_items_data.py -v`
Expected: FAIL (`FileNotFoundError` — `items.json` does not exist yet)

- [ ] **Step 3: Create `items.json` and `requirements.txt`**

```json
[
  {"id": "T4_BAG", "name": "Bag"},
  {"id": "T5_BAG", "name": "Bag (T5)"},
  {"id": "T6_BAG", "name": "Bag (T6)"},
  {"id": "T7_BAG", "name": "Bag (T7)"},
  {"id": "T8_BAG", "name": "Bag (T8)"},
  {"id": "T4_HEAD_PLATE_SET1", "name": "Soldier Helmet"},
  {"id": "T5_HEAD_PLATE_SET1", "name": "Soldier Helmet (T5)"},
  {"id": "T6_HEAD_PLATE_SET1", "name": "Soldier Helmet (T6)"},
  {"id": "T4_ARMOR_PLATE_SET1", "name": "Soldier Armor"},
  {"id": "T5_ARMOR_PLATE_SET1", "name": "Soldier Armor (T5)"},
  {"id": "T6_ARMOR_PLATE_SET1", "name": "Soldier Armor (T6)"},
  {"id": "T4_SHOES_PLATE_SET1", "name": "Soldier Boots"},
  {"id": "T5_SHOES_PLATE_SET1", "name": "Soldier Boots (T5)"},
  {"id": "T6_SHOES_PLATE_SET1", "name": "Soldier Boots (T6)"},
  {"id": "T4_MAIN_SWORD", "name": "Broadsword"},
  {"id": "T5_MAIN_SWORD", "name": "Broadsword (T5)"},
  {"id": "T6_MAIN_SWORD", "name": "Broadsword (T6)"},
  {"id": "T4_2H_BOW", "name": "Warbow"},
  {"id": "T5_2H_BOW", "name": "Warbow (T5)"},
  {"id": "T6_2H_BOW", "name": "Warbow (T6)"},
  {"id": "T4_2H_HOLYSTAFF", "name": "Holy Staff"},
  {"id": "T5_2H_HOLYSTAFF", "name": "Holy Staff (T5)"},
  {"id": "T6_2H_HOLYSTAFF", "name": "Holy Staff (T6)"},
  {"id": "T4_OFF_SHIELD", "name": "Shield"},
  {"id": "T5_OFF_SHIELD", "name": "Shield (T5)"},
  {"id": "T6_OFF_SHIELD", "name": "Shield (T6)"},
  {"id": "T4_CAPEITEM_FW_MARTLOCK", "name": "Martlock Cape"},
  {"id": "T4_CAPEITEM_FW_LYMHURST", "name": "Lymhurst Cape"},
  {"id": "T4_CAPEITEM_FW_BRIDGEWATCH", "name": "Bridgewatch Cape"},
  {"id": "T4_CAPEITEM_FW_FORTSTERLING", "name": "Fort Sterling Cape"},
  {"id": "T4_CAPEITEM_FW_THETFORD", "name": "Thetford Cape"}
]
```

```text
# requirements.txt
fastapi
uvicorn
httpx
pytest
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_items_data.py -v`
Expected: PASS (2 passed)

- [ ] **Step 5: Install dependencies and commit**

```bash
pip install -r requirements.txt
git add items.json requirements.txt tests/test_items_data.py
git commit -m "Add curated Black Market item list and project dependencies"
```

---

### Task 2: `aodp_client.py` — URL-size batching

**Files:**
- Create: `aodp_client.py`
- Test: `tests/test_aodp_client.py`

**Interfaces:**
- Produces: `CITIES: list[str]`, `BLACK_MARKET: str`, `LOCATIONS: list[str]`,
  `SERVER_HOSTS: dict[str, str]`, `MAX_URL_LENGTH: int`,
  `batch_item_ids(item_ids: list[str], host: str, locations: list[str], max_url_length: int = MAX_URL_LENGTH) -> list[list[str]]`.
  Consumed by `fetch_prices` (Task 3, same file).

- [ ] **Step 1: Write the failing test**

```python
# tests/test_aodp_client.py
from aodp_client import batch_item_ids


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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_aodp_client.py -v`
Expected: FAIL (`ModuleNotFoundError: No module named 'aodp_client'`)

- [ ] **Step 3: Write minimal implementation**

```python
# aodp_client.py
CITIES = ["Caerleon", "Bridgewatch", "Lymhurst", "Martlock", "Thetford", "FortSterling"]
BLACK_MARKET = "BlackMarket"
LOCATIONS = CITIES + [BLACK_MARKET]

SERVER_HOSTS = {
    "Americas": "west.albion-online-data.com",
    "Europe": "europe.albion-online-data.com",
}

MAX_URL_LENGTH = 4000


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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_aodp_client.py -v`
Expected: PASS (2 passed)

- [ ] **Step 5: Commit**

```bash
git add aodp_client.py tests/test_aodp_client.py
git commit -m "Add AODP URL-size-bounded item batching"
```

---

### Task 3: `aodp_client.py` — `fetch_prices` with caching and error handling

**Files:**
- Modify: `aodp_client.py`
- Modify: `tests/test_aodp_client.py`

**Interfaces:**
- Consumes: `batch_item_ids`, `SERVER_HOSTS`, `LOCATIONS` (Task 2, same file).
- Produces: `class AodpFetchError(Exception)`,
  `fetch_prices(server: str, item_ids: list[str]) -> list[dict]` — each dict
  is a raw AODP price row (keys include `item_id`, `city`, `quality`,
  `sell_price_min`, `sell_price_min_date`, `buy_price_max`,
  `buy_price_max_date`). Consumed by `main.py` (Task 5).

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_aodp_client.py (append)
import aodp_client
from aodp_client import fetch_prices, AodpFetchError


class _FakeResponse:
    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self):
        pass

    def json(self):
        return self._payload


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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_aodp_client.py -v`
Expected: FAIL (`AttributeError`/`ImportError` — `fetch_prices`, `AodpFetchError`, `httpx` not defined in `aodp_client` yet)

- [ ] **Step 3: Write minimal implementation**

```python
# aodp_client.py (append)
import time
import httpx

CACHE_TTL_SECONDS = 300
_cache = {}


class AodpFetchError(Exception):
    pass


def fetch_prices(server, item_ids):
    host = SERVER_HOSTS[server]
    cache_key = (server, tuple(item_ids))
    now = time.time()

    cached = _cache.get(cache_key)
    if cached and now - cached[0] < CACHE_TTL_SECONDS:
        return cached[1]

    rows = []
    for batch in batch_item_ids(item_ids, host, LOCATIONS):
        ids_part = ",".join(batch)
        url = f"https://{host}/api/v2/stats/prices/{ids_part}"
        try:
            response = httpx.get(url, params={"locations": ",".join(LOCATIONS)}, timeout=10.0)
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise AodpFetchError(f"Failed to fetch prices from AODP: {exc}") from exc
        rows.extend(response.json())

    _cache[cache_key] = (now, rows)
    return rows
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_aodp_client.py -v`
Expected: PASS (5 passed)

- [ ] **Step 5: Commit**

```bash
git add aodp_client.py tests/test_aodp_client.py
git commit -m "Add AODP price fetching with in-memory cache and error handling"
```

---

### Task 4: `flip_calculator.py` — core opportunity calculation

**Files:**
- Create: `flip_calculator.py`
- Test: `tests/test_flip_calculator.py`

**Interfaces:**
- Consumes: raw AODP rows shaped like `aodp_client.fetch_prices`'s return
  value (Task 3), plus `aodp_client.CITIES` and `aodp_client.BLACK_MARKET`
  (Task 2) — reused here instead of redefined, to keep the city/location
  list defined in exactly one place.
- Produces:
  `compute_opportunities(raw_prices: list[dict], item_names: dict[str, str], tax_pct: float, max_age_min: float, now: datetime | None = None) -> list[dict]`,
  each result dict has keys `item_id, item_name, quality, source_city,
  city_price, city_price_age_min, bm_price, bm_price_age_min, tax_pct,
  profit, margin_pct`, sorted by `profit` descending. Consumed by `main.py`
  (Task 5).

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_flip_calculator.py
from datetime import datetime, timedelta, timezone

from flip_calculator import compute_opportunities

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
        _row("T4_BAG", "BlackMarket", quality=1, buy_price_max=1500),
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


def test_zero_price_on_either_side_excludes_the_item():
    raw_city_zero = [
        _row("T4_BAG", "Caerleon", quality=1, sell_price_min=0),
        _row("T4_BAG", "BlackMarket", quality=1, buy_price_max=1500),
    ]
    raw_bm_zero = [
        _row("T4_BAG", "Caerleon", quality=1, sell_price_min=1000),
        _row("T4_BAG", "BlackMarket", quality=1, buy_price_max=0),
    ]
    assert compute_opportunities(raw_city_zero, {}, tax_pct=8, max_age_min=60, now=NOW) == []
    assert compute_opportunities(raw_bm_zero, {}, tax_pct=8, max_age_min=60, now=NOW) == []


def test_premium_tax_yields_higher_profit_than_non_premium():
    raw = [
        _row("T4_BAG", "Caerleon", quality=1, sell_price_min=1000),
        _row("T4_BAG", "BlackMarket", quality=1, buy_price_max=1500),
    ]
    premium = compute_opportunities(raw, {}, tax_pct=4, max_age_min=60, now=NOW)[0]
    non_premium = compute_opportunities(raw, {}, tax_pct=8, max_age_min=60, now=NOW)[0]
    assert premium["profit"] > non_premium["profit"]


def test_stale_price_beyond_max_age_is_excluded():
    stale_date = _iso(NOW - timedelta(minutes=120))
    raw = [
        _row("T4_BAG", "Caerleon", quality=1, sell_price_min=1000, sell_price_min_date=stale_date),
        _row("T4_BAG", "BlackMarket", quality=1, buy_price_max=1500),
    ]
    assert compute_opportunities(raw, {}, tax_pct=8, max_age_min=60, now=NOW) == []


def test_qualities_are_never_cross_compared():
    raw = [
        # Quality 1: cheap city, no BM buyer -> should NOT borrow quality 2's BM price.
        _row("T4_BAG", "Caerleon", quality=1, sell_price_min=100),
        # Quality 2: expensive city, high BM buyer -> its own valid pair.
        _row("T4_BAG", "Caerleon", quality=2, sell_price_min=900),
        _row("T4_BAG", "BlackMarket", quality=2, buy_price_max=2000),
    ]
    result = compute_opportunities(raw, {}, tax_pct=8, max_age_min=60, now=NOW)
    assert len(result) == 1
    assert result[0]["quality"] == 2


def test_picks_cheapest_city_price_across_multiple_cities():
    raw = [
        _row("T4_BAG", "Caerleon", quality=1, sell_price_min=1200),
        _row("T4_BAG", "Martlock", quality=1, sell_price_min=900),
        _row("T4_BAG", "BlackMarket", quality=1, buy_price_max=1500),
    ]
    result = compute_opportunities(raw, {}, tax_pct=8, max_age_min=60, now=NOW)
    assert result[0]["source_city"] == "Martlock"
    assert result[0]["city_price"] == 900


def test_results_sorted_by_profit_descending():
    raw = [
        _row("T4_BAG", "Caerleon", quality=1, sell_price_min=1000),
        _row("T4_BAG", "BlackMarket", quality=1, buy_price_max=1200),
        _row("T5_BAG", "Caerleon", quality=1, sell_price_min=1000),
        _row("T5_BAG", "BlackMarket", quality=1, buy_price_max=3000),
    ]
    result = compute_opportunities(raw, {}, tax_pct=8, max_age_min=60, now=NOW)
    assert [opp["item_id"] for opp in result] == ["T5_BAG", "T4_BAG"]
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_flip_calculator.py -v`
Expected: FAIL (`ModuleNotFoundError: No module named 'flip_calculator'`)

- [ ] **Step 3: Write minimal implementation**

```python
# flip_calculator.py
from datetime import datetime, timezone

from aodp_client import CITIES, BLACK_MARKET

CITY_LOCATIONS = set(CITIES)


def _parse_date(date_str):
    dt = datetime.fromisoformat(date_str)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def _age_minutes(date_str, now):
    return (now - _parse_date(date_str)).total_seconds() / 60


def compute_opportunities(raw_prices, item_names, tax_pct, max_age_min, now=None):
    if now is None:
        now = datetime.now(timezone.utc)

    grouped = {}
    for row in raw_prices:
        key = (row["item_id"], row["quality"])
        grouped.setdefault(key, []).append(row)

    opportunities = []
    for (item_id, quality), rows in grouped.items():
        city_rows = [r for r in rows if r["city"] in CITY_LOCATIONS and r["sell_price_min"] > 0]
        bm_rows = [r for r in rows if r["city"] == BLACK_MARKET and r["buy_price_max"] > 0]
        if not city_rows or not bm_rows:
            continue

        best_city_row = min(city_rows, key=lambda r: r["sell_price_min"])
        best_bm_row = max(bm_rows, key=lambda r: r["buy_price_max"])

        city_age = _age_minutes(best_city_row["sell_price_min_date"], now)
        bm_age = _age_minutes(best_bm_row["buy_price_max_date"], now)
        if city_age > max_age_min or bm_age > max_age_min:
            continue

        city_price = best_city_row["sell_price_min"]
        bm_price = best_bm_row["buy_price_max"]
        profit = bm_price * (1 - tax_pct / 100) - city_price
        margin_pct = (profit / city_price) * 100 if city_price else 0

        opportunities.append({
            "item_id": item_id,
            "item_name": item_names.get(item_id, item_id),
            "quality": quality,
            "source_city": best_city_row["city"],
            "city_price": city_price,
            "city_price_age_min": round(city_age, 1),
            "bm_price": bm_price,
            "bm_price_age_min": round(bm_age, 1),
            "tax_pct": tax_pct,
            "profit": round(profit, 2),
            "margin_pct": round(margin_pct, 2),
        })

    opportunities.sort(key=lambda o: o["profit"], reverse=True)
    return opportunities
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_flip_calculator.py -v`
Expected: PASS (7 passed)

- [ ] **Step 5: Commit**

```bash
git add flip_calculator.py tests/test_flip_calculator.py
git commit -m "Add flip opportunity calculator with quality isolation and age filtering"
```

---

### Task 5: `main.py` — FastAPI endpoint and static serving

**Files:**
- Create: `main.py`
- Test: `tests/test_main.py`

**Interfaces:**
- Consumes: `aodp_client.fetch_prices`, `aodp_client.AodpFetchError` (Task 3),
  `flip_calculator.compute_opportunities` (Task 4), `items.json` (Task 1).
- Produces: FastAPI `app` object with `GET /api/opportunities` (query params
  `server: str = "Americas"`, `premium: bool = False`,
  `max_age_min: float = 60`), returning a JSON list of opportunity dicts (as
  produced by `compute_opportunities`) or HTTP 502 with
  `{"error": "..."}` on `AodpFetchError`. Static files served from `/`.

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_main.py
from fastapi.testclient import TestClient

import main
from aodp_client import AodpFetchError


def _sample_raw_prices():
    return [
        {
            "item_id": "T4_BAG", "city": "Caerleon", "quality": 1,
            "sell_price_min": 1000, "sell_price_min_date": "2026-09-18T12:00:00",
            "buy_price_max": 1500, "buy_price_max_date": "2026-09-18T12:00:00",
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_main.py -v`
Expected: FAIL (`ModuleNotFoundError: No module named 'main'`)

- [ ] **Step 3: Write minimal implementation**

```python
# main.py
import json
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from aodp_client import AodpFetchError, fetch_prices
from flip_calculator import compute_opportunities

BASE_DIR = Path(__file__).parent
ITEMS = json.loads((BASE_DIR / "items.json").read_text(encoding="utf-8"))
ITEM_IDS = [item["id"] for item in ITEMS]
ITEM_NAMES = {item["id"]: item["name"] for item in ITEMS}

app = FastAPI()


@app.get("/api/opportunities")
def get_opportunities(server: str = "Americas", premium: bool = False, max_age_min: float = 60):
    tax_pct = 4 if premium else 8
    try:
        raw_prices = fetch_prices(server, ITEM_IDS)
    except AodpFetchError as exc:
        return JSONResponse(status_code=502, content={"error": str(exc)})

    return compute_opportunities(raw_prices, ITEM_NAMES, tax_pct, max_age_min)


app.mount("/", StaticFiles(directory=str(BASE_DIR / "static"), html=True), name="static")
```

- [ ] **Step 4: Run tests to verify they pass**

Note: the static mount requires `static/` to exist. Create an empty
`static/index.html` placeholder (`<!doctype html>`) before running tests if
Task 6 hasn't run yet — it will be replaced by the real page in Task 6.

Run: `pytest tests/test_main.py -v`
Expected: PASS (3 passed)

- [ ] **Step 5: Commit**

```bash
git add main.py tests/test_main.py
git commit -m "Add FastAPI opportunities endpoint and static file serving"
```

---

### Task 6: Frontend — `static/index.html` + `static/app.js`

**Files:**
- Create: `static/index.html`
- Create: `static/app.js`

**Interfaces:**
- Consumes: `GET /api/opportunities?server=&premium=&max_age_min=` (Task 5),
  JSON array with fields `item_name, quality, source_city, city_price,
  city_price_age_min, bm_price, bm_price_age_min, profit, margin_pct`.

- [ ] **Step 1: Write `static/index.html`**

```html
<!doctype html>
<html lang="pt">
<head>
  <meta charset="utf-8">
  <title>Black Market Flip Scanner</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; }
    .controls { display: flex; gap: 1rem; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ccc; padding: 0.4rem 0.6rem; text-align: right; }
    th { cursor: pointer; text-align: right; background: #f0f0f0; }
    th:first-child, td:first-child { text-align: left; }
    #status { color: #b00; margin-bottom: 1rem; }
  </style>
</head>
<body>
  <h1>Black Market Flip Scanner</h1>
  <div class="controls">
    <label>Servidor:
      <select id="server">
        <option value="Americas">Americas</option>
        <option value="Europe">Europe</option>
      </select>
    </label>
    <label><input type="checkbox" id="premium"> Premium</label>
    <label>Idade máx. (min):
      <input type="number" id="maxAge" value="60" min="1">
    </label>
    <button id="refresh">Atualizar</button>
  </div>
  <div id="status"></div>
  <table>
    <thead>
      <tr>
        <th data-key="item_name">Item</th>
        <th data-key="quality">Qualidade</th>
        <th data-key="source_city">Cidade</th>
        <th data-key="city_price">Preço cidade</th>
        <th data-key="city_price_age_min">Idade cidade</th>
        <th data-key="bm_price">Preço BM</th>
        <th data-key="bm_price_age_min">Idade BM</th>
        <th data-key="profit">Lucro</th>
        <th data-key="margin_pct">Margem %</th>
      </tr>
    </thead>
    <tbody id="rows"></tbody>
  </table>
  <script src="/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write `static/app.js`**

```javascript
let currentData = [];
let sortKey = "profit";
let sortDesc = true;

async function loadOpportunities() {
  const server = document.getElementById("server").value;
  const premium = document.getElementById("premium").checked;
  const maxAge = document.getElementById("maxAge").value;
  const status = document.getElementById("status");
  status.textContent = "";

  const params = new URLSearchParams({ server, premium, max_age_min: maxAge });
  try {
    const response = await fetch(`/api/opportunities?${params}`);
    if (!response.ok) {
      status.textContent = "Não foi possível atualizar preços.";
      return;
    }
    currentData = await response.json();
    renderTable();
  } catch (err) {
    status.textContent = "Não foi possível atualizar preços.";
  }
}

function renderTable() {
  const sorted = [...currentData].sort((a, b) => {
    const diff = a[sortKey] > b[sortKey] ? 1 : a[sortKey] < b[sortKey] ? -1 : 0;
    return sortDesc ? -diff : diff;
  });

  const tbody = document.getElementById("rows");
  tbody.innerHTML = sorted.map(row => `
    <tr>
      <td>${row.item_name}</td>
      <td>${row.quality}</td>
      <td>${row.source_city}</td>
      <td>${row.city_price}</td>
      <td>${row.city_price_age_min}</td>
      <td>${row.bm_price}</td>
      <td>${row.bm_price_age_min}</td>
      <td>${row.profit}</td>
      <td>${row.margin_pct}</td>
    </tr>
  `).join("");
}

document.getElementById("refresh").addEventListener("click", loadOpportunities);
document.querySelectorAll("th[data-key]").forEach(th => {
  th.addEventListener("click", () => {
    const key = th.dataset.key;
    sortDesc = sortKey === key ? !sortDesc : true;
    sortKey = key;
    renderTable();
  });
});

loadOpportunities();
```

- [ ] **Step 3: Run the full backend test suite (regression check)**

Run: `pytest -v`
Expected: PASS (all tests from Tasks 1-5 still pass)

- [ ] **Step 4: Start the server and verify manually in the browser**

Run: `uvicorn main:app --reload` (from the project root)

Using the claude-in-chrome browser tools, navigate to `http://127.0.0.1:8000/`
and confirm:
- The page loads and shows a table (may be empty or populated depending on
  live AODP data availability).
- Toggling "Premium" and clicking "Atualizar" changes the `tax_pct` used
  (check the Network tab / response JSON) and the resulting profit values.
- Clicking a column header (e.g. "Lucro") re-sorts the table.
- Setting "Idade máx." to a very small number (e.g. `1`) reduces or empties
  the result set (stale prices filtered out).

If the AODP API is unreachable from this environment, confirm instead that
the status message "Não foi possível atualizar preços." appears instead of a
broken page.

- [ ] **Step 5: Commit**

```bash
git add static/index.html static/app.js
git commit -m "Add frontend table with server/premium/age controls and sorting"
```
