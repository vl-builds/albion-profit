import json
import asyncio
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, Query, Response, HTTPException, Request
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from aodp_client import CITIES, AodpFetchError, fetch_prices, cache_timestamp
from cargo_optimizer import optimize_cargo
from flip_calculator import compute_city_opportunities, compute_opportunities, compute_all_city_opportunities
from live_prices import LivePrices
from liquidity import fetch_liquidity

BASE_DIR = Path(__file__).parent
ITEMS = json.loads((BASE_DIR / "items.json").read_text(encoding="utf-8"))
ITEM_IDS = [item["id"] for item in ITEMS]
ITEM_NAMES = {item["id"]: item["name"] for item in ITEMS}
ITEM_WEIGHTS = json.loads((BASE_DIR / "item_weights.json").read_text(encoding="utf-8"))
ITEM_DETAILS = json.loads((BASE_DIR / "item_details.json").read_text(encoding="utf-8"))
FAMILIES = sorted({d['family'] for d in ITEM_DETAILS.values()})
RESEARCH_PROFILE = json.loads((BASE_DIR / 'research_profile.json').read_text(encoding='utf-8'))
RESEARCH_IDS = set(RESEARCH_PROFILE['item_ids'])
EXPANDED_PROFILES = json.loads((BASE_DIR / 'flip_profiles.json').read_text(encoding='utf-8'))
PROFILE_IDS = {'bm_core': RESEARCH_IDS, **{
    p['id']: {i for i in ITEM_IDS if ITEM_DETAILS[i]['tier'] in p['tiers']
              and ITEM_DETAILS[i]['enchantment'] in p['enchantments']}
    for p in EXPANDED_PROFILES}}
ItemProfile = Literal['all', 'bm_core', 'bm_expanded', 'bm_advanced']
LIVE = LivePrices(ITEM_IDS)


@asynccontextmanager
async def lifespan(app):
    await LIVE.start()
    try:
        yield
    finally:
        await LIVE.stop()


def selected_ids(family, tier, enchantment, profile='all'):
    if profile != 'all' and profile not in PROFILE_IDS:
        raise HTTPException(422, 'Seleção de itens inválida')
    if family is not None and family not in FAMILIES:
        raise HTTPException(422, 'Família inválida')
    return [i for i in ITEM_IDS if
            (family is None or ITEM_DETAILS[i]['family'] == family) and
            (tier is None or ITEM_DETAILS[i]['tier'] == tier) and
            (enchantment is None or ITEM_DETAILS[i]['enchantment'] == enchantment) and
            (profile == 'all' or i in PROFILE_IDS[profile])]

TransportOrigin = Enum(
    "TransportOrigin",
    {city: city for city in CITIES if city != "Caerleon"},
    type=str,
)

from trade_store import router as trade_router

app = FastAPI(lifespan=lifespan)
app.include_router(trade_router)
from resource_flips import router as resource_router
app.include_router(resource_router)
MarketServer = Literal["Americas", "Europe"]


@app.get('/api/liquidity')
def get_liquidity(item_ids: str = Query(..., max_length=2500), server: MarketServer = 'Americas'):
    ids = list(dict.fromkeys(item_ids.split(',')))
    if not 1 <= len(ids) <= 50 or any(i not in ITEM_DETAILS for i in ids):
        raise HTTPException(422, 'Escolha de 1 a 50 itens válidos por consulta de histórico')
    try:
        return fetch_liquidity(server, ids)
    except AodpFetchError as exc:
        return JSONResponse(status_code=502, content={'error': str(exc)})


@app.get('/api/catalog')
def get_catalog():
    return {'count': len(ITEM_IDS), 'families': FAMILIES, 'tiers': [4, 5, 6, 7, 8],
            'enchantments': [0, 1, 2, 3, 4], 'research_profile': RESEARCH_PROFILE,
            'flip_profiles': [RESEARCH_PROFILE] + [
                {**p, 'item_ids': sorted(PROFILE_IDS[p['id']])} for p in EXPANDED_PROFILES]}


