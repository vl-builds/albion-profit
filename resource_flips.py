"""Resource resale between player markets, independent of BM equipment scans."""
import json
import math
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from threading import Lock
from typing import Literal
import httpx
from fastapi import APIRouter, Query, HTTPException
from aodp_client import CITIES, SERVER_HOSTS, fetch_prices, reserve_request, AodpFetchError
from liquidity import summarize_history

router = APIRouter()
CATALOG = json.loads((Path(__file__).parent/'resource_catalog.json').read_text(encoding='utf-8'))
FAMILIES = {'WOOD':'Madeira','ORE':'Minério','FIBER':'Fibra','HIDE':'Peles','ROCK':'Pedra'}
_history_cache = {}
_history_lock = Lock()
City = Literal['all','Caerleon','Bridgewatch','Lymhurst','Martlock','Thetford','FortSterling']

def history_by_city(server, ids):
    now=datetime.now(timezone.utc)
    key=(server,tuple(ids),now.date().isoformat())
    with _history_lock:
        cached=_history_cache.get(key)
        if cached and time.monotonic()-cached[0]<900: return cached[1]
        payload=[]
        try:
            for start in range(0,len(ids),40):
                reserve_request()
                response=httpx.get(f'https://{SERVER_HOSTS[server]}/api/v2/stats/history/{",".join(ids[start:start+40])}.json',
                    params={'locations':','.join(CITIES),'qualities':'1','time-scale':24,
                            'date':str(now.date()-timedelta(days=7)), 'end_date':str(now.date())},
                    headers={'Accept-Encoding':'gzip'},timeout=20)
                response.raise_for_status()
                batch=response.json()
                if not isinstance(batch,list):raise ValueError()
                payload.extend(batch)
        except (httpx.HTTPError,ValueError) as exc:
            raise AodpFetchError('Histórico de recursos indisponível.') from exc
        result={}
        for city in CITIES:
            # Reuse validated UTC daily aggregation; no BM liquidity thresholds are used.
            selected=[{**r,'location':'Black Market'} for r in payload if isinstance(r,dict)
                      and str(r.get('location','')).replace(' ','')==city]
            for row in summarize_history(selected,ids,now)['items']:
                if row['quality']==1:
                    result[(row['item_id'],city)]={k:row[k] for k in
                       ('reported_days','units_per_reported_day','weighted_price','last_day')}
        if len(_history_cache)>=8:_history_cache.pop(next(iter(_history_cache)))
        _history_cache[key]=(time.monotonic(),result)
        return result

def quote(row, side, now, max_age):
    try:
        price=row[side+'_price_'+('min' if side=='sell' else 'max')]
        timestamp=row[side+'_price_'+('min' if side=='sell' else 'max')+'_date']
        date=datetime.fromisoformat(timestamp.replace('Z','+00:00'))
        if date.tzinfo is None:date=date.replace(tzinfo=timezone.utc)
        age=(now-date).total_seconds()/60
        if not isinstance(price,(int,float)) or not math.isfinite(price) or price<=0 or not 0<=age<=max_age:return None
        return price,date.astimezone(timezone.utc).isoformat(),round(age,1)
    except (ValueError,TypeError,KeyError,AttributeError):return None

def opportunities(raw, catalog, *, origin='all', destination='all', buy_mode='direct', sell_mode='order',
                  premium=False, max_age=60, quantity=100, budget=1000000, now=None):
    now=now or datetime.now(timezone.utc)
    grouped={}; meta={i['id']:i for i in catalog}
    for row in raw:
        city=str(row.get('city','')).replace(' ','')
        if city not in CITIES or row.get('quality')!=1 or row.get('item_id') not in meta:continue
        grouped.setdefault(row['item_id'],{})[city]=row
    result=[]
    for id,cities in grouped.items():
        for source,source_row in cities.items():
            if origin!='all' and source!=origin:continue
            buy=quote(source_row,'sell' if buy_mode=='direct' else 'buy',now,max_age)
            if not buy:continue
            for target,target_row in cities.items():
                if destination!='all' and target!=destination:continue
                if source==target and not (buy_mode=='order' and sell_mode=='order'):continue
                sell=quote(target_row,'buy' if sell_mode=='instant' else 'sell',now,max_age)
                if not sell:continue
                buy_fee=buy[0]*.025 if buy_mode=='order' else 0
                sell_fee=sell[0]*.025 if sell_mode=='order' else 0
                capital=buy[0]+buy_fee+sell_fee
                net=sell[0]*(.96 if premium else .92)-capital
                qty=min(quantity,math.floor(budget/capital))
                if net<=0 or qty<1:continue
                result.append({**meta[id],'source_city':source,'destination_city':target,
                    'buy_price':buy[0],'sell_price':sell[0],'buy_date':buy[1],'sell_date':sell[1],
                    'buy_age':buy[2],'sell_age':sell[2],'unit_profit':round(net,2),'roi':round(net/capital*100,2),
                    'quantity':qty,'capital':round(capital*qty,2),'profit':round(net*qty,2),
                    'setup_fees':round((buy_fee+sell_fee)*qty,2)})
    return sorted(result,key=lambda r:r['profit'],reverse=True)

@router.get('/api/resources/catalog')
def catalog():return {'items':CATALOG,'families':FAMILIES,'cities':CITIES}

@router.get('/api/resources/opportunities')
def scan(server:Literal['Americas','Europe']='Americas', family:Literal['all','WOOD','ORE','FIBER','HIDE','ROCK']='all',
         tier:int=Query(4,ge=2,le=8), enchantment:int=Query(0,ge=0,le=4), origin:City='all', destination:City='all',
         buy_mode:Literal['direct','order']='direct',sell_mode:Literal['instant','order']='order',premium:bool=False,
         max_age:float=Query(60,gt=0,le=1440,allow_inf_nan=False),quantity:int=Query(100,ge=1,le=1000000),
         budget:float=Query(1000000,gt=0,le=1000000000,allow_inf_nan=False)):
    selected=[i for i in CATALOG if i['tier']==tier and i['enchantment']==enchantment and (family=='all' or i['family']==family)]
    if not selected:return {'items':[],'history_error':None,'queried':0}
    ids=[i['id'] for i in selected]
    try:raw=fetch_prices(server,ids)
    except AodpFetchError as exc:raise HTTPException(502,'Falha ao consultar preços dos recursos.') from exc
    rows=opportunities(raw,selected,origin=origin,destination=destination,buy_mode=buy_mode,sell_mode=sell_mode,
                      premium=premium,max_age=max_age,quantity=quantity,budget=budget)
    history_error=None
    try:history=history_by_city(server,ids) if rows else {}
    except AodpFetchError as exc:history={};history_error=str(exc)
    for row in rows:row['history']=history.get((row['id'],row['destination_city']))
    return {'items':rows,'history_error':history_error,'queried':len(ids),'generated_at':datetime.now(timezone.utc).isoformat()}
