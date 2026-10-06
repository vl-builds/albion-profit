let orderPlans=[], orderEditing=null, orderStorageOkay=true;
const orderKey='albion-order-plans-v1';
const orderFields={item:'Item',city:'City',quantity:'Quantity',buy:'Buy',target:'Target',tax:'Tax',setup:'Setup',extra:'Extra',average:'Average',volume:'Volume',days:'Days',observedAt:'ObservedAt',notes:'Notes'};
function readOrderPlan() {
  const p={id:orderEditing || crypto.randomUUID(),server:$('tradeServer').value};
  for(const [k,suffix] of Object.entries(orderFields)) {
    const value=$('order'+suffix).value;
    p[k]=['item','city','notes'].includes(k)?value.trim():value===''?null:k==='observedAt'?new Date(value).getTime():Number(value);
  }
  return OrderModel.validate(p);
}
function previewOrder() {
  try {
    const p=readOrderPlan(),r=OrderModel.calculate(p);
    const history=p.volume && p.days ? `${fmt(p.volume/p.days)} unidades/dia no período informado; lote equivale a ${fmt(p.quantity/(p.volume/p.days)*100)}% desse volume diário. Isso não prevê prazo de venda.`:'Sem volume e período informados: não há base para avaliar o tamanho do lote.';
    $('orderPreview').textContent=`Compra: ${fmt(r.purchase)} · Criação: ${fmt(r.listing)} · Outros custos: ${fmt(p.extra)} · Imposto na venda: ${fmt(r.salesTax)} · Capital previsto: ${fmt(r.capital)}. Lucro potencial do lote: ${fmt(r.profit)} (${fmt(r.unitProfit)}/un.) · ROI sobre capital: ${fmt(r.roi)}%. Preço mínimo para cobrir custos: ${fmt(r.breakEven)}/un. Cenário com venda 10% abaixo do alvo: ${fmt(r.stressProfit)} de lucro, mantendo a taxa inicial; nova alteração pode ter custo extra. ${history} ${p.average && p.target>p.average?'Preço-alvo acima da média observada.':''}`;
  } catch { $('orderPreview').textContent='Preencha item, quantidade, compra e preço-alvo para calcular. Confira taxas e histórico.'; }
}
function saveOrderPlans(next) {
  if(!orderStorageOkay) {status('orderStatus','Os planos salvos não puderam ser lidos. Exporte os dados para recuperação antes de gravar.','error');return false;}
  try {localStorage.setItem(orderKey,JSON.stringify(next));orderPlans=next;return true;}
  catch {status('orderStatus','Não foi possível salvar. Os dados anteriores foram preservados.','error');return false;}
}
function renderOrderPlans() {
  $('orderPlans').innerHTML=orderPlans.filter(p=>p.server===$('tradeServer').value).map(p=>{
    const r=OrderModel.calculate(p);
    return `<article class="panel content-panel"><strong>${esc(p.item)}</strong><p>${p.quantity} un. · ${esc(p.city)} · Alvo ${fmt(p.target)}/un. · Lucro potencial ${fmt(r.profit)} · ROI ${fmt(r.roi)}%</p><p class="hint">${p.observedAt?'BM conferido em '+esc(new Date(p.observedAt).toLocaleString()):'Sem data de conferência do BM'} · ${p.average?'Média observada '+fmt(p.average):'Sem média observada'} · ${p.volume && p.days?fmt(p.volume)+' unidades em '+p.days+' dias':'Histórico de volume incompleto'}</p><p>${esc(p.notes)}</p><button type="button" data-order-edit="${esc(p.id)}">Editar plano</button> <button type="button" data-order-trade="${esc(p.id)}">Preparar registro da compra</button></article>`;
  }).join('') || '<p class="hint">Nenhum plano salvo neste servidor.</p>';
}
function resetOrderForm() {orderEditing=null;$('orderForm').reset();$('orderTax').value=$('premium').checked?4:8;previewOrder();}
function initializeOrders() {
  try {
    const stored=JSON.parse(localStorage.getItem(orderKey)||'[]');
    if(!Array.isArray(stored)||stored.length>1000||new Set(stored.map(p=>p.id)).size!==stored.length) throw Error();
    orderPlans=stored.map(OrderModel.validate);
  } catch {orderStorageOkay=false;status('orderStatus','Planos inválidos foram preservados; novas gravações bloqueadas. Exporte para recuperação.','error');}
  resetOrderForm();renderOrderPlans();
  $('orderForm').addEventListener('input',previewOrder);
  $('orderNew').addEventListener('click',resetOrderForm);
  $('tradeServer').addEventListener('change',()=>{resetOrderForm();renderOrderPlans();});
  $('orderForm').addEventListener('submit',e=>{
    e.preventDefault();try {
      const p=readOrderPlan();if(!orderEditing && orderPlans.length>=1000) throw Error('Limite de 1.000 planos.');
      const next=orderEditing?orderPlans.map(x=>x.id===orderEditing?p:x):[...orderPlans,p];
      if(saveOrderPlans(next)){orderEditing=p.id;renderOrderPlans();status('orderStatus','Plano salvo. Nenhuma compra ou venda foi registrada.');}
    } catch(error) {status('orderStatus',error.message,'error');}
  });
  $('orderPlans').addEventListener('click',e=>{
    const edit=e.target.closest('[data-order-edit]'),trade=e.target.closest('[data-order-trade]');
    if(!edit&&!trade)return;
    const p=orderPlans.find(x=>x.id===(edit?.dataset.orderEdit||trade?.dataset.orderTrade));if(!p)return;
    if(edit){orderEditing=p.id;for(const [k,suffix] of Object.entries(orderFields)) $('order'+suffix).value=k==='observedAt'?(p[k]?localDateInput(p[k]):''):p[k]??'';previewOrder();$('orderItem').focus();return;}
    resetTradeForm();$('tradeItem').value=p.item;$('tradeCity').value=p.city;$('tradeQty').value=p.quantity;
    $('tradeMode').value='order';$('tradeTarget').value=p.target;$('tradeTax').value=p.tax;
    $('tradeFutureFees').value=(OrderModel.calculate(p).listing+p.extra).toFixed(2);
    $('tradeEntry').open=true;$('tradePurchase').focus();
    status('tradeStatus','Informe o custo real da compra antes de salvar. Taxas futuras vieram do plano: ao pagá-las, transfira o valor para taxas já pagas, sem duplicar.');
  });
  $('orderExport').addEventListener('click',()=>{
    const raw=orderStorageOkay?JSON.stringify(orderPlans,null,2):localStorage.getItem(orderKey);
    const url=URL.createObjectURL(new Blob([raw||'[]'],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download='planos-venda-bm.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
}
