// Shared by the browser and Node regression tests. Prices are silver per unit.
(function (root) {
  const round = value => Math.round((value + Number.EPSILON) * 100) / 100;
  function evaluate(items, premium, budget, capacity) {
    const netFactor = premium ? 0.96 : 0.92;
    const rows = items.map(item => {
      const cost = item.confirmedCost ?? item.estimatedCost;
      return {
        ...item, cost,
        totalCost: cost * item.quantity,
        totalWeight: item.weight == null ? null : round(item.weight * item.quantity),
        breakEven: Math.ceil(cost * 100 / (premium ? 96 : 92)),
        profit: round((item.bmPrice * netFactor - cost) * item.quantity),
      };
    });
    const capital = rows.reduce((sum, row) => sum + row.totalCost, 0);
    const weight = round(rows.reduce((sum, row) => sum + (row.totalWeight ?? 0), 0));
    const scenarios = [0, 5, 10, 20].map(drop => ({
      drop,
      profit: round(rows.reduce((sum, row) => sum +
        (row.bmPrice * (1 - drop / 100) * netFactor - row.cost) * row.quantity, 0)),
    }));
    return {
      rows, capital, weight, scenarios,
      roi: capital ? round(scenarios[0].profit / capital * 100) : 0,
      overBudget: capital > budget,
      overWeight: weight > capacity,
      unknownWeight: rows.some(row => row.weight == null),
      unconfirmed: rows.filter(row => row.confirmedCost == null).length,
    };
  }
  const api = { evaluate, key: (server, city) => `albion-cargo-v1:${server}:${city}` };
  if (typeof module !== "undefined") module.exports = api;
  else root.CargoModel = api;
})(globalThis);
