(() => {
  const el=id=>document.getElementById(id);
  let rows=[], controller=null, scanContext=null;
  const city=value=>value==='FortSterling'?'Fort Sterling':value;
  const age=date=>(Date.now()-Date.parse(date))/60000;
  function render() {
    if (!scanContext) return;
    const visible=rows.filter(r=>age(r.buy_date)>=0 && age(r.sell_date)>=0 && Math.max(age(r.buy_date),age(r.sell_date))<=scanContext.maxAge);
    const key=el('resourceSort').value;
    visible.sort((a,b)=>key==='fresh'?Math.max(age(a.buy_date),age(a.sell_date))-Math.max(age(b.buy_date),age(b.sell_date)):b[key]-a[key]);
    el('resourceRows').innerHTML=visible.map(r=>{
      const h=r.history;
      return `<tr><td><div class="item-label">${itemFrame({item_id:r.id,quality:1})}<span><strong>${esc(r.name)}</strong><small>T${r.tier}.${r.enchantment} · ${esc(r.id)}</small></span></div></td>
      <td>${esc(city(r.source_city))} → ${esc(city(r.destination_city))}</td>
      <td>${fmt(r.buy_price)}<small>${fmt(age(r.buy_date))} min · ${scanContext.buy==='direct'?'compra direta':'ordem de compra'}</small></td>
      <td>${fmt(r.sell_price)}<small>${fmt(age(r.sell_date))} min · ${scanContext.sell==='instant'?'venda imediata':'anúncio'}</small></td>
      <td>${fmt(r.quantity)} un.<small>Capital: ${fmt(r.capital)}</small><small>Criação: ${fmt(r.setup_fees)}</small></td>
      <td class="pos">${fmt(r.profit)}<small>${fmt(r.unit_profit)}/un. · ROI ${fmt(r.roi)}%</small>${Math.max(age(r.buy_date),age(r.sell_date))>2?'<small class="warning">Referência antiga · conferir no jogo</small>':''}</td>
      <td>${h?.units_per_reported_day==null?'Sem volume informado':fmt(h.units_per_reported_day)+' un./dia informado'}<small>${h?`${h.reported_days}/7 dias · último: ${esc(h.last_day||'—')}`:'Histórico indisponível'}</small><small>Média histórica: ${h?.weighted_price==null?'—':fmt(h.weighted_price)}</small></td>
      <td><button type="button" data-resource-record="${rows.indexOf(r)}">Preparar registro</button></td></tr>`;
    }).join('') || '<tr><td colspan="8">Nenhum par lucrativo dentro dos filtros e do orçamento. Ajuste os filtros ou atualize os preços; isso não significa ausência do recurso no jogo.</td></tr>';
    const labels=['Recurso','Rota','Compra/un.','Venda/un.','Lote simulado','Lucro estimado','Histórico de vendas',''];
    el('resourceRows').querySelectorAll('tr').forEach(tr=>{
      if(tr.children.length===8)Array.from(tr.children).forEach((td,i)=>td.dataset.label=labels[i]);
    });
  }
  el('resourceForm').addEventListener('input',()=>{
    controller?.abort();controller=null;rows=[];scanContext=null;
    el('resourceRows').innerHTML='<tr><td colspan="8">Filtros alterados. Pesquise novamente.</td></tr>';
    el('resourceStatus').textContent='Filtros alterados. Pesquise novamente.';el('resourceScan').disabled=false;
  });
  el('resourceForm').addEventListener('submit',async event=>{
    event.preventDefault();controller?.abort();const active=new AbortController();controller=active;
    const context={server:el('resourceServer').value,buy:el('resourceBuy').value,sell:el('resourceSell').value,premium:el('resourcePremium').checked,maxAge:Number(el('resourceAge').value)};
    const params=new URLSearchParams({server:context.server,family:el('resourceFamily').value,tier:el('resourceTier').value,enchantment:el('resourceEnchant').value,
      origin:el('resourceOrigin').value,destination:el('resourceDestination').value,buy_mode:context.buy,sell_mode:context.sell,premium:context.premium,
      budget:el('resourceBudget').value,quantity:el('resourceQty').value,max_age:context.maxAge});
    el('resourceScan').disabled=true;el('resourceStatus').textContent='Consultando preços e histórico nas cidades…';
    try {
      const response=await fetch('/api/resources/opportunities?'+params,{signal:active.signal});
      if(!response.ok) throw new Error();
      const data=await response.json();if(controller!==active)return;
      rows=data.items;scanContext=context;render();
      el('resourceStatus').textContent=`${data.queried} variantes consultadas · ${rows.length} pares lucrativos na consulta · ${new Date().toLocaleTimeString('pt-BR')}. `+(data.history_error||'');
    } catch(error) {
      if(error.name!=='AbortError')el('resourceStatus').textContent='Falha na consulta. Se houver resultados anteriores, as datas originais continuam valendo; tente novamente.';
    } finally {if(controller===active){controller=null;el('resourceScan').disabled=false;}}
  });
  el('resourceSort').addEventListener('change',render);
  el('resourceRows').addEventListener('click',event=>{
    const button=event.target.closest('[data-resource-record]');if(!button)return;
    const r=rows[Number(button.dataset.resourceRecord)];if(!r||!scanContext)return;
    showTab('trades',true);resetTradeForm();
    el('tradeServer').value=scanContext.server;
    el('tradeItem').value=`${r.name} — T${r.tier}.${r.enchantment} → ${city(r.destination_city)}`;
    el('tradeCity').value=r.source_city;el('tradeQty').value=r.quantity;el('tradeBought').value='';
    el('tradeMode').value=scanContext.sell==='instant'?'instant':'order';
    el('tradeTarget').value=scanContext.sell==='order'?r.sell_price:'';el('tradeTax').value=scanContext.premium?4:8;
    el('tradePurchase').value='';el('tradeFutureFees').value=r.setup_fees;el('tradeEstimated').checked=true;
    renderTrades();el('tradeEntry').open=true;
    status('tradeStatus','Rascunho de recurso: informe o custo total efetivamente comprado, confira quantidade, alvo e taxas antes de salvar. Mova taxas já pagas de futuras para pagas; nenhum lote foi salvo automaticamente.');
    el('tradePurchase').focus();
  });
  setInterval(()=>{if(document.visibilityState==='visible'&&!el('view-resources').hidden)render();},30000);
})();
