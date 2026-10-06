STRATEGY_SORT_KEYS = {
    "profit_per_kg": "profit_per_kg",
    "roi": "margin_pct",
    "profit": "profit",
}


def _allocate_greedy(opportunities, budget, available_weight_g, max_qty_per_item, sort_key):
    candidates = sorted(
        (o for o in opportunities if o.get("weight") and o["profit"] > 0),
        key=lambda o: o[sort_key],
        reverse=True,
    )

    remaining_budget = budget
    remaining_weight_g = available_weight_g
    items = []

    for opp in candidates:
        unit_cost = opp["city_price"]
        unit_weight_g = round(opp["weight"] * 1000)
        if unit_cost <= 0 or unit_weight_g <= 0:
            continue

        max_by_budget = remaining_budget // unit_cost
        max_by_weight = remaining_weight_g // unit_weight_g
        quantity = min(max_qty_per_item, max_by_budget, max_by_weight,
                       opp.get('liquidity_qty_limit', max_qty_per_item))

        if quantity <= 0:
            continue

        total_cost = quantity * unit_cost
        total_weight_g = quantity * unit_weight_g

        items.append({
            "item_id": opp["item_id"],
            "item_name": opp["item_name"],
            "quality": opp["quality"],
            "liquidity_qty_limit": opp.get('liquidity_qty_limit'),
            "quantity": quantity,
            "unit_cost": unit_cost,
            "total_cost": total_cost,
            "bm_unit_price": opp["bm_price"],
            "unit_weight": opp["weight"],
            "total_weight": round(total_weight_g / 1000, 2),
            "unit_profit": opp["profit"],
            "total_profit": round(opp["profit"] * quantity, 2),
            "roi_pct": opp["margin_pct"],
            "profit_per_kg": opp["profit_per_kg"],
            "source_age_min": opp["city_price_age_min"],
            "bm_age_min": opp["bm_price_age_min"],
            "city_price_date": opp.get('city_price_date'),
            "bm_price_date": opp.get('bm_price_date'),
            "city_price_source": opp.get('city_price_source', 'api'),
            "bm_price_source": opp.get('bm_price_source', 'api'),
        })

        remaining_budget -= total_cost
        remaining_weight_g -= total_weight_g

    capital_used = budget - remaining_budget
    weight_used_g = available_weight_g - remaining_weight_g
    profit = round(sum(i["total_profit"] for i in items), 2)

    return {
        "items": items,
        "capital_used": capital_used,
        "capital_remaining": remaining_budget,
        "weight_used_g": weight_used_g,
        "weight_remaining_g": remaining_weight_g,
        "profit": profit,
    }


def _binding_constraint(budget_utilization_pct, weight_utilization_pct):
    if budget_utilization_pct < 90 and weight_utilization_pct < 90:
        return "none"
    if abs(budget_utilization_pct - weight_utilization_pct) <= 2:
        return "both"
    return "weight" if weight_utilization_pct > budget_utilization_pct else "capital"


def optimize_cargo(opportunities, budget, available_weight, max_qty_per_item=5):
    available_weight_g = round(available_weight * 1000)

    plans = {
        name: _allocate_greedy(opportunities, budget, available_weight_g, max_qty_per_item, sort_key)
        for name, sort_key in STRATEGY_SORT_KEYS.items()
    }

    best_strategy = max(plans, key=lambda name: plans[name]["profit"])
    best = plans[best_strategy]
    has_items = bool(best["items"])

    weight_used = round(best["weight_used_g"] / 1000, 2)
    weight_remaining = round(best["weight_remaining_g"] / 1000, 2)
    budget_utilization_pct = round(best["capital_used"] / budget * 100, 1) if budget else 0
    weight_utilization_pct = round(best["weight_used_g"] / available_weight_g * 100, 1) if available_weight_g else 0

    return {
        "items": best["items"],
        "totals": {
            "capital_used": best["capital_used"],
            "capital_remaining": best["capital_remaining"],
            "weight_used": weight_used,
            "weight_remaining": weight_remaining,
            "budget_utilization_pct": budget_utilization_pct,
            "weight_utilization_pct": weight_utilization_pct,
            "profit": best["profit"],
            "roi_pct": round(best["profit"] / best["capital_used"] * 100, 2) if best["capital_used"] else 0,
            "binding_constraint": _binding_constraint(budget_utilization_pct, weight_utilization_pct) if has_items else "none",
            "strategy_used": best_strategy if has_items else None,
        },
    }
