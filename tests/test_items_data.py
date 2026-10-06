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
