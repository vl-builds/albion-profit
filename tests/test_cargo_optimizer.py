from cargo_optimizer import optimize_cargo


def _opp(item_id, city_price, bm_price, profit, margin_pct, weight, profit_per_kg,
         quality=1, item_name=None, city_age=5.0, bm_age=5.0):
    return {
        "item_id": item_id,
        "item_name": item_name or item_id,
        "quality": quality,
        "city_price": city_price,
        "bm_price": bm_price,
        "profit": profit,
        "margin_pct": margin_pct,
        "weight": weight,
        "profit_per_kg": profit_per_kg,
        "city_price_age_min": city_age,
        "bm_price_age_min": bm_age,
    }


def test_never_exceeds_available_weight():
    opps = [_opp("A", 1000, 1500, 500, 50.0, 10.0, 50.0)]
    plan = optimize_cargo(opps, budget=1_000_000, available_weight=25, max_qty_per_item=10)
    assert plan["totals"]["weight_used"] <= 25


def test_never_exceeds_budget():
    opps = [_opp("A", 1000, 1500, 500, 50.0, 1.0, 500.0)]
    plan = optimize_cargo(opps, budget=2500, available_weight=1000, max_qty_per_item=10)
    assert plan["totals"]["capital_used"] <= 2500


def test_respects_max_qty_per_item():
    opps = [_opp("A", 100, 200, 100, 100.0, 1.0, 100.0)]
    plan = optimize_cargo(opps, budget=1_000_000, available_weight=1000, max_qty_per_item=3)
    assert plan["items"][0]["quantity"] == 3


def test_weight_constrained_case_prefers_profit_per_kg_strategy():
    opps = [
        _opp("A", 100, 300, 200, 200.0, 1.0, 200.0),
        _opp("B", 100, 150, 50, 50.0, 10.0, 5.0),
    ]
    plan = optimize_cargo(opps, budget=1_000_000, available_weight=10, max_qty_per_item=10)
    assert plan["totals"]["strategy_used"] == "profit_per_kg"
    assert plan["items"][0]["item_id"] == "A"


def test_budget_constrained_case_can_beat_profit_per_kg_alone():
    # A has the best profit_per_kg (200) but eats the entire budget for a
    # single unit worth only 100 profit. B has a lower profit_per_kg (100)
    # but is cheap enough that 5 units fit the same budget for 1000 total
    # profit -- a pure profit_per_kg-first greedy would leave that on the table.
    opps = [
        _opp("A", 5000, 5300, 100, 2.0, 0.5, 200.0),
        _opp("B", 1000, 1300, 200, 20.0, 2.0, 100.0),
    ]
    plan = optimize_cargo(opps, budget=5000, available_weight=1000, max_qty_per_item=10)
    assert plan["totals"]["strategy_used"] != "profit_per_kg"
    assert plan["items"][0]["item_id"] == "B"
    assert plan["totals"]["profit"] == 1000


def test_exact_weight_boundary_fits_without_rounding_error():
    opps = [_opp("A", 100, 200, 100, 100.0, 2.5, 40.0)]
    plan = optimize_cargo(opps, budget=1_000_000, available_weight=25.0, max_qty_per_item=10)
    assert plan["items"][0]["quantity"] == 10
    assert plan["totals"]["weight_used"] == 25.0


def test_item_with_missing_weight_is_skipped_safely():
    opps = [_opp("A", 100, 200, 100, 100.0, None, None)]
    plan = optimize_cargo(opps, budget=1_000_000, available_weight=1000, max_qty_per_item=10)
    assert plan["items"] == []
    assert plan["totals"]["profit"] == 0


def test_totals_match_sum_of_items_exactly():
    opps = [
        _opp("A", 1000, 1500, 500, 50.0, 5.0, 100.0),
        _opp("B", 2000, 2600, 600, 30.0, 8.0, 75.0),
    ]
    plan = optimize_cargo(opps, budget=1_000_000, available_weight=1000, max_qty_per_item=3)
    expected_cost = sum(i["total_cost"] for i in plan["items"])
    expected_weight = round(sum(i["total_weight"] for i in plan["items"]), 2)
    assert plan["totals"]["capital_used"] == expected_cost
    assert plan["totals"]["weight_used"] == expected_weight


def test_binding_constraint_none_when_ran_out_of_candidates():
    opps = [_opp("A", 100, 200, 100, 100.0, 1.0, 100.0)]
    plan = optimize_cargo(opps, budget=1_000_000, available_weight=1000, max_qty_per_item=1)
    assert plan["totals"]["binding_constraint"] == "none"


def test_empty_opportunities_returns_zeroed_totals():
    plan = optimize_cargo([], budget=100_000, available_weight=500, max_qty_per_item=5)
    assert plan["items"] == []
    assert plan["totals"]["capital_used"] == 0
    assert plan["totals"]["capital_remaining"] == 100_000
    assert plan["totals"]["weight_remaining"] == 500
    assert plan["totals"]["binding_constraint"] == "none"
    assert plan["totals"]["strategy_used"] is None


def test_cargo_excludes_losses_and_break_even_items_even_with_spare_capacity():
    opportunities = [
        _opp("profit", 100, 200, 100, 100.0, 1.0, 100.0),
        _opp("loss", 100, 50, -50, -50.0, 1.0, -50.0),
        _opp("break_even", 100, 100, 0, 0.0, 1.0, 0.0),
    ]
    plan = optimize_cargo(opportunities, budget=10000, available_weight=100)
    assert [item["item_id"] for item in plan["items"]] == ["profit"]
    assert plan["totals"]["profit"] == 500
    assert plan["totals"]["capital_used"] == 500


def test_only_unprofitable_items_returns_empty_cargo():
    opportunities = [_opp("loss", 100, 50, -50, -50.0, 1.0, -50.0)]
    plan = optimize_cargo(opportunities, budget=10000, available_weight=100)
    assert plan["items"] == []
    assert plan["totals"]["profit"] == 0
    assert plan["totals"]["capital_remaining"] == 10000
