const $ = id => document.getElementById(id);
const money = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
const fmt = value => money.format(value);
const esc = value => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"}[c]));
const QUALITY_NAMES = {1:"Normal", 2:"Bom", 3:"Excelente", 4:"Excepcional", 5:"Obra-prima"};
let currentData = [], cargo = [], sortCriteria = [];
let contextVersion = 0, scanRequest = 0, planRequest = 0;
let scanController, planController;
let visibleLimit = 100;
let liveFeed;
let liveScope = '', queryScope = '';
let tracker = new OpportunityModel.Tracker(), favorites = new Map();
let lockedOrder = new Map();
const alertDetector = new AlertModel.Alerts();
let alertHistory = [], alertScope = '', desktopAlerts = false;
const favoriteKey = () => `albion-favorites-v1:${$('server').value}:${$('cargoCity').value}`;
const observedAt = (date, ageMinutes, now = Date.now()) => {
  if (!date) return now - ageMinutes * 60000;
  const timestamp = Date.parse(/(?:Z|[+-]\d{2}:\d{2})$/i.test(date) ? date : date + 'Z');
  return Number.isFinite(timestamp) ? timestamp : now - ageMinutes * 60000;
};
const priceAge = (source, observed) => `${source === 'live' ? 'Recebido ao vivo' : 'Observado via API'} · ${age(observed)}`;
function receiveItems(items) {
  const now = Date.now();
  const next = items.filter(designMatches).map(item => ({...item,
    sourceObserved: observedAt(item.city_price_date, item.city_price_age_min, now),
    bmObserved: observedAt(item.bm_price_date, item.bm_price_age_min, now)}));
  recordPriceObservations(next);
  tracker.update(next, now, Number($('maxAge').value), $('livePrices').checked);
  let changed = false;
  for (const item of next) if (favorites.has(identity(item))) {
    if (['city_price', 'bm_price', 'profit', 'sourceObserved', 'bmObserved', 'city_price_source', 'bm_price_source', 'item_name']
      .some(key => favorites.get(identity(item))[key] !== item[key])) {
      favorites.set(identity(item), item); changed = true;
    }
  }
  if (changed) saveFavorites();
  renderTable();
  detectAlerts();
  loadLiquidity();
}
function detectAlerts() {
  const scope = $('server').value;
  if (alertScope !== queryScope) {
    alertScope = queryScope; alertHistory = []; $('alertHistory').innerHTML = '';
    $('opportunityNotice').hidden=true;
    status('alertStatus', 'Aguardando oportunidade que atenda aos critérios.');
  }
  if (!$('alertsEnabled').checked) { status('alertStatus', 'Alertas pausados.'); renderRailAlerts(); return; }
  if (!['alertProfit', 'alertRoi', 'alertAge', 'stressDrop'].every(id => $(id).checkValidity())) {
    status('alertStatus', 'Preencha limites válidos para ativar os alertas.', 'error'); return;
  }
  const hits = alertDetector.detect(tracker.items.map(item=>({...item,liquidity:liquidityFor(item)})), scope, {
    requireLiquidity:true,
    profit: Number($('alertProfit').value), roi: Number($('alertRoi').value),
    age: Math.min(2, Number($('alertAge').value), Number($('maxAge').value)),
    premium: $('premium').checked, drop: Number($('stressDrop').value),
  }, Date.now());
  if (!hits.length) { status('alertStatus', 'Monitorando os critérios nas atualizações recebidas.'); renderRailAlerts(); return; }
  alertHistory = [...hits, ...alertHistory].slice(0, 20);
  status('alertStatus', `${hits.length} oportunidade(s) identificada(s) às ${new Date().toLocaleTimeString('pt-BR')}.`, 'pos');
  $('alertHistory').innerHTML = alertHistory.map(item => `<div class="warning">${label(item)}
    <strong>${fmt(item.profit)} prata por unidade · ROI ${fmt(item.margin_pct)}%</strong>
    <small>Histórico BM: ${fmt(item.liquidity.units_per_reported_day)} un./dia informado · limite sugerido ${fmt(item.liquidity.suggested_qty_limit)} un. Não confirma estoque.</small>
    <small>${esc($('server').value)} · ${esc(cityName(item.source_city))} · Aviso às ${new Date(item.alertedAt).toLocaleTimeString('pt-BR')}</small>
    <small>Compra ${fmt(item.city_price)} · ${item.city_price_source === 'live' ? 'Recebido ao vivo' : 'Observado via API'} há ${fmt((item.alertedAt - item.sourceObserved) / 60000)} min | BM ${fmt(item.bm_price)} · ${item.bm_price_source === 'live' ? 'Recebido ao vivo' : 'Observado via API'} há ${fmt((item.alertedAt - item.bmObserved) / 60000)} min (idades no aviso)</small></div>`).join('');
  renderRailAlerts();
  announceOpportunities(hits);
  if (desktopAlerts && 'Notification' in window && Notification.permission === 'granted') {
    try {
      const best = hits[0];
      new Notification(`${hits.length} oportunidade(s) de flip · ${cityName(best.source_city)}`, {
        body: `${best.item_name} · ${QUALITY_NAMES[best.quality]}: ${fmt(best.profit)} prata/un. · ROI ${fmt(best.margin_pct)}%. Confira no jogo.`,
        tag: 'albion-flip-opportunities',
      });
    } catch { status('notificationStatus', 'O navegador não conseguiu mostrar a notificação. Os avisos continuam nesta página.'); }
  }
}
function connectLive() {
  const params = marketParams(); params.delete('live');
  if ($('livePrices').checked && liveFeed && liveScope === params.toString()) return;
  liveFeed?.close(); liveFeed = null; liveScope = '';
  if (!$('livePrices').checked) { status('liveStatus', 'Recepção ao vivo pausada nesta tela.'); return; }
  const feed = new EventSource(`/api/live?${params}`);
  liveFeed = feed; liveScope = params.toString();
  status('liveStatus', 'Conectando ao fluxo ao vivo…', 'info');
  feed.onmessage = event => {
    if (liveFeed !== feed) return;
    try {
      const data = JSON.parse(event.data);
      if (data.server !== $('server').value) return;
      const state = data.status;
      const text = state.state === 'connected' ?
        (state.last_message ? 'Fluxo comunitário conectado · confira as idades dos itens' : 'Fluxo conectado; aguardando observações') :
        'Fluxo indisponível ou reconectando; confira a idade de cada cotação';
      $('liveStatus').title = state.last_message ? `Última mensagem do servidor: ${new Date(state.last_message * 1000).toLocaleTimeString('pt-BR')}. A conexão não confirma preço ou estoque de cada item.` : '';
      status('liveStatus', text,
        state.state === 'connected' ? 'pos' : 'info');
      // A pending REST response owns the table until it completes, avoiding races.
      if (!$('refresh').disabled) receiveItems(data.items);
    } catch { status('liveStatus', 'Não foi possível ler a atualização ao vivo. Aguardando a próxima.', 'error'); }
  };
  feed.onerror = () => {
    if (liveFeed === feed) status('liveStatus', 'Conexão com a aplicação interrompida. Tentando reconectar…', 'info');
  };
}
const contextKey = () => CargoModel.key($("server").value, $("cargoCity").value);
const tax = () => $("premium").checked ? 4 : 8;
const identity = OpportunityModel.identity;
const cityName = city => city === 'FortSterling' ? 'Fort Sterling' : city;
const allCities = () => $('cargoCity').value === 'all';
const failedItemIcons = new Set();
document.addEventListener('error', event => {
  const image = event.target;
  if (!(image instanceof HTMLImageElement) || !image.classList.contains('item-icon')) return;
  failedItemIcons.add(image.getAttribute('src'));
  image.hidden = true;
  image.parentElement.classList.add('icon-unavailable');
}, true);
function label(item) { return designLabel(item); }

