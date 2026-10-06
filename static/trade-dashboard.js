/* Analytics use only validated personal records, never scanner estimates. */
function tradeChart(series, cumulative) {
  if(!series.length) return '<div class="trade-chart-empty"><span>◇</span>Seu histórico começa com o primeiro flip vendido.<small>Registre a compra, as taxas e o valor recebido para acompanhar os resultados.</small></div>';
  const w=640,h=230,left=74,right=16,top=20,bottom=38;
  const values=series.map(p=>cumulative?p.cumulative:p.profit);
  const low=Math.min(0,...values),high=Math.max(0,...values),span=high-low||1;
  const y=v=>top+(high-v)/span*(h-top-bottom);
  const start=Date.parse(series[0].day),end=Date.parse(series.at(-1).day),duration=end-start||86400000;
  const x=(p,i)=>cumulative ? left+(Date.parse(p.day)-start)/duration*(w-left-right) : left+(i+.5)/series.length*(w-left-right);
  const date=day=>day.slice(8,10)+'/'+day.slice(5,7);
  const ticks=[high,(high+low)/2,low].filter((v,i,a)=>a.indexOf(v)===i);
  const grid=ticks.map(v=>`<line x1="${left}" x2="${w-right}" y1="${y(v)}" y2="${y(v)}" class="chart-grid"/><text x="${left-9}" y="${y(v)+4}" text-anchor="end">${esc(new Intl.NumberFormat('pt-BR',{notation:'compact',maximumFractionDigits:1}).format(v))}</text>`).join('');
  const description=p=>`${p.day} UTC: ${fmt(p.profit)} prata de lucro; acumulado ${fmt(p.cumulative)}; ${p.lots} lote(s)`;
  let marks;
  if(cumulative) {
    // A step changes only on recorded sale days; no fictional daily returns.
    const path=series.map((p,i)=>i ? `H${x(p,i)} V${y(p.cumulative)}` : `M${x(p,i)} ${y(0)} V${y(p.cumulative)}`).join(' ');
    marks=`<path d="${path}" class="trade-equity-line"/>`+series.map((p,i)=>`<circle cx="${x(p,i)}" cy="${y(p.cumulative)}" r="4" class="chart-point" tabindex="0" role="img" aria-label="${esc(description(p))}"><title>${esc(description(p))}</title></circle>`).join('');
  } else {
    const width=Math.max(.5,Math.min(34,(w-left-right)/series.length*.7));
    marks=series.map((p,i)=>`<rect x="${x(p,i)-width/2}" y="${Math.min(y(p.profit),y(0))}" width="${width}" height="${Math.max(1,Math.abs(y(p.profit)-y(0)))}" rx="1" fill="${p.profit>=0?'var(--green)':'var(--red)'}" tabindex="0" role="img" aria-label="${esc(description(p))}"><title>${esc(description(p))}</title></rect>`).join('');
  }
  const labels=`<text x="${left}" y="${h-10}">${date(series[0].day)}</text>${series.length>1?`<text x="${w-right}" y="${h-10}" text-anchor="end">${date(series.at(-1).day)}</text>`:''}`;
  return `<svg class="trade-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="${cumulative?'Lucro acumulado':'Lucro por dia'} em prata, ${series[0].day} a ${series.at(-1).day}, UTC">${grid}<line x1="${left}" x2="${w-right}" y1="${y(0)}" y2="${y(0)}" class="chart-zero"/>${marks}${labels}</svg>`;
}
function renderTradeDashboard() {
  const days=$('tradePeriod').value ? Number($('tradePeriod').value) : null;
  const a=TradeModel.analytics(trades,{server:$('tradeServer').value,days});
  const money=value=>fmt(value)+' prata';
  const metric=(title,value,detail,cls='')=>`<div><span>${title}</span><strong class="${cls}">${value}</strong><small>${detail}</small></div>`;
  $('tradeMetrics').innerHTML=
    metric(a.estimated?'Resultado aproximado':'Resultado realizado',money(a.profit),a.estimated?`${a.estimated} lote(s) com custos aproximados`:'Recebido − compras − taxas extras',a.profit>=0?'pos':'neg')+
    metric('ROI sobre compras',a.roi==null?'—':fmt(a.roi)+'%','Lucro total ÷ custo das mercadorias vendidas',a.roi==null?'':a.roi>=0?'pos':'neg')+
    metric('Resultados encerrados',fmt(a.closed),`${a.sold} vendidos · ${a.lost} perdidos · ${fmt(a.quantity)} unidades`)+
    metric('Taxa de acerto',a.winRate==null?'—':fmt(a.winRate)+'%',`${a.wins} positivos · ${a.losses} negativos · ${a.breakEven} empatados`)+
    metric('Capital em lotes pendentes',money(a.pendingCapital),`${a.pending} lotes abertos, de qualquer data; inclui taxas pagas`)+
    metric('Espera mediana',a.medianOrderHours==null?'—':fmt(a.medianOrderHours)+' h',`${a.timedOrders} pedidos com data do anúncio e da venda`);
  $('tradeEquity').innerHTML=tradeChart(a.series,true);
  $('tradeDaily').innerHTML=tradeChart(a.series,false);
  $('tradeBest').innerHTML=a.ranking.filter(g=>g.profit>0).slice(0,5).map((g,i)=>`<tr><td><span class="trade-rank">${i+1}</span>${esc(g.item)}<small>${g.lots} lote(s) · ${g.quantity} unidades</small></td><td class="pos">${fmt(g.profit)}</td><td class="pos">${fmt(g.roi)}%</td><td>${fmt(g.unitProfit)}</td></tr>`).join('')||'<tr><td colspan="4" class="empty">O ranking aparece quando houver flips com lucro positivo.</td></tr>';
  $('tradeEstimateNotice').textContent=a.estimated ? 'Gráficos, ROI e ranking incluem custos aproximados. O resultado exato das vendas e perdas depende da revisão desses custos.' : '';
  const best=a.ranking.find(g=>g.profit>0);
  $('tradeInsight').textContent=!a.closed?'Registre seu primeiro flip encerrado para começar a análise.':
    `${a.closed} lotes encerrados (${a.sold} vendidos e ${a.lost} perdidos): ${money(a.received)} recebidos após imposto, ${money(a.purchase)} em compras e ${money(a.fees)} em taxas extras.`+
    (best?` Maior contribuição: ${best.item}, com ${money(best.profit)} de lucro.`:' Nenhum item teve lucro total positivo no período.');
  $('tradeChartData').innerHTML=a.series.slice().reverse().map(p=>`<tr><td>${esc(p.day)}</td><td>${p.lots}</td><td class="${p.profit>=0?'pos':'neg'}">${fmt(p.profit)}</td><td class="${p.cumulative>=0?'pos':'neg'}">${fmt(p.cumulative)}</td></tr>`).join('')||'<tr><td colspan="4" class="empty">Sem vendas registradas no período.</td></tr>';
}
