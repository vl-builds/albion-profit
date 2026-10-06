"""Generate market equipment candidates from an ao-bin-dumps checkout/download.

Usage: python scripts/generate_catalog.py PATH_WITH_ITEMS_XML_AND_ITEMS_JSON
The JSON input is formatted/items.json from the same source revision.
Only actual XML enchantments also present in the metadata are included.
BM eligibility is confirmed at scan time by a positive observed BM buy price.
"""
import hashlib
import json
import math
import sys
from pathlib import Path
import xml.etree.ElementTree as ET

BASE = Path(__file__).resolve().parent.parent
FAMILIES = {
    'sword': 'Espadas', 'axe': 'Machados', 'bow': 'Arcos', 'crossbow': 'Bestas',
    'dagger': 'Adagas', 'spear': 'Lanças', 'hammer': 'Martelos', 'mace': 'Maças',
    'quarterstaff': 'Bastões', 'knuckles': 'Luvas de guerra',
    'arcanestaff': 'Cajados arcanos', 'cursestaff': 'Cajados amaldiçoados',
    'firestaff': 'Cajados de fogo', 'froststaff': 'Cajados de gelo',
    'holystaff': 'Cajados sagrados', 'naturestaff': 'Cajados da natureza',
    'shapeshifterstaff': 'Cajados metamorfos',
}


def generate(xml_bytes, metadata):
    names = {i['UniqueName']: i.get('LocalizedNames') or {} for i in metadata}
    items, details, weights = [], {}, {}
    for node in ET.fromstring(xml_bytes):
        tier = int(node.get('tier', '0'))
        category, sub = node.get('shopcategory'), node.get('shopsubcategory1', '')
        if not 4 <= tier <= 8 or node.get('showinmarketplace') == 'false':
            continue
        if node.tag not in {'weapon', 'equipmentitem', 'transformationweapon'}:
            continue
        family = FAMILIES.get(sub) if category == 'weapons' else None
        if category in {'head', 'armors', 'shoes'} and sub.startswith(('plate_', 'cloth_', 'leather_')):
            family = {'head': 'Cabeça', 'armors': 'Armaduras', 'shoes': 'Calçados'}[category]
        if category == 'offhands' and sub in {'shieldtype', 'booktype', 'torchtype'}:
            family = 'Mãos secundárias'
        if category == 'capes' and sub.startswith('accessoires_capes_'):
            family = 'Capas'
        if category == 'bags' and sub in {'bags', 'satchels'}:
            family = 'Bolsas'
        if not family:
            continue
        base_id = node.attrib['uniquename']
        if 'PROTOTYPE' in base_id:
            continue
        weight = float(node.attrib['weight'])
        if not math.isfinite(weight) or weight <= 0:
            raise ValueError(f'Invalid weight: {base_id}')
        levels = [0] + [int(e.attrib['enchantmentlevel']) for e in node.findall('enchantments/enchantment')]
        for level in levels:
            item_id = base_id + (f'@{level}' if level else '')
            if item_id not in names:
                raise ValueError(f'Missing metadata: {item_id}')
            localized = names[item_id] or names.get(base_id, {})
            name = localized.get('PT-BR') or localized.get('EN-US')
            if not name:
                raise ValueError(f'Missing name: {item_id}')
            items.append({'id': item_id, 'name': name})
            details[item_id] = {'family': family, 'tier': tier, 'enchantment': level}
            weights[base_id] = weight
    items.sort(key=lambda i: i['id'])
    if len(items) != len(details) or not items:
        raise ValueError('Empty or duplicate catalog')
    return items, details, weights


if __name__ == '__main__':
    source = Path(sys.argv[1])
    xml_bytes = (source / 'items.xml').read_bytes()
    json_bytes = (source / 'items.json').read_bytes()
    items, details, weights = generate(xml_bytes, json.loads(json_bytes))
    manifest = {'source': 'https://github.com/ao-data/ao-bin-dumps',
                'xml_sha256': hashlib.sha256(xml_bytes).hexdigest(),
                'metadata_sha256': hashlib.sha256(json_bytes).hexdigest(),
                'items': len(items), 'base_items': len(weights),
                'eligibility': 'Equipment candidates; requires observed positive BM buy price'}
    for name, value in [('items.json', items), ('item_details.json', details),
                        ('item_weights.json', weights), ('catalog_source.json', manifest)]:
        (BASE / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Generated {len(items)} variants / {len(weights)} base items')