function status(id, text, kind = "") { $(id).textContent = text; $(id).className = kind; }
function age(observed) { return `${fmt(Math.max(0, (Date.now() - observed) / 60000))} min`; }
function saveFavorites() {
  try { localStorage.setItem(favoriteKey(), JSON.stringify([...favorites.values()])); status('favoriteStatus', ''); }
  catch { status('favoriteStatus', 'Não foi possível salvar os favoritos neste navegador.', 'error'); }
}
function restoreFavorites() {
  favorites = new Map();
  try { favorites = OpportunityModel.loadFavorites(JSON.parse(localStorage.getItem(favoriteKey()) || '[]').map(item => ({...item, source_city:item.source_city || (allCities() ? '' : $('cargoCity').value)}))); status('favoriteStatus', ''); }
  catch { status('favoriteStatus', 'Não foi possível recuperar os favoritos salvos. O registro original foi preservado.', 'error'); }
}
function favoriteButton(item) {
  const selected = favorites.has(identity(item));
  return `<button type="button" class="favorite-button" data-favorite="${esc(identity(item))}" aria-pressed="${selected}" aria-label="${selected ? 'Desfavoritar' : 'Favoritar'} ${esc(item.item_name)}">${selected ? '★' : '☆'}</button>`;
}
function renderFollowing() {
  const now = Date.now(), maxAge = Number($('maxAge').value), live = $('livePrices').checked;
  $('favoriteRows').innerHTML = [...favorites.values()].map(item => {
    const current = tracker.active.get(identity(item));
    const recent = tracker.recent.get(identity(item));
    const stale = OpportunityModel.staleReason(item, now, maxAge, live);
    const state = current ? `${riskFor(current).recent ? "Cotação recente" : "Referência antiga; não indicada para compra"} · Lucro estimado: ${fmt(current.profit)} prata` :
      recent?.reason || stale || 'Sem cotação válida nesta consulta. Confira os filtros; aguardando atualização.';
    return `<tr tabindex="0" data-detail="${esc(identity(item))}"><td>${label(item)}</td><td>${fmt(item.city_price)}<small>${priceAge(item.city_price_source, item.sourceObserved)}</small></td>
      <td>${fmt(item.bm_price)}<small>${priceAge(item.bm_price_source, item.bmObserved)}</small></td><td>${esc(state)}${!current ? '<small>Histórico; não é uma oportunidade atual.</small>' : ''}</td><td>${favoriteButton(item)}</td></tr>`;
  }).join('') || '<tr><td colspan="5" class="empty">Marque ☆ Favoritar em um item para acompanhá-lo.</td></tr>';
  $('recentCount').textContent = `(${tracker.recent.size})`;
  $('recentRows').innerHTML = [...tracker.recent.values()].map(({item, reason, leftAt}) =>
    `<tr tabindex="0" data-detail="${esc(identity(item))}"><td>${label(item)}</td><td>${fmt(item.city_price)}<small>Último dado · ${age(item.sourceObserved)}</small></td>
    <td>${fmt(item.bm_price)}<small>Último dado · ${age(item.bmObserved)}</small></td>
    <td>${esc(reason)}<small>Registrado às ${esc(new Date(leftAt).toLocaleTimeString('pt-BR'))}</small></td><td>${favoriteButton(item)}</td></tr>`
  ).join('') || '<tr><td colspan="5" class="empty">Nenhuma saída registrada nesta consulta.</td></tr>';
}
function saveCargo() {
  try {
    localStorage.setItem(contextKey(), JSON.stringify({cargo, budget: $("cargoBudget").value,
      weight: $("cargoWeight").value, maxQty: $("cargoMaxQty").value, bankroll: $("cargoBankroll").value}));
    status("storageStatus", "");
  } catch { status("storageStatus", "Não foi possível salvar o rascunho neste navegador.", "error"); }
}
function restoreCargo() {
  cargo = [];
  $("cargoBudget").value = "100000"; $("cargoWeight").value = "";
  $("cargoMaxQty").value = "1"; $("cargoBankroll").value = "";
  try {
    const saved = JSON.parse(localStorage.getItem(contextKey()) || "null");
    if (saved) {
      if (!Array.isArray(saved.cargo) || !saved.cargo.every(item =>
        typeof item.item_id === "string" && typeof item.item_name === "string" &&
        Number.isInteger(item.quantity) && item.quantity > 0 &&
        Number.isFinite(item.estimatedCost) && item.estimatedCost > 0 &&
        Number.isFinite(item.bmPrice) && item.bmPrice > 0 &&
        (item.confirmedCost === null || (Number.isFinite(item.confirmedCost) && item.confirmedCost > 0)) &&
        (item.weight === null || (Number.isFinite(item.weight) && item.weight > 0)) &&
        Number.isFinite(item.sourceObserved) && Number.isFinite(item.bmObserved))) throw new Error("Invalid draft");
      cargo = saved.cargo.map(item => ({...item, source_city:item.source_city || (allCities() ? '' : $('cargoCity').value)}));
      $("cargoBudget").value = saved.budget; $("cargoWeight").value = saved.weight;
      $("cargoMaxQty").value = saved.maxQty; $("cargoBankroll").value = saved.bankroll;
    }
    status("storageStatus", "");
  } catch { status("storageStatus", "Não foi possível recuperar o rascunho salvo.", "error"); }
  renderCargo();
}
function marketParams() {
  const params = new URLSearchParams({server: $("server").value, city: $("cargoCity").value,
    premium: $("premium").checked, max_age_min: $("maxAge").value});
  for (const id of ['family', 'tier', 'enchantment']) if ($(id).value !== '') params.set(id, $(id).value);
  if (allCities()) { params.delete('city'); params.set('all_cities', 'true'); }
  params.set('live', $('livePrices').checked);
  params.set('profile', $('itemProfile').value);
  return params;
}
async function loadOpportunities() {
  scanController?.abort(); scanController = new AbortController();
  const request = ++scanRequest, version = contextVersion;
  $('refresh').disabled = true;
  const scope = marketParams().toString() + '|filters=' + designFilterKey();
  if (queryScope !== scope) {
    queryScope = scope; tracker = new OpportunityModel.Tracker(); currentData = [];
    visibleLimit = 100; lockedOrder.clear();
    $('lastQuery').textContent = 'Aguardando a primeira consulta com estes filtros.';
    renderTable();
    detectAlerts();
  }
  if (!$("marketForm").checkValidity()) {
    liveFeed?.close(); liveFeed = null;
    $('refresh').disabled = false;
    status('status', 'Corrija os filtros. A atualização está pausada.', 'error'); return;
  }
  connectLive();
  $("refresh").disabled = true;
  status("status", currentData.length ? "Atualizando… Os últimos dados continuam visíveis; confira a idade dos preços." : "Consultando preços…", "info");
  try {
    const response = await fetch(`/api/opportunities?${marketParams()}`, {signal: scanController.signal});
    if (!response.ok) {
      const failure = await response.json().catch(() => null);
      const error = new Error(typeof failure?.error === 'string' ? failure.error : `A consulta retornou HTTP ${response.status}.`);
      error.queryFailure = true;
      throw error;
    }
    const data = await response.json();
    if (version !== contextVersion || request !== scanRequest) return;
    const now = Date.now();
    receiveItems(data);
    const fetchedAt = Number(response.headers.get('X-Prices-Fetched-At')) * 1000;
    $('lastQuery').textContent = `Consulta concluída: ${new Date(now).toLocaleTimeString('pt-BR')} · ${response.headers.get('X-Catalog-Queried') || '—'} combinações consultadas` +
      (fetchedAt > 0 ? ` · Dados obtidos da API: ${new Date(fetchedAt).toLocaleTimeString('pt-BR')}` : '');
    status("status", ""); renderTable();
  } catch (error) {
    if (error.name !== "AbortError" && version === contextVersion && request === scanRequest)
      status("status", `${error.queryFailure ? error.message : 'Não foi possível concluir a consulta. Verifique a conexão com a ferramenta.'} Os últimos dados foram preservados com a idade original; não são confirmação de preço atual.`, "error");
  } finally { if (request === scanRequest) { $("refresh").disabled = false; renderTable(); } }
}
function riskFor(item) {
  return RiskModel.evaluate(item, $('premium').checked, Number($('stressDrop').value));
}
function riskLabel(item) {
  const risk = riskFor(item);
  if (!risk.recent) return '<small class="risk-old">Referência antiga ou horário inválido · não indicada para compra</small>';
  if (!risk.valid) return '<small class="risk-old">Preencha uma queda válida para avaliar o risco</small>';
  return `<small class="${risk.eligible ? 'pos' : 'risk-old'}">Cotação recente · ${risk.eligible ? 'resiste à queda simulada' : 'sem margem para a queda simulada'}</small><small>Lucro/un. com queda de ${fmt(Number($('stressDrop').value))}%: ${fmt(risk.stressedProfit)} prata. Execução não garantida.</small>`;
}
function riskNumbers(item) {
  const risk = riskFor(item);
  if (!risk.valid) return '—';
  return `${fmt(risk.breakEven)} prata<small>${risk.dropRoom > 0 ? `Queda até empatar: ${fmt(risk.dropRoom)}%` : 'Sem margem para queda'}</small>`;
}
function renderTable() {
  const focus = rememberMarketFocus();
  tracker.expire(Date.now(), Number($('maxAge').value), $('livePrices').checked);
  currentData = tracker.items;
  const search = $("search").value.toLocaleLowerCase();
  const oldest = Date.now() - Number($('maxAge').value) * 60000;
  const recentCount = currentData.filter(item => riskFor(item).recent).length;
  const positiveCount = currentData.filter(item => item.profit > 0).length;
  $('freshnessSummary').textContent = `${currentData.length} pares de preços encontrados · ${positiveCount} com lucro estimado positivo · ${recentCount} recentes (até 2 min).`;
  const qualified = currentData.filter(item => liquidityFor(item)?.liquid === true).length;
  $('liquiditySummary').textContent = $('prioritizeLiquidity').checked
    ? `Filtro de liquidez ativo · ${qualified} de ${currentData.length} pares com volume consistente. Histórico ausente, insuficiente ou vencido fica fora.`
    : 'Filtro de liquidez desativado: a lista e a sugestão podem incluir itens sem demanda comprovada. Alertas continuam exigindo liquidez.';
  const sorted = TableSort.rank(currentData.filter(item => passesLiquidity(item) && ($('showReferences').checked || riskFor(item).recent) && item.sourceObserved >= oldest && item.bmObserved >= oldest &&
    (!$("profitableOnly").checked || item.profit > 0) &&
    `${item.item_name} ${item.item_id} ${cityName(item.source_city)}`.toLocaleLowerCase().includes(search))
    , sortCriteria);
  if ($('lockOrder').checked) {
    for (const item of sorted) if (!lockedOrder.has(identity(item))) lockedOrder.set(identity(item), lockedOrder.size);
    sorted.sort((a, b) => lockedOrder.get(identity(a)) - lockedOrder.get(identity(b)));
  }
  const activeSort = sortCriteria.length ? sortCriteria : [{key:'profit', desc:true}];
  const combined = activeSort.length > 1;
  document.querySelectorAll('th[data-key]').forEach(th => {
    th.dataset.label ||= th.textContent;
    const index = activeSort.findIndex(rule => rule.key === th.dataset.key);
    const rule = activeSort[index];
    th.textContent = th.dataset.label + (rule ? ` ${rule.desc ? '↓' : '↑'} ${combined ? '•' : ''}` : '');
    th.setAttribute('aria-sort', rule ? (combined ? 'other' : rule.desc ? 'descending' : 'ascending') : 'none');
    th.setAttribute('aria-label', th.dataset.label + (rule ? `, ${combined ? 'ranking combinado, mesmo peso' : 'ordenação'}, ${rule.desc ? 'maiores primeiro' : 'menores primeiro'}` : ', adicionar à ordenação'));
  });
  $('sortSummary').textContent = sortCriteria.length ? (combined ? 'Ranking combinado · mesmo peso: ' : 'Ordenação: ') + activeSort.map(rule => {
    const th = document.querySelector(`th[data-key="${rule.key}"]`);
    return `${th.dataset.label} ${rule.desc ? '↓' : '↑'}`;
  }).join(' + ') + (combined ? '. Melhor posição média entre os resultados filtrados; dados ausentes ficam no fim.' : '') : 'Ordenação padrão: maior lucro/un.';
  $('resultCount').textContent = `${Math.min(visibleLimit, sorted.length)} de ${sorted.length} resultados exibidos · ${sorted.filter(item => !riskFor(item).recent).length} referência(s) antiga(s).`;
  $('showMore').hidden = sorted.length <= visibleLimit;
  renderDesignTable(sorted);
  renderFollowing();
  renderDesignCounts();
  restoreMarketFocus(focus);
}
function renderCargo(renderRows = true) {
  $("cargoContext").textContent = `${$("server").value} · ${$("cargoCity").selectedOptions[0].text} → Black Market, Caerleon · Taxa: ${tax()}%`;
  updateSuggestState();
  $("cargoTable").hidden = cargo.length === 0;
  renderRail();
  if (!cargo.length) {
    $("cargoRows").innerHTML = ""; $("cargoTotals").textContent = "Sua carga está vazia. Adicione um item ou peça uma sugestão.";
    $("scenarios").innerHTML = ""; return;
  }
  const result = CargoModel.evaluate(cargo, $("premium").checked, Number($("cargoBudget").value), Number($("cargoWeight").value));
  if (renderRows) $("cargoRows").innerHTML = result.rows.map((item, index) => `<tr>
    <td>${label(item)}</td><td data-label="Quantidade">${cargoStepper(item,index,true)}</td>
    <td data-label="Custo por unidade"><input aria-label="Preço real de compra de ${esc(item.item_name)}" data-field="confirmedCost" data-index="${index}" type="number" min="1" step="1" placeholder="Real: conferir no jogo" value="${item.confirmedCost ?? ""}">
      <small>Estimativa: ${fmt(item.estimatedCost)} · ${age(item.sourceObserved)}</small>
      <small data-confirmation>${item.confirmedCost == null ? "Compra não conferida" : `Informado por você · ${esc(new Date(item.confirmedAt).toLocaleString("pt-BR"))}`}</small>
      <small data-cost>${fmt(item.totalCost)} no lote · ${item.totalWeight == null ? "Peso desconhecido" : fmt(item.totalWeight) + " kg"}</small></td>
    <td data-label="Oferta BM / mínimo">${fmt(item.bmPrice)}<small>${priceAge(item.bm_price_source, item.bmObserved)}</small>
      <details><summary>Mínimo e risco</summary><div data-minimum>${riskNumbers(item)}${riskLabel(item)}</div></details></td>
    <td data-label="Lucro total" data-profit class="${item.profit > 0 ? "pos" : "neg"}">${fmt(item.profit)}<small>${fmt(item.profit / item.quantity)} por unidade × ${fmt(item.quantity)}</small></td>
    <td><button type="button" data-remove="${index}">Remover</button> <button type="button" data-trade="${index}">Registrar operação</button></td></tr>`).join("");
  if (!renderRows) result.rows.forEach((item, index) => {
    const row = $("cargoRows").children[index];
    row.querySelector("[data-confirmation]").textContent = item.confirmedCost == null ? "Compra não conferida" :
      `Informado por você · ${new Date(item.confirmedAt).toLocaleString("pt-BR")}`;
    row.querySelector("[data-minimum]").innerHTML = riskNumbers(item) + riskLabel(item);
    row.querySelector("[data-cost]").innerHTML = `${fmt(item.totalCost)}<small>${item.totalWeight == null ? "Peso desconhecido" : fmt(item.totalWeight) + " kg"}</small>`;
    const profitCell = row.querySelector("[data-profit]");
    profitCell.innerHTML = `${fmt(item.profit)} prata<small>${fmt(item.profit / item.quantity)} por unidade × ${fmt(item.quantity)}</small>`;
    profitCell.className = item.profit > 0 ? "pos" : "neg";
  });
  const warnings = [];
  for (const item of cargo) {
    const warning = cargoLiquidityWarning(item);
    if (warning) warnings.push(`${item.item_name}: ${warning}. Volume histórico não confirma ordens disponíveis.`);
  }
  if (cargo.some(item => !riskFor(item).recent)) warnings.push("Há referências antigas na carga: o lucro mostrado usa os preços salvos, não confirma venda imediata agora.");
  if (!$("cargoBudget").checkValidity()) warnings.push("Informe um orçamento válido.");
  if (result.overBudget) warnings.push("A carga ultrapassa seu orçamento. Reduza as quantidades ou remova itens.");
  if (!$("cargoWeight").value || !$("cargoWeight").checkValidity()) warnings.push("Informe o peso livre no jogo para conferir a capacidade.");
  else if (result.overWeight) warnings.push("A carga ultrapassa o peso disponível.");
  if (result.unknownWeight) warnings.push("Há itens sem peso conhecido: o peso total está incompleto.");
  if (result.rows.some(item => item.profit <= 0)) warnings.push("Há itens sem lucro na carga após a alteração do preço.");
  if (result.unconfirmed) warnings.push(`${result.unconfirmed} item(ns) com preço de compra ainda não conferido.`);
  if (cargo.some(item => (Date.now() - Math.min(item.sourceObserved, item.bmObserved)) / 60000 > Number($("maxAge").value)))
    warnings.push("Há preços na carga acima da idade máxima. Confira novamente antes de comprar.");
  const bankroll = Number($("cargoBankroll").value);
  if (bankroll > 0 && result.capital > bankroll * 0.2) warnings.push(`A carga representa ${fmt(result.capital / bankroll * 100)}% do seu patrimônio informado (acima de 20%).`);
  $("cargoTotals").innerHTML = `<div class="summary-grid"><div>Capital da carga<strong>${fmt(result.capital)} prata</strong></div>
    <div>Peso ${result.unknownWeight ? "conhecido" : "total"}<strong>${fmt(result.weight)} kg</strong></div>
    <div>Lucro estimado<strong>${fmt(result.scenarios[0].profit)} prata</strong></div><div>ROI estimado<strong>${fmt(result.roi)}%</strong></div></div>
    ${warnings.map(text => `<p class="warning">${esc(text)}</p>`).join("")}`;
  $("scenarios").innerHTML = '<h3>Se o preço do BM cair</h3><div class="summary-grid">' + result.scenarios.map(s =>
    `<div>${s.drop ? `Queda de ${s.drop}%` : "Preço observado"}<strong class="${s.profit > 0 ? "pos" : "neg"}">${fmt(s.profit)} prata</strong></div>`).join("") + '</div>';
}
async function suggestCargo(event) {
  event.preventDefault();
  if (allCities() || cargo.length) return;
  if (!$("cargoForm").reportValidity()) return;
  if (!$("marketForm").checkValidity() || !$("stressDrop").checkValidity()) { status("cargoStatus", "Corrija os filtros avançados e a queda simulada antes de sugerir a carga.", "error"); return; }
  const version = contextVersion, request = ++planRequest;
  planController?.abort(); planController = new AbortController();
  const params = marketParams();
  params.set("recent_only", "true"); params.set("stress_drop_pct", $("stressDrop").value);
  params.set("liquid_only", $('prioritizeLiquidity').checked);
  params.set("budget", $("cargoBudget").value); params.set("available_weight", $("cargoWeight").value);
  params.set("max_qty_per_item", $("cargoMaxQty").value);
  $("cargoSubmit").disabled = true; $("railSuggest").disabled = true; status("cargoStatus", "Montando sugestão…", "info");
  try {
    const plan = await fetchDesignCargoPlan(params, planController.signal);
    if (version !== contextVersion || request !== planRequest || cargo.length) return;
    const now = Date.now();
    cargo = plan.items.map(item => ({item_id:item.item_id, item_name:item.item_name, quality:item.quality, source_city:$("cargoCity").value,
      quantity:item.quantity, estimatedCost:item.unit_cost, confirmedCost:null, confirmedAt:null,
      weight:item.unit_weight, bmPrice:item.bm_unit_price,
      city_price_source:item.city_price_source, bm_price_source:item.bm_price_source,
      sourceObserved:observedAt(item.city_price_date, item.source_age_min, now),
      bmObserved:observedAt(item.bm_price_date, item.bm_age_min, now)}));
    status("cargoStatus", plan.status === "no_opportunities" ? "Nenhum item atende aos filtros de liquidez, cotação recente e margem após a queda simulada. Histórico ausente não comprova demanda." :
      plan.status === "no_item_fits" ? "Nenhum item cabe no orçamento e peso informados." : "Sugestão pronta. Confira cada preço no jogo.");
    saveCargo(); renderCargo(); renderTable();
  } catch (error) {
    if (error.name !== "AbortError" && version === contextVersion && request === planRequest)
      status("cargoStatus", "Não foi possível montar a sugestão. Sua carga foi preservada.", "error");
  } finally { if (request === planRequest) updateSuggestState(); }
}
function cancelPlan() {
  ++planRequest; planController?.abort(); status("cargoStatus", "");
  updateSuggestState();
}
$("marketForm").addEventListener("submit", event => { event.preventDefault(); loadOpportunities(); });
$("cargoForm").addEventListener("submit", suggestCargo);
for (const id of ["server", "cargoCity"]) $(id).addEventListener("change", () => {
  ++contextVersion; cancelPlan(); restoreCargo(); restoreFavorites(); loadOpportunities();
});
for (const id of ["premium", "maxAge", "family", "tier", "enchantment", "livePrices", "itemProfile"]) $(id).addEventListener("change", () => {
  ++contextVersion; cancelPlan(); renderCargo(); loadOpportunities();
});
for (const id of ["cargoBudget", "cargoWeight", "cargoMaxQty", "cargoBankroll"]) $(id).addEventListener("input", () => {
  cancelPlan(); saveCargo(); renderCargo();
});
for (const id of ["search", "profitableOnly", "showReferences"]) $(id).addEventListener("input", renderTable);
document.querySelectorAll("th[data-key]").forEach(th => th.addEventListener("click", () => {
  $('lockOrder').checked = false; lockedOrder.clear();
  sortCriteria = TableSort.toggle(sortCriteria, th.dataset.key); renderTable();
}));
$('resetSort').addEventListener('click', () => {
  sortCriteria = []; $('lockOrder').checked = false; lockedOrder.clear(); renderTable();
});
$("cargoRows").addEventListener("input", event => {
  const input = event.target;
  if (!input.dataset.field) return;
  if (!input.checkValidity()) {
    status("cargoStatus", "Corrija o valor inválido. Os totais mantêm a última edição válida.", "error");
    return;
  }
  const item = cargo[Number(input.dataset.index)];
  item[input.dataset.field] = input.value === "" ? null : Number(input.value);
  if (input.dataset.field === "confirmedCost") item.confirmedAt = input.value === "" ? null : Date.now();
  status("cargoStatus", "");
  saveCargo(); renderCargo(false);
});
$("cargoRows").addEventListener("click", event => {
  const tradeButton = event.target.closest("button[data-trade]");
  if (tradeButton) { prepareTrade(cargo[Number(tradeButton.dataset.trade)]); return; }
  const button = event.target.closest("button[data-remove]"); if (!button) return;
  cargo.splice(Number(button.dataset.remove), 1); saveCargo(); renderCargo(); renderTable();
});
$('itemProfile').addEventListener('change', updateFlipProfileInfo);
async function initialize() {
  initializeDesign(); initializeLiquidity(); initializeTrades(); initializeOrders();
  restoreCargo(); restoreFavorites();
  try {
    const response = await fetch('/api/catalog');
    if (!response.ok) throw new Error();
    const catalog = await response.json();
    const research = catalog.research_profile;
    if (!research || !Array.isArray(research.item_ids)) throw new Error('Selection unavailable');
    researchIds = new Set(research.item_ids);
    flipProfiles = new Map((catalog.flip_profiles || [research]).map(profile=>[profile.id,{...profile,ids:new Set(profile.item_ids)}]));
    updateFlipProfileInfo();
    $('family').innerHTML = '<option value="">Todas</option>' + catalog.families.map(name => `<option value="${esc(name)}">${esc(name)}</option>`).join('');
    $('catalogStatus').textContent = `${fmt(catalog.count)} variantes no catálogo, incluindo artefatos e equipamentos T7/T8. Selecione Busca ampliada ou Equipamentos avançados; os filtros de tier, encantamento e família continuam se combinando. Preços antigos são apenas referência. Consultas amplas podem levar mais tempo.`;
  } catch { $('researchInfo').textContent = 'Não foi possível carregar a seleção pesquisada. Recarregue a página ou escolha Catálogo completo.'; $('catalogStatus').textContent = 'Não foi possível carregar o catálogo.'; }
  loadOpportunities();
}
$('showMore').addEventListener('click', () => { visibleLimit += 100; renderTable(); });
$('lockOrder').addEventListener('change', () => { lockedOrder.clear(); renderTable(); });
document.addEventListener('click', event => {
  const button = event.target.closest('button[data-favorite]'); if (!button) return;
  const key = button.dataset.favorite;
  if (favorites.has(key)) favorites.delete(key);
  else {
    const item = tracker.active.get(key) || tracker.recent.get(key)?.item;
    if (!item) return;
    if (favorites.size >= 100) { status('favoriteStatus', 'Limite de 100 favoritos por cidade e servidor. Remova um para adicionar outro.', 'error'); return; }
    favorites.set(key, {...item});
  }
  saveFavorites(); renderTable();
});
for (const id of ['alertsEnabled', 'alertProfit', 'alertRoi', 'alertAge', 'stressDrop']) $(id).addEventListener('change', () => {
  cancelPlan(); renderTable(); renderCargo(); detectAlerts();
  if ($('alertsEnabled').checked) loadLiquidity();
});
$('desktopAlerts').addEventListener('click', async () => {
  if (desktopAlerts) {
    desktopAlerts = false; $('desktopAlerts').textContent = 'Ativar notificações do navegador';
    status('notificationStatus', 'Notificações do navegador pausadas.'); return;
  }
  if (!('Notification' in window)) {
    status('notificationStatus', 'Este navegador não oferece notificações. Acompanhe os avisos nesta página.'); return;
  }
  try {
    const permission = await Notification.requestPermission();
    desktopAlerts = permission === 'granted';
    $('desktopAlerts').textContent = desktopAlerts ? 'Pausar notificações do navegador' : 'Ativar notificações do navegador';
    status('notificationStatus', desktopAlerts ? 'Notificações ativadas nesta sessão para os próximos alertas, enquanto a página estiver aberta.' :
      'Permissão não concedida. Os avisos continuam nesta página.');
  } catch { status('notificationStatus', 'Não foi possível ativar notificações neste navegador. Os avisos continuam nesta página.'); }
});
initialize();
setInterval(() => {
  renderTable();
  if (!$("cargoRows").contains(document.activeElement)) renderCargo();
  if (($('autoRefresh').checked || $('livePrices').checked) && !document.hidden && !$('refresh').disabled) loadOpportunities();
}, 60000);
setInterval(() => {
  renderTable();
  if (!$('cargoRows').contains(document.activeElement)) renderCargo();
}, 10000);
window.addEventListener('pagehide', () => liveFeed?.close());
