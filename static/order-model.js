(function(root) {
  function calculate(p) {
    for (const k of ['quantity','buy','target','tax','setup','extra'])
      if (!Number.isFinite(p[k]) || p[k]<0) throw new Error('Confira os valores do planejamento.');
    if (!Number.isSafeInteger(p.quantity) || p.quantity<1 || p.buy<=0 || p.target<=0 || p.tax+p.setup>=100)
      throw new Error('Informe quantidade, compra e preço-alvo positivos e taxas válidas.');
    const purchase=p.buy*p.quantity, gross=p.target*p.quantity;
    const listing=gross*p.setup/100, salesTax=gross*p.tax/100;
    const capital=purchase+listing+p.extra, profit=gross-salesTax-capital;
    if (![purchase,gross,capital,profit].every(Number.isFinite)) throw new Error('Valores grandes demais.');
    return {purchase,gross,listing,salesTax,capital,profit,unitProfit:profit/p.quantity,
      roi:profit/capital*100,breakEven:Math.ceil((purchase+p.extra)/(p.quantity*(1-(p.tax+p.setup)/100))),
      stressProfit:gross*.9*(1-p.tax/100)-capital};
  }
  function validate(p) {
    calculate(p);
    if (!p || typeof p.id!=='string' || !['Americas','Europe'].includes(p.server) ||
      typeof p.item!=='string' || !p.item.trim() || p.item.length>200 ||
      typeof p.notes!=='string' || p.notes.length>2000 || typeof p.city!=='string' || p.city.length>100)
      throw new Error('Plano inválido.');
    for (const k of ['average','volume','days','observedAt'])
      if(p[k]!=null && (!Number.isFinite(p[k]) || p[k]<=0)) throw new Error('Confira o histórico observado.');
    if(p.observedAt>Date.now() || (p.days!=null && !Number.isInteger(p.days))) throw new Error('Confira a data e o período do histórico.');
    return p;
  }
  const api={calculate,validate};
  if(typeof module!=='undefined') module.exports=api; else root.OrderModel=api;
})(globalThis);
