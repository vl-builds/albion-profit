let trades = [], editingTrade = null, tradeStorageOkay = true;
let tradeSyncReady = false, tradeSyncBusy = false;
const tradeStorageKey = 'albion-trades-v1';
async function importSharedTrades() {
  if(!tradeStorageOkay) return;
  try {
    const response=await fetch('/imported-flips.json',{cache:'no-store'});
    if(response.status===404) return;
    if(!response.ok) throw new Error('Não foi possível carregar os registros iniciais.');
    const imported=await response.json();
    if(!tradeStorageOkay) return;
    const next=TradeModel.mergeImported(trades,imported);
    const added=next.length-trades.length;
    if(added && await saveTrades(next)) {
      renderTrades();
      status('tradeStatus',`${added} lotes importados da ferramenta. Custos aproximados identificados no histórico.`);
    }
  } catch(error) {status('tradeStatus','Falha ao importar os registros iniciais. Seus registros existentes foram preservados. '+error.message,'error');}
}
function localDateInput(timestamp) {
  const date = new Date(timestamp);
  return new Date(timestamp-date.getTimezoneOffset()*60000).toISOString().slice(0,16);
}
const savedTransportKit = [
  'Cavalo de Montaria',
  'Cajado Bilaminado do Adepto',
  'Casaco de Assassino do Adepto',
  'Capote de Erudito do Adepto',
  'Botas de Soldado do Adepto'
];
async function copyKitText(text, message) {
  try {
    await navigator.clipboard.writeText(text);
    status('kitCopyStatus',message);
  } catch {
    status('kitCopyStatus','Não foi possível copiar automaticamente. Selecione o nome e copie manualmente.','error');
  }
}
function cacheTrades(next) {
  localStorage.setItem(tradeStorageKey, JSON.stringify(next)); trades = next;
}
async function syncTrades() {
  if (!tradeStorageOkay || tradeSyncBusy) return;
  tradeSyncBusy = true;
  try {
    const response = await fetch('/api/trades', {cache:'no-store'});
    if (!response.ok) throw new Error('Servidor indisponível.');
    let remote = (await response.json()).items.map(TradeModel.validate);
    const ids = new Set(remote.map(t=>t.id));
    const missing = trades.filter(t=>!ids.has(t.id));
    if (missing.length) {
      const saved = await fetch('/api/trades', {method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({changes:missing.map(record=>({record,revision:0}))})});
      if (!saved.ok) throw new Error('Não foi possível migrar os lotes; registros locais preservados.');
      remote = (await saved.json()).items.map(TradeModel.validate);
    }
    cacheTrades(remote); tradeSyncReady = true; renderTrades();
    $('tradeSyncStatus').textContent = 'Sincronizado com o servidor local e salvo neste navegador.';
  } catch(error) {
    tradeSyncReady = false;
    $('tradeSyncStatus').textContent = 'Sincronização pendente: '+error.message+' Recarregue para tentar novamente.';
  } finally { tradeSyncBusy = false; }
}
async function saveTrades(next) {
  if (!tradeStorageOkay || !tradeSyncReady || tradeSyncBusy) {
    status('tradeStatus','Aguarde a sincronização antes de salvar. Seus registros foram preservados.','error');return false;
  }
  tradeSyncBusy = true;
  try {
    const changes = next.filter(t=>JSON.stringify(t)!==JSON.stringify(trades.find(old=>old.id===t.id)))
      .map(record=>({record,revision:trades.find(t=>t.id===record.id)?._rev || 0}));
    const response = await fetch('/api/trades',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({changes})});
    if (!response.ok) throw new Error(response.status===409 ? 'Este lote mudou em outro navegador. Recarregue e confira antes de salvar.' : 'Servidor indisponível; formulário preservado.');
    const nextRows=(await response.json()).items.map(TradeModel.validate);
    cacheTrades(nextRows);
    $('tradeSyncStatus').textContent='Sincronizado com o servidor local e salvo neste navegador.';
    return true;
  } catch(error) {status('tradeStatus',error.message,'error');return false;}
  finally {tradeSyncBusy=false;}
}
function resetTradeForm() {
  editingTrade = null; $('tradeForm').reset(); $('tradeSave').textContent = 'Salvar operação';
  $('tradeBought').value = localDateInput(Date.now()); $('tradeTax').value=$('premium').checked?4:8;
}
function prepareTrade(item) {
  $('tradeServer').value = $('server').value;
  showTab("trades", true);
  resetTradeForm();
  $('tradeItem').value = `${item.item_name} (${item.item_id} · ${QUALITY_NAMES[item.quality]})`;
  $('tradeCity').value = item.source_city || $('cargoCity').value;
  $('tradeQty').value = item.quantity || 1;
  if (item.confirmedCost != null) $('tradePurchase').value = item.confirmedCost * item.quantity;
  status('tradeStatus', 'Confira o custo real e a data da compra. Preços estimados não são registrados como gasto realizado.');
  renderTrades(); $('tradeEntry').open=true; $('tradeItem').scrollIntoView({block:'center'}); $('tradePurchase').focus({preventScroll:true});
}
function renderTrades() {
  renderTradeDashboard();
  const filtered = trades.filter(t => t.server === $('tradeServer').value);
  const summary = TradeModel.summary(filtered);
  $('tradeSummary').textContent = `${summary.sold} lotes vendidos · ${summary.lost} perdidos · ${summary.pending} pendentes · Resultado${summary.estimated ? " aproximado" : " realizado"}: ${fmt(summary.profit)} prata · Espera mediana após anunciar: ${summary.medianOrderHours == null ? 'sem registros suficientes' : fmt(summary.medianOrderHours) + ' h (' + summary.timedOrders + ' ordens)'}. Somente suas operações registradas; não é previsão de venda.`;
  $('tradeRows').innerHTML = filtered.filter(t => $('tradeArchived').checked || !t.archived).slice().reverse().map(raw => {
    const t = TradeModel.validate(raw);
    return `<tr><td>${esc(t.item)}<small>${esc(cityName(t.city))} · ${t.quantity} unid. · ${t.outcome==='lost'?'Perda no transporte':t.mode === 'order' ? 'Pedido de venda' : 'Venda imediata'}</small></td>
      <td>${fmt(t.purchase)}${t.estimatedCosts ? '<small class="warning">Custos aproximados</small>' : ''}<small>Taxas extras: ${fmt(t.fees)}</small></td>
      <td>${t.outcome==='lost' ? 'Carga perdida' : t.received == null ? 'Pendente' : fmt(t.received)}${t.estimatedReceived ? '<small class="warning">Vendido · receita estimada pelo anúncio; recibo a confirmar</small>' : ''}${t.estimatedSoldAt ? '<small>Data da confirmação; horário da venda desconhecido</small>' : ''}</td>
      <td class="${t.profit == null ? '' : t.profit >= 0 ? 'pos' : 'neg'}">${t.profit == null ? 'Não realizado' : fmt(t.profit)}${t.potentialProfit==null?'':`<small>Potencial no alvo: ${fmt(t.potentialProfit)} · alvo ${fmt(t.targetPrice)}/un. · taxas futuras ${fmt(t.futureFees||0)}</small>`}<small>${t.archived ? 'Arquivada; fora dos totais' : ''}</small></td>
      <td>${t.elapsedHours == null ? (t.soldAt == null ? (t.listedAt==null?'Ainda não anunciado':fmt((Date.now()-t.listedAt)/3600000)+' h anunciado') : 'Data da compra não informada') : fmt(t.elapsedHours) + ' h desde a compra'}<small>${t.orderHours == null ? '' : fmt(t.orderHours) + ' h após anunciar'}</small></td>
      <td><button type="button" data-edit-trade="${esc(t.id)}">Editar</button> <button type="button" data-archive-trade="${esc(t.id)}">${t.archived ? 'Restaurar' : 'Arquivar'}</button></td></tr>`;
  }).join('') || '<tr><td colspan="6" class="empty">Nenhuma operação registrada neste servidor.</td></tr>';
}
function initializeTrades() {
  try {
    const stored = JSON.parse(localStorage.getItem(tradeStorageKey) || '[]');
    if (!Array.isArray(stored) || stored.length > 1000 || new Set(stored.map(t=>t.id)).size !== stored.length) throw new Error();
    trades = stored.map(TradeModel.validate);
  } catch { tradeStorageOkay = false; status('tradeStatus', 'Não foi possível ler os registros. O conteúdo original foi preservado; novas gravações estão bloqueadas.', 'error'); }
  $('tradeServer').value = $('server').value;
  resetTradeForm(); renderTrades();
  $('tradeEntry').open=trades.length===0;
  syncTrades().then(()=>importSharedTrades());
  setInterval(()=>{if(document.visibilityState==='visible' && !editingTrade) syncTrades();},15000);
  $('tradePeriod').addEventListener('change',renderTradeDashboard);
  $('copySavedKit').addEventListener('click',()=>copyKitText(savedTransportKit.join('\n'),'Lista completa copiada. Cole os nomes individualmente na busca do mercado.'));
  document.querySelector('.saved-kit-list').addEventListener('click',event=>{
    const button=event.target.closest('[data-copy-kit]');
    if(button) copyKitText(button.dataset.copyKit,`${button.dataset.copyKit} copiado.`);
  });
  $('tradeAdd').addEventListener('click',()=>{resetTradeForm();renderTrades();$('tradeEntry').open=true;$('tradeItem').focus();});
  $('tradeServer').addEventListener('change', renderTrades);
  $('tradeArchived').addEventListener('change', renderTrades);
  $('tradeNew').addEventListener('click', () => { resetTradeForm(); renderTrades(); $('tradeEntry').open=true; });
  $('tradeForm').addEventListener('submit', async event => {
    event.preventDefault();
    if (!$('tradeForm').reportValidity()) return;
    try {
      if (!editingTrade && trades.length >= 1000) throw new Error('Limite de 1.000 registros. Exporte uma cópia dos dados.');
      const old = trades.find(t => t.id === editingTrade);
      const trade = TradeModel.validate({id:editingTrade || crypto.randomUUID(), server:$('tradeServer').value,
        item:$('tradeItem').value.trim(), city:$('tradeCity').value, quantity:Number($('tradeQty').value),
        purchase:Number($('tradePurchase').value), fees:Number($('tradeFees').value),
        estimatedCosts:$('tradeEstimated').checked,
        estimatedReceived:!!old?.estimatedReceived && Number($('tradeReceived').value)===old.received,
        estimatedSoldAt:!!old?.estimatedSoldAt,
        targetPrice:$('tradeTarget').value===''?null:Number($('tradeTarget').value), expectedTax:Number($('tradeTax').value),futureFees:Number($('tradeFutureFees').value),
        mode:$('tradeMode').value,outcome:$('tradeOutcome').value,boughtAt:$('tradeBought').value ? new Date($('tradeBought').value).getTime() : null,
        listedAt:$('tradeListed').value ? new Date($('tradeListed').value).getTime() : null,
        soldAt:$('tradeSold').value ? new Date($('tradeSold').value).getTime() : null,
        received:$('tradeOutcome').value==='lost' ? 0 : $('tradeReceived').value === '' ? null : Number($('tradeReceived').value), archived:old?.archived || false});
      const next = editingTrade ? trades.map(t => t.id === editingTrade ? trade : t) : [...trades,trade];
      if (!await saveTrades(next)) return;
      editingTrade = trade.id; $('tradeSave').textContent = 'Salvar alterações';
      status('tradeStatus', 'Operação salva no servidor local e neste navegador.'); renderTrades();
    } catch (error) { status('tradeStatus', error.message, 'error'); }
  });
  $('tradeRows').addEventListener('click', async event => {
    const edit = event.target.closest('[data-edit-trade]'), archive = event.target.closest('[data-archive-trade]');
    if (archive) {
      if (await saveTrades(trades.map(t => t.id === archive.dataset.archiveTrade ? {...t, archived:!t.archived} : t))) renderTrades();
      return;
    }
    if (!edit) return;
    const t = trades.find(t => t.id === edit.dataset.editTrade); if (!t) return;
    editingTrade = t.id; $('tradeEstimated').checked=!!t.estimatedCosts;
    for (const [id,key] of [['tradeServer','server'],['tradeItem','item'],['tradeCity','city'],['tradeQty','quantity'],['tradePurchase','purchase'],['tradeFees','fees'],['tradeMode','mode'],['tradeOutcome','outcome'],['tradeReceived','received'],['tradeTarget','targetPrice'],['tradeTax','expectedTax'],['tradeFutureFees','futureFees']]) $(id).value = t[key] ?? '';
    for (const [id,key] of [['tradeBought','boughtAt'],['tradeListed','listedAt'],['tradeSold','soldAt']]) $(id).value = t[key] == null ? '' : localDateInput(t[key]);
    if(t.expectedTax==null)$('tradeTax').value=$('premium').checked?4:8;if(t.futureFees==null)$('tradeFutureFees').value=0;
    $('tradeSave').textContent = 'Salvar alterações'; $('tradeEntry').open=true; renderTrades(); $('tradeItem').focus();
  });
  $('tradeExport').addEventListener('click', () => {
    const content = tradeStorageOkay ? JSON.stringify(trades,null,2) : localStorage.getItem(tradeStorageKey);
    const url = URL.createObjectURL(new Blob([content || '[]'],{type:'application/json'}));
    const link = document.createElement('a'); link.href = url; link.download = 'operacoes-albion.json'; link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
}
