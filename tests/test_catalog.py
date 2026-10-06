from fastapi.testclient import TestClient
import main
from scripts.generate_catalog import generate


def test_catalog_variants_have_consistent_metadata_and_weights():
    assert len(main.ITEMS) > 5000
    assert set(main.ITEM_IDS) == set(main.ITEM_DETAILS)
    for item_id, info in main.ITEM_DETAILS.items():
        base, _, level = item_id.partition('@')
        assert info['tier'] == int(base[1])
        assert info['enchantment'] == int(level or 0)
        assert main.ITEM_WEIGHTS[base] > 0
    assert 'T4_2H_HAMMER' in main.ITEM_IDS
    assert 'T4_CAPE' in main.ITEM_IDS


def test_generator_excludes_tools_and_does_not_invent_enchantments():
    xml = b'''<items>
      <weapon uniquename="T4_MAIN_SWORD" tier="4" weight="5.1" shopcategory="weapons" shopsubcategory1="sword">
        <enchantments><enchantment enchantmentlevel="1"/></enchantments>
      </weapon>
      <weapon uniquename="T4_TOOL_PICK" tier="4" weight="5" shopcategory="gathering" shopsubcategory1="ore"/>
    </items>'''
    metadata = [{'UniqueName': i, 'LocalizedNames': {'PT-BR': 'Espada'}}
                for i in ['T4_MAIN_SWORD', 'T4_MAIN_SWORD@1']]
    items, details, weights = generate(xml, metadata)
    assert [i['id'] for i in items] == ['T4_MAIN_SWORD', 'T4_MAIN_SWORD@1']
    assert weights == {'T4_MAIN_SWORD': 5.1}


def test_scan_and_plan_query_same_filtered_catalog(monkeypatch):
    calls = []
    def fetch(server, ids):
        calls.append(ids)
        return []
    monkeypatch.setattr(main, 'fetch_prices', fetch)
    client = TestClient(main.app)
    filters = {'family': 'Espadas', 'tier': 5, 'enchantment': 2, 'city': 'Lymhurst'}
    response = client.get('/api/opportunities', params=filters)
    assert response.status_code == 200
    assert response.headers['X-Catalog-Queried'] == str(len(calls[0]))
    assert client.get('/api/cargo-plan', params={**filters, 'budget': 100000, 'available_weight': 20}).status_code == 200
    assert calls[0] == calls[1] and calls[0]
    assert all(i.startswith('T5_') and i.endswith('@2') and main.ITEM_DETAILS[i]['family'] == 'Espadas' for i in calls[0])
    assert client.get('/api/opportunities?family=invalid').status_code == 422
    assert client.get('/api/opportunities?tier=9').status_code == 422
    assert client.get('/api/opportunities?enchantment=5').status_code == 422
