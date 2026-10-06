import json
import re
import sys
from pathlib import Path

import httpx

BASE_DIR = Path(__file__).parent.parent
ITEMS_XML_URL = "https://raw.githubusercontent.com/ao-data/ao-bin-dumps/master/items.xml"


def base_item_id(item_id):
    return item_id.split("@")[0]


def main():
    items = json.loads((BASE_DIR / "items.json").read_text(encoding="utf-8"))
    base_ids = sorted({base_item_id(item["id"]) for item in items})

    print(f"Downloading {ITEMS_XML_URL} ...", file=sys.stderr)
    response = httpx.get(ITEMS_XML_URL, timeout=60.0)
    response.raise_for_status()
    xml_content = response.text

    weights = {}
    for base_id in base_ids:
        pattern = rf'uniquename="{re.escape(base_id)}"[^>]*weight="([\d.]+)"'
        match = re.search(pattern, xml_content)
        if not match:
            raise SystemExit(f"Weight not found for {base_id}")
        weights[base_id] = float(match.group(1))

    (BASE_DIR / "item_weights.json").write_text(
        json.dumps(weights, indent=2, ensure_ascii=False, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(weights)} weights to item_weights.json")


if __name__ == "__main__":
    main()
