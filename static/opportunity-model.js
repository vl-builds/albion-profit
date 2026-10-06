// Session history for a single query; persistent favorites are managed separately.
(function (root) {
  const identity = item => `${item.item_id}:${item.quality}${item.source_city ? ':' + item.source_city : ''}`;
  function staleReason(item, now, maxAge, live) {
    const sides = [
      ['compra', item.sourceObserved, item.city_price_source],
      ['BM', item.bmObserved, item.bm_price_source],
    ];
    const old = sides.filter(([, seen]) => now - seen > maxAge * 60000);
    if (old.length) return `Último preço de ${old.map(s => s[0]).join(' e ')} acima da idade máxima.`;
    if (live && sides.some(([, seen, source]) => source === 'live' && now - seen >= 600000))
      return 'Observação ao vivo anterior fora da janela de 10 minutos; aguardando outro par de preços.';
    return '';
  }
  function lossReason(before, after) {
    const changes = [];
    if (before && after.bm_price < before.bm_price) changes.push('oferta BM caiu');
    if (before && after.city_price > before.city_price) changes.push('compra subiu');
    return 'Lucro líquido deixou de ser positivo' + (changes.length ? `: ${changes.join(' e ')}` : '') + '.';
  }
  class Tracker {
    constructor() { this.active = new Map(); this.recent = new Map(); }
    archive(item, reason, now) {
      const key = identity(item), previous = this.recent.get(key);
      this.recent.set(key, {item: {...item}, reason, leftAt: previous?.leftAt ?? now});
    }
    update(items, now, maxAge, live) {
      const next = new Map(items.map(item => [identity(item), item]));
      for (const [key, previous] of this.active) {
        if (!next.has(key)) this.archive(previous,
          staleReason(previous, now, maxAge, live) || 'Sem par de preços válido nesta atualização. Venda não confirmada.', now);
      }
      for (const [key, item] of next) {
        if (item.profit > 0) this.recent.delete(key);
        else if (this.active.get(key)?.profit > 0 || this.recent.has(key))
          this.archive(item, this.active.get(key)?.profit <= 0 && this.recent.has(key) ?
            this.recent.get(key).reason : lossReason(this.active.get(key), item), now);
      }
      this.active = next;
      this.expire(now, maxAge, live);
    }
    expire(now, maxAge, live) {
      for (const [key, item] of this.active) {
        const reason = staleReason(item, now, maxAge, live);
        if (reason) { this.archive(item, reason, now); this.active.delete(key); }
      }
      for (const [key, entry] of this.recent) if (now - entry.leftAt >= 3600000) this.recent.delete(key);
      const ordered = [...this.recent].sort((a, b) => b[1].leftAt - a[1].leftAt);
      this.recent = new Map(ordered.slice(0, 200));
    }
    get items() { return [...this.active.values()]; }
  }
  function loadFavorites(value) {
    if (!Array.isArray(value) || value.length > 100) throw new Error('Invalid favorites');
    const result = new Map();
    for (const item of value) {
      if (!item || typeof item.item_id !== 'string' || !/^T[4-8]_[A-Z0-9_]+(?:@[1-4])?$/.test(item.item_id) ||
          typeof item.item_name !== 'string' || !Number.isInteger(item.quality) || item.quality < 1 || item.quality > 5 ||
          !['city_price', 'bm_price', 'profit', 'sourceObserved', 'bmObserved'].every(key => Number.isFinite(item[key])) ||
          item.city_price <= 0 || item.bm_price <= 0) throw new Error('Invalid favorite');
      result.set(identity(item), item);
    }
    return result;
  }
  const api = {Tracker, identity, staleReason, loadFavorites};
  if (typeof module !== 'undefined') module.exports = api;
  else root.OpportunityModel = api;
})(globalThis);