@app.get('/api/live')
async def live_stream(
    request: Request,
    server: MarketServer = 'Americas',
    city: TransportOrigin | None = None,
    all_cities: bool = False,
    premium: bool = False,
    max_age_min: float = Query(60, gt=0, allow_inf_nan=False),
    profile: ItemProfile = "all",
    family: str | None = None,
    tier: int | None = Query(None, ge=4, le=8),
    enchantment: int | None = Query(None, ge=0, le=4),
):
    ids = selected_ids(family, tier, enchantment, profile)
    if all_cities and city is not None:
        raise HTTPException(422, 'Escolha uma cidade ou todas as cidades')
    origin = city.value if city is not None else None
    async def events():
        while not await request.is_disconnected():
            raw, status = LIVE.snapshot(server, ids, origin, max_age_min)
            now = datetime.now(timezone.utc)
            if all_cities:
                items = compute_all_city_opportunities(raw, ITEM_NAMES, 4 if premium else 8,
                                                       max_age_min, ITEM_WEIGHTS, now=now)
            elif origin is None:
                items = compute_opportunities(raw, ITEM_NAMES, 4 if premium else 8,
                                              max_age_min, ITEM_WEIGHTS, now=now)
            else:
                items = compute_city_opportunities(raw, ITEM_NAMES, 4 if premium else 8,
                                                   max_age_min, origin, ITEM_WEIGHTS, now=now)
            payload = {'server': server, 'status': status, 'items': items, 'generated_at': now.isoformat()}
            yield 'data: ' + json.dumps(payload, ensure_ascii=False) + '\n\n'
            await asyncio.sleep(3)
    return StreamingResponse(events(), media_type='text/event-stream',
                             headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'})


@app.get("/api/opportunities")
def get_opportunities(
    response: Response,
    server: MarketServer = "Americas",
    premium: bool = False,
    max_age_min: float = Query(60, gt=0, allow_inf_nan=False),
    city: TransportOrigin | None = None,
    all_cities: bool = False,
    profile: ItemProfile = "all",
    family: str | None = None,
    tier: int | None = Query(None, ge=4, le=8),
    enchantment: int | None = Query(None, ge=0, le=4),
    live: bool = False,
):
    if all_cities and city is not None:
        raise HTTPException(422, 'Escolha uma cidade ou todas as cidades')
    tax_pct = 4 if premium else 8
    ids = selected_ids(family, tier, enchantment, profile)
    try:
        raw_prices = fetch_prices(server, ids)
    except AodpFetchError as exc:
        return JSONResponse(status_code=502, content={"error": str(exc)})

    LIVE.seed(server, raw_prices)
    if live:
        raw_prices, _ = LIVE.snapshot(server, ids, city.value if city else None, max_age_min)

    response.headers['X-Prices-Fetched-At'] = str(cache_timestamp(server, ids))
    response.headers['X-Catalog-Queried'] = str(len(ids))
    response.headers['Cache-Control'] = 'no-store'
    if all_cities:
        return compute_all_city_opportunities(raw_prices, ITEM_NAMES, tax_pct, max_age_min, ITEM_WEIGHTS)
    if city is not None:
        return compute_city_opportunities(
            raw_prices, ITEM_NAMES, tax_pct, max_age_min, city.value, ITEM_WEIGHTS
        )
    return compute_opportunities(raw_prices, ITEM_NAMES, tax_pct, max_age_min, ITEM_WEIGHTS)


@app.get("/api/cargo-plan")
def get_cargo_plan(
    city: TransportOrigin,
    budget: int = Query(..., gt=0),
    available_weight: float = Query(..., gt=0, allow_inf_nan=False),
    server: MarketServer = "Americas",
    premium: bool = False,
    max_age_min: float = Query(60, gt=0, allow_inf_nan=False),
    max_qty_per_item: int = Query(5, gt=0),
    profile: ItemProfile = "all",
    family: str | None = None,
    tier: int | None = Query(None, ge=4, le=8),
    enchantment: int | None = Query(None, ge=0, le=4),
    live: bool = False,
    recent_only: bool = False,
    stress_drop_pct: float = Query(0, ge=0, le=90, allow_inf_nan=False),
    liquid_only: bool = False,
):
    tax_pct = 4 if premium else 8
    if recent_only:
        max_age_min = min(max_age_min, 2)
    ids = selected_ids(family, tier, enchantment, profile)
    try:
        raw_prices = fetch_prices(server, ids)
    except AodpFetchError as exc:
        return JSONResponse(status_code=502, content={"error": str(exc)})

    LIVE.seed(server, raw_prices)
    if live:
        raw_prices, _ = LIVE.snapshot(server, ids, city.value, max_age_min)

    opportunities = compute_city_opportunities(
        raw_prices, ITEM_NAMES, tax_pct, max_age_min, city.value, ITEM_WEIGHTS
    )
    opportunities = [opp for opp in opportunities if
                     opp['bm_price'] * (1 - stress_drop_pct / 100) * (1 - tax_pct / 100) > opp['city_price']
                     and opp['city_price_age_min'] >= 0 and opp['bm_price_age_min'] >= 0]
    if liquid_only:
        history = {}
        candidate_ids = list(dict.fromkeys(opp['item_id'] for opp in opportunities))
        try:
            for offset in range(0, len(candidate_ids), 50):
                summary = fetch_liquidity(server, candidate_ids[offset:offset + 50])
                history.update({(row['item_id'], row['quality']): row for row in summary['items']})
        except AodpFetchError:
            return JSONResponse(status_code=502, content={'error': 'Histórico indisponível. Nenhuma carga foi sugerida sem verificar a liquidez.'})
        opportunities = [{**opp, 'liquidity_qty_limit': history[(opp['item_id'], opp['quality'])]['suggested_qty_limit']}
                         for opp in opportunities
                         if history.get((opp['item_id'], opp['quality']), {}).get('liquid') is True]
    plan = optimize_cargo(opportunities, budget, available_weight, max_qty_per_item)

    if not opportunities:
        status = "no_opportunities"
    elif not plan["items"]:
        status = "no_item_fits"
    else:
        status = "ok"

    return {"status": status, **plan}


app.mount("/", StaticFiles(directory=str(BASE_DIR / "static"), html=True), name="static")
