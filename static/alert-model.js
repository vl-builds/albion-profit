(function (root) {
  const risk = typeof module !== 'undefined' ? require('./risk-model.js') : root.RiskModel;
  class Alerts {
    constructor() { this.sent = new Map(); }
    detect(items, scope, limits, now) {
      if (![limits.profit, limits.roi, limits.age].every(Number.isFinite) ||
          limits.profit <= 0 || limits.roi < 0 || limits.age <= 0) return [];
      for (const [key, value] of this.sent) if (now - value.at >= 86400000) this.sent.delete(key);
      const hits = [];
      for (const item of items) {
        if (limits.requireLiquidity && item.liquidity?.liquid !== true) continue;
        if (!risk.evaluate(item, limits.premium === true, limits.drop ?? 10, now).eligible) continue;
        if (![item.profit, item.margin_pct, item.sourceObserved, item.bmObserved].every(Number.isFinite) ||
            item.profit < limits.profit || item.margin_pct < limits.roi ||
            now - Math.min(item.sourceObserved, item.bmObserved) > limits.age * 60000 ||
            Math.max(item.sourceObserved, item.bmObserved) > now) continue;
        const key = `${scope}:${item.item_id}:${item.quality}:${item.source_city || ''}`;
        const last = this.sent.get(key);
        // Repeat only for a material improvement backed by a newer observation.
        if (last && (now - last.at < 900000 || item.profit < last.profit * 1.2 ||
            Math.max(item.sourceObserved, item.bmObserved) <= last.observed)) continue;
        this.sent.set(key, {at: now, profit: item.profit, observed: Math.max(item.sourceObserved, item.bmObserved)});
        hits.push({...item, alertedAt: now});
      }
      if (this.sent.size > 20000) this.sent = new Map([...this.sent].slice(-20000));
      return hits.sort((a, b) => b.profit - a.profit);
    }
  }
  if (typeof module !== 'undefined') module.exports = {Alerts};
  else root.AlertModel = {Alerts};
})(globalThis);
