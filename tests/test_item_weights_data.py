import json
import math
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent


def _base_item_id(item_id):
    return item_id.split("@")[0]


def test_item_weights_json_matches_items_json_base_ids_exactly():
    items = json.loads((BASE_DIR / "items.json").read_text(encoding="utf-8"))
    weights = json.loads((BASE_DIR / "item_weights.json").read_text(encoding="utf-8"))

    expected_base_ids = {_base_item_id(item["id"]) for item in items}
    assert set(weights.keys()) == expected_base_ids


def test_item_weights_are_all_positive_finite_numbers():
    weights = json.loads((BASE_DIR / "item_weights.json").read_text(encoding="utf-8"))
    assert len(weights) > 0
    for value in weights.values():
        assert isinstance(value, (int, float))
        assert math.isfinite(value)
        assert value > 0
