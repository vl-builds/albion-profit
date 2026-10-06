(function (root) {
  const RECENT_MINUTES = 2;
  function evaluate(item, premium, dropPct = 10, now = Date.now()) {
    const cost = item.confirmedCost ?? item.estimatedCost ?? item.city_price;
    const bm = item.bmPrice ?? item.bm_price;
    const factor = premium ? 0.96 : 0.92;
    const valid = Number.isFinite(cost) && cost > 0 && Number.isFinite(bm) && bm > 0 &&
      Number.isFinite(dropPct) && dropPct >= 0 && dropPct <= 90;
    const recent = [item.sourceObserved, item.bmObserved].every(time =>
      Number.isFinite(time) && time <= now && now - time <= RECENT_MINUTES * 60000);
    const breakEven = valid ? Math.ceil(cost * 100 / (premium ? 96 : 92)) : null;
    const stressedProfit = valid ? bm * (1 - dropPct / 100) * factor - cost : null;
    const dropRoom = valid ? (1 - breakEven / bm) * 100 : null;
    return {recent, valid, breakEven, stressedProfit, dropRoom,
      eligible: valid && recent && stressedProfit > 0};
  }
  const api = {evaluate, RECENT_MINUTES};
  if (typeof module !== 'undefined') module.exports = api;
  else root.RiskModel = api;
})(globalThis);
