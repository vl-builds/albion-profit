(function(root) {
  const api = {
    toggle(criteria, key) {
      const textKeys = ['item_name', 'source_city'];
      criteria = textKeys.includes(key) ? criteria.filter(rule => rule.key === key)
        : criteria.filter(rule => !textKeys.includes(rule.key));
      const current = criteria.find(rule => rule.key === key);
      if (!current) return [...criteria, {key, desc: true}];
      return current.desc ? criteria.map(rule => rule.key === key ? {...rule, desc: false} : rule)
        : criteria.filter(rule => rule.key !== key);
    },
    rank(rows, criteria) {
      if (criteria.length < 2) return [...rows].sort((a,b) => api.compare(a,b,criteria));
      // Compare relative positions, so silver and percentages have equal weight.
      // Missing values cannot improve a row's rank: incomplete rows come last.
      const complete = rows.filter(row => criteria.every(({key}) => Number.isFinite(row[key])));
      const incomplete = rows.filter(row => !criteria.every(({key}) => Number.isFinite(row[key])));
      const scores = new Map(complete.map(row => [row, 0]));
      for (const rule of criteria) {
        const ordered = [...complete].sort((a,b) => api.compare(a,b,[rule]));
        for (let start=0; start<ordered.length;) {
          let end=start+1;
          while (end<ordered.length && ordered[end][rule.key] === ordered[start][rule.key]) end++;
          const averagePosition = (start + end - 1) / 2;
          for (let i=start;i<end;i++) scores.set(ordered[i], scores.get(ordered[i]) + averagePosition);
          start=end;
        }
      }
      return complete.sort((a,b) => scores.get(a)-scores.get(b)).concat(incomplete);
    },
    compare(a, b, criteria) {
      for (const {key, desc} of criteria.length ? criteria : [{key:'profit', desc:true}]) {
        const x = a[key], y = b[key];
        const missingX = x == null || (typeof x === 'number' && !Number.isFinite(x));
        const missingY = y == null || (typeof y === 'number' && !Number.isFinite(y));
        if (missingX || missingY) { if (missingX !== missingY) return missingX ? 1 : -1; continue; }
        const diff = typeof x === 'string' && typeof y === 'string' ? x.localeCompare(y, 'pt-BR') : x > y ? 1 : x < y ? -1 : 0;
        if (diff) return diff * (desc ? -1 : 1);
      }
      return 0;
    }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TableSort = api;
})(globalThis);
