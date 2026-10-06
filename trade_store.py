"""Shared local trade ledger with atomic writes and optimistic concurrency."""
import json
import os
from pathlib import Path
from threading import Lock
from typing import Literal
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field

router = APIRouter()
STORE = Path(__file__).parent / 'data' / 'trades.json'
_lock = Lock()

class Trade(BaseModel):
    model_config = ConfigDict(extra='ignore', allow_inf_nan=False)
    id: str = Field(min_length=1, max_length=200)
    server: Literal['Americas', 'Europe']
    item: str = Field(min_length=1, max_length=200)
    city: str = Field(max_length=100)
    quantity: int = Field(gt=0)
    purchase: float = Field(gt=0)
    fees: float = Field(ge=0)
    mode: Literal['instant', 'order']
    outcome: Literal['pending', 'sold', 'lost']
    received: float | None = Field(default=None, ge=0)
    boughtAt: float | None = None
    listedAt: float | None = None
    soldAt: float | None = None
    targetPrice: float | None = Field(default=None, gt=0)
    expectedTax: float | None = Field(default=None, ge=0, lt=100)
    futureFees: float | None = Field(default=None, ge=0)
    estimatedCosts: bool = False
    estimatedReceived: bool = False
    estimatedSoldAt: bool = False
    archived: bool = False

class Change(BaseModel):
    record: Trade
    revision: int = Field(default=0, ge=0)

class Update(BaseModel):
    changes: list[Change] = Field(max_length=1000)

def read_store():
    if not STORE.exists():
        return []
    try:
        rows = json.loads(STORE.read_text(encoding='utf-8'))
        if not isinstance(rows, list) or len(rows)>1000 or len({r['id'] for r in rows})!=len(rows):
            raise ValueError()
        for row in rows:
            Trade.model_validate(row)
        return rows
    except (ValueError, KeyError, TypeError):
        raise HTTPException(503, 'Registro compartilhado inválido; arquivo preservado.')

@router.get('/api/trades')
def get_trades():
    with _lock:
        return {'items': read_store()}

@router.post('/api/trades')
def update_trades(update: Update, request: Request):
    origin = request.headers.get('origin')
    if origin and origin not in (f'http://127.0.0.1:{request.url.port}', f'http://localhost:{request.url.port}'):
        raise HTTPException(403, 'Origem não autorizada.')
    with _lock:
        rows = {r['id']: r for r in read_store()}
        if len({c.record.id for c in update.changes}) != len(update.changes):
            raise HTTPException(422, 'IDs repetidos.')
        for change in update.changes:
            t = change.record
            if rows.get(t.id, {}).get('_rev',0) != change.revision:
                raise HTTPException(409, 'Registro atualizado em outro navegador. Recarregue antes de editar.')
            if t.outcome != 'pending' and (t.soldAt is None or t.received is None):
                raise HTTPException(422, 'Encerramento sem data ou receita.')
            if t.outcome == 'pending' and t.received is not None:
                raise HTTPException(422, 'Receita em operação pendente.')
            rows[t.id] = {**t.model_dump(), '_rev':change.revision+1}
        if len(rows)>1000:
            raise HTTPException(422, 'Limite de 1000 lotes.')
        STORE.parent.mkdir(exist_ok=True)
        temporary = STORE.with_suffix('.tmp')
        temporary.write_text(json.dumps(list(rows.values()),ensure_ascii=False,indent=2),encoding='utf-8')
        os.replace(temporary,STORE)
        return {'items':list(rows.values())}
