let liquidityBusy = false;
const liquidityHistory = new Map(), liquidityAttempts = new Map();
const liquidityKey = item => `${$('server').value}:${item.item_id}:${item.quality}`;
function liquidityFor(item) {
  const entry = liquidityHistory.get(liquidityKey(item));
  return entry && Date.now() - entry.loadedAt < 900000 &&
    new Date(entry.loadedAt).toISOString().slice(0,10) === new Date().toISOString().slice(0,10) ? entry : null;
}
function passesLiquidity(item) {
  return !$('prioritizeLiquidity').checked || liquidityFor(item)?.liquid === true;
}
function liquidityBadge(item) {
  const h = liquidityFor(item);
  if (!h || h.error) return '<small>Liquidez não verificada</small>';
  if (!h.liquid) return `<small>${h.status === 'insufficient' ? 'Histórico insuficiente' : 'Volume abaixo do filtro'}</small>`;
  return `<small class="frequent-tag">● ${fmt(h.units_per_reported_day)} un./dia informado · limite sugerido ${fmt(h.suggested_qty_limit)} un.</small>`;
}
function dailySalesCell(item) {
  const h = liquidityFor(item);
  if (!h || h.error) return '<small>Vendas/dia BM: ' + (h?.error ? 'indisponíveis' : 'aguardando histórico') + '</small>';
  if (h.units_per_reported_day == null) return '<small>Vendas/dia BM: sem informação</small>';
  return `<strong>${fmt(h.units_per_reported_day)} un./dia</strong><small>Média BM · ${h.reported_days}/7 dias informados</small>`;
}
function dailySalesDetails(h) {
  if (!h.daily_sales?.length) return '';
  return `<h3>Unidades vendidas por dia · BM</h3><p class="hint">Últimos 7 dias completos (UTC), para este item e qualidade. Histórico informado; não é previsão de vendas.</p><div class="table-scroll"><table><thead><tr><th>Dia (UTC)</th><th>Unidades</th></tr></thead><tbody>${h.daily_sales.map(day => `<tr><td>${esc(day.date)}</td><td>${day.item_count == null ? 'Sem informação' : fmt(day.item_count)}</td></tr>`).join('')}</tbody></table></div>`;
}
function cargoLiquidityWarning(item) {
  const h = liquidityFor(item);
  if (!h?.liquid) return 'Liquidez não comprovada nesta janela';
  const total = cargo.filter(row => row.item_id === item.item_id && row.quality === item.quality)
    .reduce((sum, row) => sum + row.quantity, 0);
  return total > h.suggested_qty_limit ? `Lote total de ${total} excede o limite sugerido de ${h.suggested_qty_limit} un. para este item/qualidade` : '';
}
function liquidityCell(item) {
  const h = liquidityFor(item);
  if (!h) return '<small>Histórico não consultado</small>';
  if (h.error) return '<small>Histórico indisponível · tente novamente</small>';
  return `<strong class="${h.liquid ? 'pos' : ''}">${h.status === 'insufficient' ? 'Dados insuficientes' : h.liquid ? 'Aprovado no filtro de liquidez' : 'Volume abaixo do filtro'}</strong>
    <small>Limite sugerido: ${fmt(h.suggested_qty_limit || 0)} un. · Mediana diária: ${h.median_daily_units == null ? '—' : fmt(h.median_daily_units)}</small>
    <small>${h.units_per_reported_day == null ? 'Volume desconhecido' : `${fmt(h.units_per_reported_day)} unid./dia informado`}</small>
    <small>${h.reported_days ? `${h.active_days} dias com vendas informadas · ${h.reported_days}/7 dias informados` : 'Nenhum dia informado; não é zero vendas'}</small>
    <small>Média negociada: ${h.weighted_price == null ? '—' : fmt(h.weighted_price) + ' prata'} · Variação: ${h.price_cv_pct == null ? '—' : fmt(h.price_cv_pct) + '%'}</small>
    <small>Último dia: ${esc(h.last_day || '—')} · janela ${esc(h.window_start)} a ${esc(h.window_end)} UTC</small>${dailySalesDetails(h)}`;
}
async function loadLiquidity(force = false) {
  if (liquidityBusy) return;
  liquidityBusy = true; $('loadLiquidity').disabled = true;
  const server = $('server').value;
  const ids = [...new Set([...currentData, ...cargo].map(i => i.item_id))].filter(id =>
    force || Date.now() - (liquidityAttempts.get(`${server}:${id}`) || 0) > 900000);
  if (!ids.length) {
    if (!currentData.length) status('liquidityStatus', 'Sem itens na consulta de preços para analisar o histórico. Aguarde dados ou ajuste os filtros.');
    liquidityBusy = false; $('loadLiquidity').disabled = false; return;
  }
  let finished = 0, failed = false;
  try {
    for (let index = 0; index < ids.length; index += 50) {
      if ($('server').value !== server) break;
      const batch = ids.slice(index, index + 50);
      status('liquidityStatus', `Consultando histórico do BM: ${finished}/${ids.length} itens…`);
      const response = await fetch(`/api/liquidity?${new URLSearchParams({server, item_ids: batch.join(',')})}`);
      if (!response.ok) throw new Error();
      const data = await response.json();
      const loadedAt = Date.now();
      for (const id of batch) liquidityAttempts.set(`${server}:${id}`, loadedAt);
      for (const row of data.items) liquidityHistory.set(`${server}:${row.item_id}:${row.quality}`,
        {...row, loadedAt, window_start:data.window_start, window_end:data.window_end});
      finished += batch.length;
      if ($('server').value === server) { renderTable(); renderCargo(); detectAlerts(); }
    }
    if ($('server').value === server) status('liquidityStatus', `Histórico consultado para ${finished} itens. Dias ausentes não são tratados como zero vendas. Renovação após 15 minutos durante atualizações de preços, com priorização ativa.`);
  } catch {
    failed = true;
    // Avoid a failing history endpoint being retried for every live message.
    for (const id of ids.slice(finished)) {
      liquidityAttempts.set(`${server}:${id}`, Date.now() - 840000);
      for (let quality = 1; quality <= 5; quality++) {
        const key = `${server}:${id}:${quality}`;
        if (!liquidityHistory.has(key)) liquidityHistory.set(key, {error:true, loadedAt:Date.now()});
      }
    }
    status('liquidityStatus', 'Falha no histórico. Itens sem liquidez comprovada ficam fora do filtro; volume desconhecido não equivale a zero vendas.', 'error');
  } finally {
    liquidityBusy = false; $('loadLiquidity').disabled = false;
    renderTable();
    if (!failed && ($('prioritizeLiquidity').checked || $('alertsEnabled').checked) && server !== $('server').value) loadLiquidity();
  }
}
function initializeLiquidity() {
$('loadLiquidity').addEventListener('click', () => loadLiquidity(true));
$('prioritizeLiquidity').addEventListener('change', () => {
  cancelPlan();
  $('lockOrder').checked = false; lockedOrder.clear(); renderTable();
  renderCargo(); detectAlerts();
  if ($('prioritizeLiquidity').checked) loadLiquidity();
});
}
