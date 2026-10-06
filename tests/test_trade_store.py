import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
import trade_store

@pytest.fixture
def client(tmp_path,monkeypatch):
    monkeypatch.setattr(trade_store,'STORE',tmp_path/'trades.json')
    app=FastAPI();app.include_router(trade_store.router)
    return TestClient(app)

def row(id='a',outcome='pending'):
    return dict(id=id,server='Americas',item='Adaga',city='Lymhurst',quantity=28,purchase=125860,fees=5475,mode='order',outcome=outcome,received=200000 if outcome=='sold' else None,soldAt=1000 if outcome=='sold' else None)

def test_persistence_and_stale_browser_cannot_undo_sale(client):
    assert client.post('/api/trades',json={'changes':[{'record':row()}]}).status_code==200
    sold=client.post('/api/trades',json={'changes':[{'record':row(outcome='sold'),'revision':1}]})
    assert sold.status_code==200
    assert client.post('/api/trades',json={'changes':[{'record':row(),'revision':1}]}).status_code==409
    assert client.get('/api/trades').json()['items'][0]['outcome']=='sold'
    assert trade_store.STORE.exists()

def test_independent_browser_addition_preserves_existing(client):
    client.post('/api/trades',json={'changes':[{'record':row()}]})
    result=client.post('/api/trades',json={'changes':[{'record':row('b')}]})
    assert len(result.json()['items'])==2

def test_invalid_store_and_cross_origin_preserved(client):
    assert client.post('/api/trades',headers={'origin':'https://evil.example'},json={'changes':[]}).status_code==403
    trade_store.STORE.write_text('broken')
    assert client.get('/api/trades').status_code==503
    assert client.post('/api/trades',json={'changes':[]}).status_code==503
    assert trade_store.STORE.read_text()=='broken'
