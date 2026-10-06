"""Local visual-test server. Uses synthetic data on port 8768, never the live app port.
Run: python tests/ui_fixture.py
"""
import asyncio
import json
import time
from datetime import datetime, timezone
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
import uvicorn

app = FastAPI()
STATIC = Path(__file__).resolve().parents[1] / 'static'
started = time.time()
price_override = None
NAMES = [('T5_ARMOR_PLATE_SET1', 'Armadura de Soldado do Perito', 10800, 17980, 5.4),
         ('T4_MAIN_SWORD', 'Espada Larga do Adepto', 5000, 11500, 2.1),
         ('T6_HEAD_CLOTH_SET1', 'Capuz de Erudito do Mestre', 9200, 15400, .8),
         ('T7_ARMOR_CLOTH_SET2', 'Túnica de Clérigo Grão-Mestre', 33000, 51000, 3.2),
         ('T8_SHOES_LEATHER_SET1', 'Sapatos de Mercenário Ancião', 58000, 78000, 1.7),
         ('T4_OFF_SHIELD@1', 'Escudo do Adepto', 4500, 8600, 1.5)]

def prices(request):
    params=request.query_params
    cities=['Lymhurst','Bridgewatch','Martlock','Thetford','FortSterling'] if params.get('all_cities')=='true' else [params.get('city','Lymhurst')]
    tax=.04 if params.get('premium')=='true' else .08
    now=datetime.now(timezone.utc)
    result=[]
    for i,(item_id,name,buy,bm,weight) in enumerate(NAMES):
        tier=item_id[1]; enchant=item_id.split('@')[1] if '@' in item_id else '0'
        if params.get('tier') and params['tier']!=tier: continue
        if params.get('enchantment') and params['enchantment']!=enchant: continue
        for c,city in enumerate(cities):
            cost=buy+c*100
            price=bm+(price_override if price_override is not None else int((time.time()-started)//8)%5*100)
            age=18 if i==4 else .3
            observed=datetime.fromtimestamp(now.timestamp()-age*60,timezone.utc).isoformat()
            profit=round(price*(1-tax)-cost,2)
            result.append(dict(item_id=item_id,item_name=name,quality=i%3+1,source_city=city,
                city_price=cost,bm_price=price,profit=profit,margin_pct=round(profit/cost*100,2),
                weight=weight,profit_per_kg=round(profit/weight,2),
                city_price_age_min=age,bm_price_age_min=age,city_price_date=observed,bm_price_date=observed,
                city_price_source='api',bm_price_source='api'))
    return result

@app.post('/test/price')
def test_price(delta: int):
    global price_override
    price_override = delta
    return {'delta': delta}

@app.get('/api/catalog')
def catalog(): return dict(count=6375,families=['Armaduras','Armas'])
@app.get('/api/opportunities')
def opportunities(request:Request):
    return JSONResponse(prices(request),headers={'X-Catalog-Queried':'TEST','X-Prices-Fetched-At':str(time.time())})
@app.get('/api/live')
async def live(request:Request):
    async def events():
        while not await request.is_disconnected():
            yield 'data: '+json.dumps(dict(server=request.query_params.get('server','Americas'),status=dict(state='connected',last_message=time.time()),items=prices(request)))+'\n\n'
            await asyncio.sleep(8)
    return StreamingResponse(events(),media_type='text/event-stream')
@app.get('/api/liquidity')
def history(request:Request):
    return dict(window_start='2026-09-13',window_end='2026-09-19',items=[dict(item_id=item,quality=q,status='sufficient',frequent=True,units_per_reported_day=18,reported_days=7,active_days=7,weighted_price=17000,price_cv_pct=5,last_day='2026-09-19',price_history=[dict(date=f'2026-09-{d:02}',avg_price=p,item_count=18) for d,p in zip(range(13,20),[16500,16900,16700,17200,17500,17000,17800])]) for item in request.query_params.get('item_ids','').split(',') for q in range(1,6)])
@app.get('/api/cargo-plan')
def plan(request:Request): return dict(status='no_opportunities',items=[])
app.mount('/',StaticFiles(directory=STATIC,html=True),name='static')
if __name__=='__main__': uvicorn.run(app,host='127.0.0.1',port=8768)
