(function(root) {
  function valid(row) {
    const optional = ['yield','seeds','cost','revenue'];
    return row && typeof row.id==='string' && row.id.length>0 && ['Americas','Europe'].includes(row.server)
      && typeof row.plot==='string' && row.plot.trim().length>0 && row.plot.length<=80
      && Number.isInteger(row.plants) && row.plants>0 && row.plants<=10000
      && Number.isFinite(row.planted) && row.planted>0 && Number.isFinite(row.ready) && row.ready>row.planted && row.ready<8640000000000000
      && typeof row.watered==='boolean' && typeof row.harvested==='boolean'
      && optional.every(k=>row[k]===null || (Number.isFinite(row[k]) && row[k]>=0 && row[k]<=1000000000))
      && ['yield','seeds'].every(k=>row[k]===null || (Number.isInteger(row[k]) && row[k]<=1000000));
  }
  function parse(raw) {
    const rows=raw===null?[]:JSON.parse(raw);
    if(!Array.isArray(rows)||rows.length>1000||!rows.every(valid)||new Set(rows.map(r=>r.id)).size!==rows.length) throw new Error('Dados da ilha inválidos; cópia original preservada.');
    return rows;
  }
  function state(row,now) { return row.harvested?'harvested':now>=row.ready?'ready':'growing'; }
  function balance(rows) { return rows.filter(r=>r.harvested&&r.cost!==null&&r.revenue!==null).reduce((s,r)=>s+r.revenue-r.cost,0); }
  const api={valid,parse,state,balance};
  if(typeof module!=='undefined') module.exports=api; else root.IslandModel=api;
})(globalThis);
