(function(root) {
  function validate(trade) {
    if (!trade || typeof trade.id !== 'string' || !['Americas','Europe'].includes(trade.server) ||
        typeof trade.item !== 'string' || !trade.item.trim() || trade.item.length > 200 ||
        typeof trade.city !== 'string' || trade.city.length > 100 ||
        !Number.isInteger(trade.quantity) || trade.quantity < 1 ||
        !Number.isFinite(trade.purchase) || trade.purchase <= 0 ||
        !Number.isFinite(trade.fees) || trade.fees < 0 ||
        (trade.boughtAt != null && (!Number.isFinite(trade.boughtAt) || trade.boughtAt > Date.now())) ||
        (trade.estimatedCosts != null && typeof trade.estimatedCosts !== 'boolean') ||
        !['instant','order'].includes(trade.mode)) throw new Error('Dados inválidos da operação.');
    if (trade.listedAt != null && (!Number.isFinite(trade.listedAt) || (trade.boughtAt != null && trade.listedAt < trade.boughtAt) || trade.listedAt > Date.now()))
      throw new Error('O anúncio deve ocorrer após a compra e não pode estar no futuro.');
    const outcome=trade.outcome ?? (trade.soldAt != null ? 'sold' : 'pending');
    if (!['pending','sold','lost'].includes(outcome)) throw new Error('Resultado inválido da operação.');
    const closed=outcome!=='pending';
    if (closed && (!Number.isFinite(trade.soldAt) || ((trade.listedAt ?? trade.boughtAt) != null && trade.soldAt < (trade.listedAt ?? trade.boughtAt)) ||
        trade.soldAt > Date.now())) throw new Error('Confira a data de encerramento da operação.');
    if (outcome==='sold' && (!Number.isFinite(trade.received) || trade.received < 0))
      throw new Error('Confira o valor recebido pela venda.');
    if (outcome==='lost' && trade.received != null && trade.received !== 0)
      throw new Error('Uma perda no transporte não pode ter receita de venda.');
    if (!closed && trade.received != null) throw new Error('Informe o encerramento para registrar receita.');
    if(trade.targetPrice!=null && (!Number.isFinite(trade.targetPrice)||trade.targetPrice<=0)) throw new Error('Preço-alvo inválido.');
    if(trade.expectedTax!=null && (!Number.isFinite(trade.expectedTax)||trade.expectedTax<0||trade.expectedTax>=100)) throw new Error('Imposto previsto inválido.');
    if(trade.futureFees!=null && (!Number.isFinite(trade.futureFees)||trade.futureFees<0)) throw new Error('Taxas futuras inválidas.');
    const potentialProfit=!closed && trade.mode==='order' && trade.targetPrice!=null && trade.expectedTax!=null ? trade.targetPrice*trade.quantity*(1-trade.expectedTax/100)-trade.purchase-trade.fees-(trade.futureFees||0):null;
    const received=outcome==='lost' ? 0 : trade.received;
    return {...trade,outcome,received,potentialProfit,profit:closed ? received-trade.purchase-trade.fees : null,
      elapsedHours:closed && !trade.estimatedSoldAt && trade.boughtAt != null ? (trade.soldAt-trade.boughtAt)/3600000 : null,
      orderHours:outcome==='sold' && !trade.estimatedSoldAt && trade.mode==='order' && trade.listedAt != null ? (trade.soldAt-trade.listedAt)/3600000 : null};
  }
  function summary(trades) {
    const rows = trades.filter(t => !t.archived).map(validate), sold = rows.filter(t => t.profit != null);
    const times = sold.map(t => t.orderHours).filter(t => t != null).sort((a,b)=>a-b);
    const middle = Math.floor(times.length/2);
    return {estimated:sold.filter(t=>t.estimatedCosts).length,sold:sold.filter(t=>t.outcome==='sold').length,
      lost:sold.filter(t=>t.outcome==='lost').length,closed:sold.length,pending:rows.length-sold.length,
      profit:sold.reduce((sum,t)=>sum+t.profit,0),
      medianOrderHours:times.length ? (times.length%2 ? times[middle] : (times[middle-1]+times[middle])/2) : null,
      timedOrders:times.length};
  }
  function analytics(trades, {server='Americas', days=null, now=Date.now()} = {}) {
    const cutoff = days == null ? -Infinity : now - days*86400000;
    const active = trades.filter(t=>!t.archived && t.server===server).map(validate);
    const sold = active.filter(t=>t.profit!=null && t.soldAt>=cutoff && t.soldAt<=now)
      .sort((a,b)=>a.soldAt-b.soldAt || a.id.localeCompare(b.id));
    const pending = active.filter(t=>t.profit==null);
    const totals = summary(sold), daily = new Map(), groups = new Map();
    let purchase=0, fees=0, received=0, wins=0, losses=0;
    for(const t of sold) {
      purchase+=t.purchase;fees+=t.fees;received+=t.received;
      if(t.profit>0) wins++; else if(t.profit<0) losses++;
      const day=new Date(t.soldAt).toISOString().slice(0,10);
      const point=daily.get(day)||{day,profit:0,lots:0};
      point.profit+=t.profit;point.lots++;daily.set(day,point);
      const key=t.item.trim().toLocaleLowerCase();
      const group=groups.get(key)||{item:t.item.trim(),profit:0,purchase:0,quantity:0,lots:0};
      group.profit+=t.profit;group.purchase+=t.purchase;group.quantity+=t.quantity;group.lots++;
      groups.set(key,group);
    }
    let cumulative=0;
    const series=[...daily.values()].map(point=>({...point,cumulative:(cumulative+=point.profit)}));
    const ranking=[...groups.values()].map(g=>({...g,roi:g.profit/g.purchase*100,unitProfit:g.profit/g.quantity}))
      .sort((a,b)=>b.profit-a.profit || a.item.localeCompare(b.item));
    return {...totals,purchase,fees,received,wins,losses,breakEven:sold.length-wins-losses,
      roi:purchase ? totals.profit/purchase*100 : null,winRate:sold.length ? wins/sold.length*100 : null,
      lost:sold.filter(t=>t.outcome==='lost').length,closed:sold.length,
      pending:pending.length,pendingCapital:pending.reduce((sum,t)=>sum+t.purchase+t.fees,0),
      quantity:sold.reduce((sum,t)=>sum+t.quantity,0),series,ranking};
  }
  function mergeImported(existing, incoming) {
    if(!Array.isArray(incoming) || incoming.length>1000) throw new Error('Arquivo de registros inválido.');
    const imported=incoming.map(validate), next=existing.slice();
    const signature=t=>JSON.stringify([t.server,t.item.trim().toLocaleLowerCase(),t.quantity,t.soldAt,t.received]);
    const ids=new Set(existing.map(t=>t.id)), signatures=new Set(existing.map(signature));
    for(const t of imported) {
      if(ids.has(t.id) || signatures.has(signature(t))) continue;
      next.push(t);ids.add(t.id);signatures.add(signature(t));
    }
    if(next.length>1000) throw new Error('Limite de 1.000 registros. Exporte uma cópia dos dados.');
    return next;
  }
  const api = {validate,summary,analytics,mergeImported};
  if (typeof module !== 'undefined') module.exports = api; else root.TradeModel = api;
})(globalThis);
