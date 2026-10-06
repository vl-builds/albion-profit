/* Presentation layer for the design handoff. Prices and calculations remain in the existing models. */
const CITY_DESIGN = {Lymhurst:['#6aa350','L',235,158],Bridgewatch:['#d09a4a','B',47,93],Martlock:['#5b8fc7','M',250,57],Thetford:['#9a6bc0','T',122,183],FortSterling:['#c9cdd6','F',145,24]};
const TIER_COLORS = {4:'#4d86c6',5:'#c0554a',6:'#d98a3c',7:'#cbb26a',8:'#dcd3c0'};
const QUALITY_COLORS = {1:'#5c6373',2:'#5f9a63',3:'#4d86c6',4:'#9a6bc0',5:'#c9a24b'};
const selectedTiers = new Set([4,5,6,7,8]), selectedEnchants = new Set([0,1,2,3,4]);
const sessionPrices = new Map();
let researchIds = new Set();
let flipProfiles = new Map();
function updateFlipProfileInfo() {
  const profile=flipProfiles.get($('itemProfile')?.value);
  if (!profile) { $('researchInfo').textContent='Catálogo completo: todas as variantes T4–T8 .0–.4. A presença no catálogo não confirma demanda no BM; confira preços e liquidez. Consultas amplas podem levar mais tempo.'; return; }
  $('researchInfo').innerHTML=`${esc(profile.description)}<br>${profile.item_ids.length} variantes · seleção revisada em ${esc(profile.researched_at)}.<br>Fontes: `+profile.sources.map(source=>`<a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.title)}</a>`).join(' · ');
}
let activeTab = 'scanner', detailKey = null, routeCity = 'Thetford', soundEnabled = false;
let noticeTimeout, noticeUndo = null;
let alertSpeaker;
const alertSettingsKey = "albion-alert-settings-v1";
function designFilterKey() { return [...selectedTiers].sort().join(',') + '/' + [...selectedEnchants].sort().join(','); }
function itemTier(item) { return Number(/^T(\d+)/.exec(item.item_id)?.[1]); }
function itemEnchant(item) { return Number(item.item_id.split('@')[1] || 0); }
function designMatches(item) {
  const profile=$('itemProfile')?.value || 'all';
  const allowed=profile==='bm_core'?researchIds:flipProfiles.get(profile)?.ids;
  return selectedTiers.has(itemTier(item)) && selectedEnchants.has(itemEnchant(item)) && (profile==='all' || !!allowed?.has(item.item_id));
}
function cityCrest(city) {
  const [color,initial] = CITY_DESIGN[city] || ['#c9a24b','★'];
  return `<span class="crest" style="--city-color:${color}" aria-hidden="true">${initial}</span>`;
}
function itemFrame(item) {
  const icon = `https://render.albiononline.com/v1/item/${encodeURIComponent(item.item_id)}.png?quality=${encodeURIComponent(item.quality)}&size=128`;
  const unavailable = failedItemIcons.has(icon);
  return `<span class="item-icon-frame${unavailable ? ' icon-unavailable' : ''}" style="--quality-color:${QUALITY_COLORS[item.quality] || QUALITY_COLORS[1]};--tier-color:${TIER_COLORS[itemTier(item)] || TIER_COLORS[4]}" aria-hidden="true">${unavailable ? '' : `<img class="item-icon" draggable="false" src="${esc(icon)}" alt="" width="56" height="56" loading="lazy" decoding="async" referrerpolicy="no-referrer">`}<span class="tier-badge">T${itemTier(item)}.${itemEnchant(item)}</span></span>`;
}
function designLabel(item) {
  return `<div class="item-label">${itemFrame(item)}<span><span class="item-name">${esc(item.item_name)}</span><small class="item-subtitle">T${itemTier(item)}.${itemEnchant(item)} · ${esc(QUALITY_NAMES[item.quality] || 'Qualidade desconhecida')}</small>${item.source_city ? `<small class="item-city">${cityCrest(item.source_city)}${esc(cityName(item.source_city))}</small>` : ''}</span></div>`;
}
function recordPriceObservations(items) {
  const now = Date.now();
  for (const item of items) {
    if (!(item.bmObserved > 0) || item.bmObserved > now || !(item.bm_price > 0)) continue;
    const key = `${$('server').value}:${identity(item)}`;
    const entry = sessionPrices.get(key) || {points:[],change:0,changedAt:0};
    const last = entry.last || entry.points.at(-1);
    if (last && item.bmObserved <= last.time) continue;
    if (last && item.bm_price !== last.price) { entry.change = item.bm_price > last.price ? 1 : -1; entry.changedAt = now; }
    entry.last={time:item.bmObserved,price:item.bm_price};
    entry.points.push(entry.last);
    entry.points = entry.points.filter(p => p.time >= now - 1800000).slice(-40);
    sessionPrices.delete(key); sessionPrices.set(key,entry);
  }
  while (sessionPrices.size > 2500) sessionPrices.delete(sessionPrices.keys().next().value);
}
function priceFlash(item) {
  const entry = sessionPrices.get(`${$('server').value}:${identity(item)}`);
  return entry && Date.now() - entry.changedAt < 1600 ? (entry.change > 0 ? 'flash-up' : 'flash-down') : '';
}
function bmValue(item) {
  const entry=sessionPrices.get(`${$('server').value}:${identity(item)}`);
  const elapsed=entry ? Math.max(0,Date.now()-entry.changedAt) : 0;
  return `<span class="bm-value ${priceFlash(item)}" style="--pulse-delay:-${elapsed}ms" data-bm-key="${esc(identity(item))}">${fmt(item.bm_price)}</span>`;
}
function trendSeries(item) {
  const points=(sessionPrices.get(`${$('server').value}:${identity(item)}`)?.points || []).filter(p=>p.time>=Date.now()-1800000);
  if(points.length>=2) return {points,source:'session',caption:'Sessão · 30 min',description:'Ofertas BM observadas nos últimos 30 minutos desta sessão'};
  const history=liquidityFor(item)?.price_history || [];
  const daily=history.map(p=>({time:Date.parse(p.date+'T00:00:00Z'),price:p.avg_price,units:p.item_count}))
    .filter(p=>Number.isFinite(p.time) && p.time<Date.now() && Number.isFinite(p.price) && p.price>0 && p.units>0).sort((a,b)=>a.time-b.time);
  return {points:daily,source:'daily',caption:'7d · médias diárias',description:'Médias diárias negociadas no BM nos últimos 7 dias completos; não são ofertas atuais. Dias ausentes não são zero.'};
}
function trendHeading(item) {return trendSeries(item).source==='session' ? 'Oferta do BM · últimos 30 minutos' : 'Preço negociado no BM · médias diárias';}
function sparkline(item, large = false) {
  const trend=trendSeries(item), points=trend.points;
  if(points.length<2) return `<span class="spark-empty">${large ? 'Aguardando novas observações ou histórico suficiente para desenhar a tendência.' : 'Sem histórico suficiente'}</span>`;
  const width=large?320:80,height=large?90:28,pad=large?8:3;
  const values=points.map(p=>p.price),min=Math.min(...values),max=Math.max(...values),range=max-min||1;
  const duration=points.at(-1).time-points[0].time||1;
  const xy=points.map(p=>({x:pad+(p.time-points[0].time)/duration*(width-2*pad),y:max===min?height/2:height-pad-(p.price-min)/range*(height-2*pad)}));
  const color=values.at(-1)>=values[0]?'#4cc46a':'#f0564c';
  const segments=xy.slice(1).map((p,i)=>`<line x1="${xy[i].x.toFixed(1)}" y1="${xy[i].y.toFixed(1)}" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}" ${trend.source==='daily' && points[i+1].time-points[i].time>86400000*1.5?'stroke-dasharray="3 3"':''}/>`).join('');
  const label=`${points.length} ${trend.source==='session'?'observações nesta sessão':'médias diárias'}: de ${fmt(values[0])} a ${fmt(values.at(-1))} prata`;
  return `<span class="spark-wrap" data-trend-source="${trend.source}" title="${esc(trend.description)}"><svg class="sparkline" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(label)}"><title>${esc(trend.description)}</title><g fill="none" stroke="${color}" stroke-width="${large?1.8:1.5}" stroke-linecap="round">${segments}</g></svg><span class="trend-caption">${trend.caption}</span></span>`;
}
function bestRoundItems(items) {
  const seen=new Set();
  return [...items].filter(item=>item.profit>0 && passesLiquidity(item) && (!$('prioritizeLiquidity').checked || riskFor(item).eligible)).sort((a,b)=>b.profit-a.profit).filter(item=>{
    const key=`${item.item_id}:${item.quality}`;if(seen.has(key))return false;seen.add(key);return true;
  }).slice(0,3);
}
function heroCard(item,index) {
  const risk=riskFor(item),oldest=Math.max(0,(Date.now()-Math.min(item.sourceObserved,item.bmObserved))/60000);
  const state=risk.recent ? (risk.eligible?'Cotação recente':'Margem apertada na simulação') : `Referência antiga · ${fmt(oldest)} min`;
  return `<article class="opportunity-card hero-card" style="--tier-color:${TIER_COLORS[itemTier(item)]}" tabindex="0" data-detail="${esc(identity(item))}" draggable="${risk.recent}" aria-label="Detalhes de ${esc(item.item_name)}"><span class="hero-rank">0${index+1}</span>${label(item)}<div class="hero-content"><div class="hero-profit pos">${fmt(item.profit)}</div><small>Lucro/un. · <span class="pos">ROI ${fmt(item.margin_pct)}%</span></small></div><div class="hero-trend">${sparkline(item)}</div><div class="hero-footer"><span class="hero-quote-state ${risk.recent&&risk.eligible?'pos':'row-risk'}">${state}</span>${addButton(item)}</div></article>`;
}
function addButton(item, compact = false) {
  return `<button type="button" class="add-button" data-add="${esc(identity(item))}" aria-label="Adicionar uma unidade de ${esc(item.item_name)} à carga" ${!riskFor(item).recent || !passesLiquidity(item) ? 'disabled title="Aguarde cotação recente e liquidez comprovada"' : ''}>${compact ? '+' : '+ Carga'}</button>`;
}
function rememberMarketFocus() {
  const el=document.activeElement;
  const scope=el?.closest('#rows,#heroCards,#mobileOpportunities,#favoriteRows,#recentRows');
  if(!scope) return null;
  const attribute=['data-add','data-favorite','data-detail'].find(name=>el.hasAttribute(name));
  return attribute ? `#${scope.id} [${attribute}="${CSS.escape(el.getAttribute(attribute))}"]` : null;
}
function restoreMarketFocus(selector) {
  if(selector) document.querySelector(selector)?.focus({preventScroll:true});
}
const scannerViewKey = 'albion-scanner-view-v1';
function restoreScannerView() {
  // Every new session starts broad, including when the browser restores form values.
  $('cargoCity').value='all';
  for(const id of ['family','tier','enchantment','search']) $(id).value='';
  $('maxAge').value='1440';
  $('showReferences').checked=true;
  $('profitableOnly').checked=true;
  $('autoRefresh').checked=true;
  selectedTiers.clear();[4,5,6,7,8].forEach(value=>selectedTiers.add(value));
  selectedEnchants.clear();[0,1,2,3,4].forEach(value=>selectedEnchants.add(value));
  try {
    const saved=JSON.parse(localStorage.getItem(scannerViewKey) || 'null');
    if(!saved || typeof saved!=='object' || Array.isArray(saved)) return;
    if(['Americas','Europe'].includes(saved.server)) $('server').value=saved.server;
  } catch { /* Keep the visible defaults if browser storage is unavailable or corrupt. */ }
}
function saveScannerView() {
  try { localStorage.setItem(scannerViewKey,JSON.stringify({server:$('server').value})); }
  catch { showNotice('Não foi possível guardar os filtros neste navegador.'); }
}
function scannerEmptyHtml() {
  const action=(value,text)=>`<button type="button" data-scan-action="${value}">${text}</button>`;
  let title,detail,buttons='';
  if($('refresh').disabled) {
    title='Consultando os mercados…'; detail='A lista aparece quando a consulta terminar.';
  } else if($('status').classList.contains('error')) {
    title='Não foi possível concluir a consulta';detail='Confira a mensagem acima e tente atualizar os preços.';buttons=action('refresh','Tentar novamente');
  } else if(!currentData.length) {
    title='Nenhum par de preços disponível nestes filtros';detail=`A compra na cidade e a oferta do BM precisam ter dados dentro de ${$('maxAge').value} minutos. Não significa que o item não exista no jogo. A seleção de itens também se combina com os filtros de tier, encantamento e família.`;
    buttons=action('filters','Revisar filtros')+action('refresh','Atualizar preços');
  } else {
    const search=$('search').value.toLocaleLowerCase().trim();
    const matching=currentData.filter(item=>`${item.item_name} ${item.item_id} ${cityName(item.source_city)}`.toLocaleLowerCase().includes(search));
    const profitable=matching.filter(item=>!$('profitableOnly').checked || item.profit>0);
    if(!matching.length) { title='Nenhum resultado corresponde à busca';detail='Há preços disponíveis, mas os nomes não correspondem à sua busca.';buttons=action('search','Limpar busca'); }
    else if(!profitable.length) { title='Nenhum lucro positivo nos preços encontrados';detail=`Há ${matching.length} resultado(s) com preços, mas o filtro “Somente lucrativos” os oculta.`;buttons=action('losses','Ver também itens sem lucro'); }
    else if($('prioritizeLiquidity').checked && profitable.every(item=>!passesLiquidity(item))) {
      title='Nenhuma oportunidade com liquidez comprovada';detail='O histórico pode estar em consulta, insuficiente ou abaixo do volume mínimo. Confira o andamento em Mais filtros e acompanhamento. Não significa zero vendas.';
    }
    else if(!$('showReferences').checked && profitable.every(item=>!riskFor(item).recent)) {
      title=`${profitable.length} resultado(s) oculto(s) por idade`;detail='As cotações têm mais de 2 minutos. Você pode consultá-las como referência, sem tratá-las como oferta atual.';buttons=action('references','Mostrar referências antigas');
    } else {title='Nenhum item com estes filtros';detail='Ajuste a busca, a idade ou os filtros selecionados.';buttons=action('filters','Revisar filtros');}
  }
  return `<strong class="empty-title">${esc(title)}</strong><small>${esc(detail)}</small>${buttons ? `<div class="empty-actions">${buttons}</div>` : ''}`;
}
function renderDesignTable(sorted) {
  const shown = sorted.slice(0,visibleLimit);
  $('tableCount').textContent = `${sorted.length} resultados`;
  $('rows').innerHTML = shown.map(item => {
    const risk = riskFor(item), inCargo = cargo.some(c=>identity(c)===identity(item));
    return `<tr tabindex="0" data-detail="${esc(identity(item))}" draggable="${risk.recent}" class="${inCargo ? 'in-cargo' : ''}" aria-label="Detalhes de ${esc(item.item_name)} em ${esc(cityName(item.source_city))}"><td><div class="item-label"><span class="drag-handle" aria-hidden="true">⠿</span>${label(item)}</div>${liquidityBadge(item)}</td><td>${cityCrest(item.source_city)} ${esc(cityName(item.source_city))}</td><td class="price-cell">${fmt(item.city_price)}<small>${priceAge(item.city_price_source,item.sourceObserved)}</small></td><td class="price-cell">${bmValue(item)}<small>${priceAge(item.bm_price_source,item.bmObserved)}</small></td><td class="${item.profit>0 ? 'pos' : item.profit<0 ? 'neg' : ''}">${fmt(item.profit)}${!risk.recent ? '<small class="row-risk">Referência antiga</small>' : ''}</td><td class="${item.margin_pct>0?'pos':item.margin_pct<0?'neg':''}">${fmt(item.margin_pct)}%</td><td class="daily-sales">${dailySalesCell(item)}</td><td>${sparkline(item)}</td><td>${item.profit_per_kg == null ? '—' : fmt(item.profit_per_kg)}<small>${item.weight == null ? 'Peso desconhecido' : fmt(item.weight)+' kg'}</small></td><td><div class="table-actions">${favoriteButton(item)}${addButton(item)}</div></td></tr>`;
  }).join('') || `<tr><td colspan="10" class="empty">${scannerEmptyHtml()}</td></tr>`;
  const best=bestRoundItems(sorted);
  $('heroCards').innerHTML=best.map(heroCard).join('') || `<div class="hero-empty">Sem resultados lucrativos nestes filtros.<small>Com o filtro de liquidez ativo, os destaques exigem volume consistente, cotação recente e lucro após a queda simulada.</small></div>`;
  $('mobileOpportunities').innerHTML = shown.map(item => `<article class="opportunity-card mobile-card" style="--tier-color:${TIER_COLORS[itemTier(item)]}" tabindex="0" data-detail="${esc(identity(item))}" aria-label="Detalhes de ${esc(item.item_name)}">${label(item)}${addButton(item,true)}<div class="mobile-profit ${item.profit>0 ? 'pos':item.profit<0?'neg':''}">${fmt(item.profit)}</div><div class="mobile-metrics"><span class="${item.margin_pct>0?'pos':item.margin_pct<0?'neg':''}">ROI ${fmt(item.margin_pct)}%</span> · ${item.profit_per_kg == null ? '—' : fmt(item.profit_per_kg)}/kg${liquidityBadge(item)}${dailySalesCell(item)}</div><div class="spark-container">${sparkline(item)}</div><div class="mobile-prices"><span>Compra ${fmt(item.city_price)}<small>${age(item.sourceObserved)} · ${item.city_price_source === 'live' ? 'recebido' : 'API'}</small></span><span>BM ${bmValue(item)}<small>${age(item.bmObserved)} · ${item.bm_price_source === 'live' ? 'recebido' : 'API'}</small></span></div>${!riskFor(item).recent ? '<small class="row-risk">Referência antiga · não indicada para compra</small>' : ''}</article>`).join('') || `<div class="hero-empty">${scannerEmptyHtml()}</div>`;
  renderDesignCounts(); refreshDetail(); renderRailAlerts();
}
function showTab(name, focus = false) {
  if (!$(`view-${name}`)) return;
  activeTab=name;
  document.body.classList.toggle("island-active",name==="island");
  document.querySelectorAll('.tab-view').forEach(view=>view.hidden=view.id!==`view-${name}`);
  document.querySelectorAll('[data-tab]').forEach(button=> {
    if (button.dataset.tab===name) button.setAttribute('aria-current','page'); else button.removeAttribute('aria-current');
  });
  $('moreMenu').hidden=true; $('mobileMore').setAttribute('aria-expanded','false');
  if (['routes','alerts','trades','resources','builds','island'].includes(name)) $('mobileMore').setAttribute('aria-current','page'); else $('mobileMore').removeAttribute('aria-current');
  if (name==='routes') renderMaps();
  if (name==='cargo') renderCargo();
  if (name==='trades') renderTrades();
  document.title=`Albion Profit · ${{scanner:'Scanner',routes:'Rotas',cargo:'Carga',favs:'Favoritos',alerts:'Alertas',trades:'Meus flips',resources:'Coleta',builds:'Armas e builds',island:'Minha ilha'}[name]}`;
  if (focus) { $('mainContent').focus({preventScroll:true}); window.scrollTo({top:0,behavior:'instant'}); }
}
function renderDesignCounts() {
  const counts={cargo:cargo.reduce((sum,i)=>sum+i.quantity,0),favs:favorites.size,alerts:alertHistory.length};
  for(const [key,value] of Object.entries(counts)) document.querySelectorAll(`[data-count="${key}"]`).forEach(el=>el.textContent=value);
  $('balanceValue').textContent=$('cargoBankroll').value ? fmt(Number($('cargoBankroll').value)) : '—';
}
function selectCity(city) {
  if ($('cargoCity').value===city) return;
  $('cargoCity').value=city; $('cargoCity').dispatchEvent(new Event('change',{bubbles:true}));
  if (city!=='all') routeCity=city;
  syncDesignFilters();
}
function syncDesignFilters() {
  const city=$('cargoCity').value;
  $('cityChips').innerHTML=['all',...Object.keys(CITY_DESIGN)].map(value=>`<button type="button" data-city="${value}" aria-pressed="${value===city}">${cityCrest(value)}${value==='all' ? 'Todas' : esc(cityName(value))}</button>`).join('');
  $('tierChips').innerHTML=[4,5,6,7,8].map(value=>`<button type="button" class="tier-chip" style="--tier-color:${TIER_COLORS[value]}" data-tier="${value}" aria-pressed="${selectedTiers.has(value)}">T${value}</button>`).join('');
  $('enchantChips').innerHTML=[0,1,2,3,4].map(value=>`<button type="button" data-enchant="${value}" aria-pressed="${selectedEnchants.has(value)}">.${value}</button>`).join('');
  document.querySelectorAll('[data-server]').forEach(button=>button.setAttribute('aria-pressed',button.dataset.server===$('server').value));
  renderMaps(); updateSuggestState();
}
async function fetchDesignCargoPlan(params, signal) {
  const tiers=selectedTiers.size===5 ? [null] : [...selectedTiers];
  const enchants=selectedEnchants.size===5 ? [null] : [...selectedEnchants];
  const groups=tiers.flatMap(tier=>enchants.map(enchantment=>({tier,enchantment})));
  // Each request uses the existing server optimizer. Allocate the remaining limits
  // to subsequent groups, so a mixed selection never exceeds the same budget/weight.
  const budget=Number(params.get('budget')), capacity=Number(params.get('available_weight'));
  const items=[];
  let hadFitCandidate=false;
  for(const group of groups) {
    const used=CargoModel.evaluate(items.map(item=>({quantity:item.quantity,estimatedCost:item.unit_cost,
      confirmedCost:null,bmPrice:item.bm_unit_price,weight:item.unit_weight})),params.get('premium')==='true',budget,capacity);
    const usedGrams=items.reduce((sum,item)=>sum+Math.round(item.unit_weight*1000)*item.quantity,0);
    const remainingBudget=Math.max(0,Math.floor(budget-used.capital));
    const remainingWeight=Math.max(0,(Math.round(capacity*1000)-usedGrams)/1000);
    if(remainingBudget<1 || remainingWeight<.001) break;
    const query=new URLSearchParams(params);
    for(const name of ['tier','enchantment']) group[name]===null ? query.delete(name) : query.set(name,group[name]);
    query.set('budget',remainingBudget);query.set('available_weight',remainingWeight);
    const response=await fetch(`/api/cargo-plan?${query}`,{signal});
    if(!response.ok) throw new Error('Cargo plan unavailable');
    const plan=await response.json();
    if(!Array.isArray(plan.items)) throw new Error('Invalid cargo plan');
    items.push(...plan.items);
    if(plan.status!=='no_opportunities') hadFitCandidate=true;
  }
  return {items,status:items.length ? 'ok' : hadFitCandidate ? 'no_item_fits' : 'no_opportunities'};
}
function updateSuggestState() {
  const disabled=cargo.length>0 || allCities();
  $('cargoSubmit').disabled=disabled;
  $('railSuggest').disabled=disabled;
  const hint=allCities() ? 'Escolha uma cidade para sugerir uma carga. Você pode adicionar itens manualmente.' : cargo.length ? 'Sua carga usa preços salvos. Confira os custos e a oferta no jogo.' : 'Informe orçamento e peso livre para montar uma sugestão.';
  $('railPlanHint').textContent=hint;
  $('cargoSubmit').title=disabled ? hint : '';
}
function showNotice(text,undo=null) {
  clearTimeout(noticeTimeout); noticeUndo=undo;
  $('actionNotice').innerHTML=esc(text)+(undo ? '<button type="button" id="undoAction">Desfazer</button>' : '');
  $('actionNotice').hidden=false;
  noticeTimeout=setTimeout(()=>{$('actionNotice').hidden=true;noticeUndo=null;},undo ? 15000 : 4500);
}
function addDesignItem(key) {
  const item=currentData.find(row=>identity(row)===key);
  if (item && !passesLiquidity(item)) { showNotice('Este item não tem liquidez comprovada. Consulte o histórico antes de montar a carga.'); return; }
  if (!item || !designMatches(item) || !riskFor(item).recent || OpportunityModel.staleReason(item,Date.now(),Number($('maxAge').value),$('livePrices').checked)) {
    showNotice('A cotação já não é recente. Aguarde novos dados antes de adicionar.'); renderTable(); return;
  }
  cancelPlan();
  const existing=cargo.find(row=>identity(row)===key);
  if (existing) existing.quantity++;
  else cargo.push({item_id:item.item_id,item_name:item.item_name,quality:item.quality,source_city:item.source_city,quantity:1,
    estimatedCost:item.city_price,confirmedCost:null,confirmedAt:null,weight:item.weight,city_price_source:item.city_price_source,bm_price_source:item.bm_price_source,bmPrice:item.bm_price,sourceObserved:item.sourceObserved,bmObserved:item.bmObserved});
  saveCargo(); renderCargo(); renderTable();
  showNotice(`${item.item_name}: ${existing ? existing.quantity : 1} un. na carga.`);
}
function stepCargo(index,delta) {
  if (!cargo[index]) return;
  cancelPlan(); cargo[index].quantity+=delta;
  if (cargo[index].quantity<1) cargo.splice(index,1);
  saveCargo(); renderCargo(); renderTable();
}
function cargoStepper(item,index,editable=false) {
  return `<div class="stepper"><button type="button" data-step="${index}" data-delta="-1" aria-label="Diminuir quantidade de ${esc(item.item_name)}">−</button>${editable ? `<input aria-label="Quantidade de ${esc(item.item_name)}" data-field="quantity" data-index="${index}" type="number" min="1" step="1" required value="${item.quantity}">` : `<span>${item.quantity}</span>`}<button type="button" data-step="${index}" data-delta="1" aria-label="Aumentar quantidade de ${esc(item.item_name)}">+</button></div>`;
}
function meter(label,value,max,unit,unknown=false) {
  const ratio=max>0 ? value/max : 0, color=ratio>=1 ? 'var(--red)' : ratio>=.85 ? 'var(--amber)' : 'var(--green)';
  return `<div class="meter"><div class="meter-label"><span>${label}</span><strong>${fmt(value)}${unit} / ${max>0 ? fmt(max)+unit : 'não informado'}${unknown ? ' · parcial' : ''}</strong></div><div class="meter-track" role="meter" aria-label="${label}${unknown ? ', peso parcial' : ''}" aria-valuemin="0" aria-valuemax="${max>0 ? max : Math.max(1,value)}" aria-valuenow="${max>0 ? Math.min(value,max) : value}" aria-valuetext="${fmt(value)}${unit}${max>0 ? ' de '+fmt(max)+unit : ', limite não informado'}" style="--fill:${Math.min(100,Math.max(0,ratio*100))}%;--meter-color:${color}"><span></span></div></div>`;
}
function renderRail() {
  const result=CargoModel.evaluate(cargo,$('premium').checked,Number($('cargoBudget').value),Number($('cargoWeight').value));
  const weight=meter('Peso livre',result.weight,Number($('cargoWeight').value),' kg',result.unknownWeight);
  const budget=meter('Orçamento',result.capital,Number($('cargoBudget').value),'');
  const rows=result.rows.map((item,index)=>`<div class="rail-cargo-row">${label(item)}${cargoStepper(item,index)}<span class="row-profit ${item.profit>=0 ? 'pos' : 'neg'}">${fmt(item.profit)} prata${!riskFor(item).recent ? ' · cotação antiga' : ''}</span></div>`).join('');
  const empty='<div class="drop-empty"><span>＋</span>Arraste itens do Scanner<br>ou use <b>Sugerir carga</b>.</div>';
  const profit=result.scenarios[0].profit;
  const totals=`<div><label>Capital investido</label><strong>${fmt(result.capital)}</strong></div><div><label>Lucro estimado</label><strong class="${profit>=0 ? 'pos':'neg'}">${fmt(profit)}</strong></div>`;
  $('railMeters').innerHTML=budget+weight;
  $('railCargoItems').innerHTML=rows||empty;
  $('railTotals').innerHTML=totals;
  $('clearCargo').disabled=!cargo.length;
  $('mobileCargoSummary').innerHTML=weight+`${fmt(result.capital)} investidos · <span class="${profit>=0 ? 'pos':'neg'}">${fmt(profit)} estimados</span>`;
  if ($('cargoSheet').open) $('sheetContent').innerHTML=budget+weight+(rows||empty)+`<div class="rail-kpis">${totals}</div><p class="hint">Estimativa com preços salvos; não confirma demanda para toda a quantidade.</p>`;
  renderDesignCounts(); updateSuggestState();
}
function renderRailAlerts() {
  $('railCriteria').textContent=`${fmt(Number($('alertProfit').value))} · ${$('alertRoi').value}%`;
  $('railAlerts').innerHTML=alertHistory.slice(0,4).map(item=>{
    const current=tracker.active.get(identity(item));
    return `<div class="rail-alert-row"><div>${label(item)}<p><span class="alert-city">${esc(cityName(item.source_city))} · </span><span class="pos">${fmt(item.profit)}</span> · ROI ${fmt(item.margin_pct)}% · ${esc(new Date(item.alertedAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}))}</p><small>Registro do aviso; confira o preço atual.</small></div>${current && riskFor(current).recent ? addButton(current,true) : '<span class="spark-empty">Histórico</span>'}</div>`;
  }).join('') || `<div class="rail-alert-empty">${$('alertsEnabled').checked ? 'Aguardando uma oportunidade que atenda aos seus critérios.' : 'Alertas pausados.'}<small>Confira a cotação atual antes de comprar.</small></div>`;
  renderDesignCounts();
}
function mapSvg(large=false) {
  const city=routeCity, selected=CITY_DESIGN[city], ids=Object.entries(CITY_DESIGN);
  return `<svg class="route-map" viewBox="0 0 300 215" role="group" aria-label="Mapa esquemático; selecione uma cidade de compra"><circle cx="150" cy="103" r="70" fill="rgba(192,85,74,.035)" stroke="#292029" stroke-dasharray="3 5"/>${selected ? `<path class="active-route" d="M ${selected[2]} ${selected[3]} Q ${(selected[2]+150)/2+20} ${(selected[3]+103)/2} 150 103" fill="none" stroke="${selected[0]}" stroke-width="1.2" stroke-dasharray="5 5"/>` : ''}<circle cx="150" cy="103" r="17" fill="#1a1216" stroke="#a8433a"/><text x="150" y="107" text-anchor="middle" class="map-initial" style="--city-color:#d9776c">C</text><text x="150" y="133" text-anchor="middle" style="font-size:9px;fill:#d9776c">Caerleon · Black Market</text>${ids.map(([name,[color,initial,x,y]])=>`<g data-map-city="${name}" tabindex="0" role="button" aria-label="Selecionar ${esc(cityName(name))}" aria-pressed="${city===name}"><circle cx="${x}" cy="${y}" r="${city===name ? 12 : 10}" fill="${city===name ? '#241f12' : '#12151c'}" stroke="${color}" stroke-width="${city===name ? 2 : 1}"/><text class="map-initial" style="--city-color:${color};font-size:9px" x="${x}" y="${y+3}" text-anchor="middle">${initial}</text><text x="${x}" y="${y<103 ? y-16 : y+23}" text-anchor="middle" style="font-size:${large ? 9 : 8}px">${esc(cityName(name))}</text></g>`).join('')}</svg>`;
}
function renderMaps() {
  if ($('cargoCity').value!=='all') routeCity=$('cargoCity').value;
  $('miniMap').innerHTML=mapSvg(); $('largeMap').innerHTML=mapSvg(true);
  $('routeChips').innerHTML=Object.keys(CITY_DESIGN).map(city=>`<button type="button" data-city="${city}" aria-pressed="${routeCity===city}">${cityCrest(city)}${esc(cityName(city))}</button>`).join('');
  $('routeTitle').textContent=`${cityName(routeCity)} → Caerleon`;
  $('routeOrigin').innerHTML=cityCrest(routeCity)+esc(cityName(routeCity));
}
function detailItem() { return tracker.active.get(detailKey) || favorites.get(detailKey) || tracker.recent.get(detailKey)?.item; }
function openDetail(key) {
  detailKey=key; const item=detailItem(); if(!item) return;
  $('detailHeader').innerHTML=`${label(item)}<h2 id="detailTitle" class="sr-only">${esc(item.item_name)}</h2><small style="font-family:var(--mono)">${esc(item.item_id)}</small><button type="button" data-close="detailDialog" aria-label="Fechar detalhes">×</button>`;
  $('detailFooter').innerHTML=`<button class="primary" type="button" data-add="${esc(key)}">Adicionar à carga</button>${favoriteButton(item)}`;
  refreshDetail(true); $('detailDialog').showModal(); $('detailBody').scrollTop=0;
}
function refreshDetail(force=false) {
  if(!force && !$('detailDialog').open) return;
  const item=detailItem(); if(!item) { $('detailBody').innerHTML='<p class="warning">Este item não está mais disponível na consulta. Feche o painel e aguarde novos dados.</p>'; $('detailFooter').querySelector('[data-add]').disabled=true; return; }
  const risk=riskFor(item), current=tracker.active.has(detailKey);
  const kpis=[['Lucro/un.',fmt(item.profit),item.profit>0 ? 'pos':'neg'],['ROI',fmt(item.margin_pct)+'%',item.margin_pct>0?'pos':'neg'],['Lucro/kg',item.profit_per_kg==null ? '—':fmt(item.profit_per_kg),''],['Peso',item.weight==null ? 'Desconhecido':fmt(item.weight)+' kg','']];
  $('detailBody').innerHTML=`<div class="summary-grid">${kpis.map(([title,value,color])=>`<div>${title}<strong class="${color}">${value}</strong></div>`).join('')}</div><h3>${trendHeading(item)}</h3>${sparkline(item,true)}<dl><div><dt>Compra em ${esc(cityName(item.source_city))}</dt><dd>${fmt(item.city_price)}</dd></div><div><dt>Oferta do Black Market</dt><dd>${fmt(item.bm_price)}</dd></div><div><dt>Taxa de venda (${tax()}%)</dt><dd class="neg">−${fmt(item.bm_price*tax()/100)}</dd></div><div><dt>Venda mínima para empatar</dt><dd>${risk.valid ? fmt(risk.breakEven) : '—'}</dd></div><div><dt>Compra · idade</dt><dd>${priceAge(item.city_price_source,item.sourceObserved)}</dd></div><div><dt>BM · idade</dt><dd>${priceAge(item.bm_price_source,item.bmObserved)}</dd></div></dl>${!current ? '<p class="warning">Fora da consulta atual. Valores históricos; aguarde atualização.</p>' : ''}${riskLabel(item)}<h3>Saída no Black Market</h3>${liquidityCell(item)}<p class="hint">Histórico por item e qualidade; dias ausentes são desconhecidos. A média histórica não é uma oferta disponível.</p><p class="hint">O gráfico identifica sua fonte: ofertas observadas na sessão ou médias históricas de negociação. Trechos tracejados indicam dias sem dados. Não confirma estoque, cancelamentos nem execução na chegada. Pedidos de venda têm espera e taxas adicionais.</p>`;
  const add=$('detailFooter').querySelector('[data-add]'); if(add) add.disabled=!current || !risk.recent;
  const fav=$('detailFooter').querySelector('[data-favorite]'); if(fav) {const selected=favorites.has(detailKey); fav.textContent=selected?'★':'☆';fav.setAttribute('aria-pressed',selected);fav.setAttribute('aria-label',`${selected?'Desfavoritar':'Favoritar'} ${item.item_name}`);}
}
function speaker() {
  return alertSpeaker ||= new AlertSound.Notifier(() => new (window.AudioContext || window.webkitAudioContext)());
}
function saveAlertSettings() {
  const values = Object.fromEntries(['alertProfit','alertRoi','alertAge','stressDrop','soundVolume'].map(id=>[id,$(id).value]));
  try { localStorage.setItem(alertSettingsKey,JSON.stringify({...values, enabled:$('alertsEnabled').checked})); }
  catch { status('soundStatus','Não foi possível guardar as preferências. Elas valem nesta sessão.'); }
}
function restoreAlertSettings() {
  try {
    const saved=JSON.parse(localStorage.getItem(alertSettingsKey) || 'null');
    if(saved && typeof saved==='object') {
      for(const id of ['alertProfit','alertRoi','alertAge','stressDrop','soundVolume']) {
        const old=$(id).value;
        if(typeof saved[id]!=='string' || saved[id].trim()==='') continue;
        $(id).value=saved[id];
        if(!$(id).checkValidity()) $(id).value=old;
      }
      if(typeof saved.enabled==='boolean') $('alertsEnabled').checked=saved.enabled;
    }
  } catch { /* Invalid saved preferences do not stop monitoring. */ }
}
async function enableAlertSound() {
  try {
    speaker().setVolume(Number($('soundVolume').value)/100);
    soundEnabled=await speaker().enable();
    if(!soundEnabled) throw new Error('Audio not running');
    speaker().play(true);
    syncSound();
    status('soundStatus','Som ativado nesta página. O teste reproduz as mesmas três notas dos avisos.','pos');
  } catch {
    alertSpeaker?.disable();soundEnabled=false;syncSound();
    status('soundStatus','O navegador não liberou o áudio. Clique novamente em Ativar som; os avisos visuais continuam.','error');
  }
}
function playAlertSound() {
  if(!soundEnabled) return;
  try {
    speaker().play();
    if(speaker().context.state!=='running') {
      speaker().disable();soundEnabled=false;syncSound();
      status('soundStatus','Áudio suspenso pelo navegador. Clique em Ativar som para retomar.','error');
    }
  } catch {
    alertSpeaker?.disable();soundEnabled=false;syncSound();
    status('soundStatus','Som indisponível. Os avisos continuam na tela.','error');
  }
}
function syncSound() {
  $('soundToggle').setAttribute('aria-pressed',soundEnabled);
  $('soundToggle').setAttribute('aria-label',soundEnabled?'Desativar som dos alertas':'Ativar som dos alertas');
  $('settingsSound').setAttribute('aria-pressed',soundEnabled);
  $('settingsSound').textContent=soundEnabled?'♪ Desativar som':'♪ Ativar som';
  $('soundSummary').textContent=soundEnabled
    ? `Som ativado · volume ${$('soundVolume').value}% · ${$('alertsEnabled').checked?'monitorando os critérios':'alertas pausados'}`
    : 'Som desativado · ative para ouvir novas oportunidades';
  $('soundVolumeValue').textContent=$('soundVolume').value+'%';
}
function announceOpportunities(hits) {
  if(!hits.length) return;
  const best=hits[0];
  $('opportunityNotice').hidden=false;
  $('opportunityNoticeText').textContent=`${hits.length} oportunidade(s) nos seus critérios · ${best.item_name} · ${cityName(best.source_city)} · ${fmt(best.profit)} prata/un. · ROI ${fmt(best.margin_pct)}% · ${new Date(best.alertedAt).toLocaleTimeString('pt-BR')}. Registro do aviso; confira o preço atual.`;
  playAlertSound();
}
function syncLiveDisplay() {
  const live=$('livePrices').checked, connected=$('liveStatus').classList.contains('pos');
  $('liveDot').className='live-dot '+(!live ? 'paused' : connected ? 'connected' : '');
  $('liveCompact').textContent=!live?'Fluxo pausado':connected?`Fluxo conectado · ${$('server').value}`:'Conectando ao fluxo';
  $('toggleLive').textContent=live?'Pausar':'Retomar';
  $('toggleLive').setAttribute('aria-label',live?'Pausar recepção de observações':'Retomar recepção de observações');
  $('refreshVisible').disabled=$('refresh').disabled;
}
function initializeDesign() {
  restoreScannerView();
  restoreAlertSettings();
  // Reuse the original fields and IDs, so drafts, listeners and form validation survive the redesign.
  $('searchSlot').append($('search').closest('label'));
  document.querySelector('.filter-tiers').append($('quickFilters'));
  $('search').placeholder='Buscar item, tier ou código…';
  for(const id of ['premium','profitableOnly','showReferences']) $('quickFilters').append($(id).closest('label'));
  $('premium').closest('label').lastChild.textContent=' Premium';
  $('premium').closest('label').title='Premium: imposto de venda de 4%; sem Premium: 8%.';
  for(const id of ['freshnessSummary','status','lastQuery']) document.querySelector('.scan-status').append($(id));
  $('marketForm').querySelector('#refresh').hidden=true;
  for(const id of ['alertProfit','alertRoi','alertAge']) {
    const output=document.createElement('output');output.className='range-value';output.htmlFor=id;
    const update=()=>{output.textContent=fmt(Number($(id).value))+(id==='alertRoi'?'%':id==='alertAge'?' min':' prata');};
    $(id).closest('label').append(output); $(id).addEventListener('input',update);update();
  }
  for(const id of ['server','cargoCity','showReferences']) $(id).addEventListener('change',saveScannerView);
  document.addEventListener('click',event=>{
    const scanAction=event.target.closest('[data-scan-action]');
    if(scanAction) {
      const action=scanAction.dataset.scanAction;
      if(action==='references') { $('showReferences').checked=true;saveScannerView();renderTable(); }
      if(action==='losses') { $('profitableOnly').checked=false;renderTable(); }
      if(action==='search') { $('search').value='';renderTable(); }
      if(action==='filters') { $('advancedFilters').open=true;$('maxAge').focus(); }
      if(action==='refresh') loadOpportunities();
      return;
    }
    if(event.target.closest('.brand')){event.preventDefault();showTab('scanner',true);return;}
    const tabButton=event.target.closest('[data-tab]');if(tabButton){showTab(tabButton.dataset.tab,true);return;}
    const close=event.target.closest('[data-close]');if(close){$(close.dataset.close).close();return;}
    const city=event.target.closest('[data-city],[data-map-city]');if(city){selectCity(city.dataset.city || city.dataset.mapCity);return;}
    const server=event.target.closest('[data-server]');if(server){if($('server').value===server.dataset.server)return;$('server').value=server.dataset.server;$('server').dispatchEvent(new Event('change',{bubbles:true}));syncDesignFilters();return;}
    const filter=event.target.closest('[data-tier],[data-enchant]');if(filter){
      const isTier=filter.dataset.tier!==undefined, set=isTier ? selectedTiers : selectedEnchants, value=Number(isTier?filter.dataset.tier:filter.dataset.enchant);
      if(set.has(value) && set.size===1){showNotice('Mantenha pelo menos uma opção selecionada.');return;}
      set.has(value)?set.delete(value):set.add(value);
      const input=$(isTier?'tier':'enchantment');input.value=set.size===1 ? [...set][0] : '';
      input.dispatchEvent(new Event('change',{bubbles:true}));syncDesignFilters();
      document.querySelector(`[data-${isTier?'tier':'enchant'}="${value}"]`)?.focus({preventScroll:true});return;
    }
    const add=event.target.closest('[data-add]');if(add && !add.disabled){addDesignItem(add.dataset.add);return;}
    const step=event.target.closest('[data-step]');if(step){
      const index=Number(step.dataset.step),delta=Number(step.dataset.delta);stepCargo(index,delta);
      document.querySelector(`${$('cargoSheet').open?'#sheetContent':activeTab==='cargo'?'#cargoRows':'#railCargoItems'} [data-step="${index}"][data-delta="${delta}"]`)?.focus({preventScroll:true});return;
    }
    if(event.target.closest('#undoAction') && noticeUndo){noticeUndo();noticeUndo=null;$('actionNotice').hidden=true;return;}
    if(event.target.closest('button,input,select,a,summary'))return;
    const detail=event.target.closest('[data-detail]');if(detail)openDetail(detail.dataset.detail);
  });
  document.addEventListener('keydown',event=>{
    if (event.key==='Escape') {$('moreMenu').hidden=true;$('mobileMore').setAttribute('aria-expanded','false');}
    if (!['Enter',' '].includes(event.key) || event.target.closest('button,input,select,a,summary')) return;
    const target=event.target;
    if(target.matches('[data-detail]')){event.preventDefault();openDetail(target.dataset.detail);}
    if(target.matches('[data-map-city]')){event.preventDefault();selectCity(target.dataset.mapCity);}
    if(target.matches('th[data-key]')){event.preventDefault();target.click();}
  });
  document.addEventListener('dragstart',event=>{
    const row=event.target.closest('[data-detail][draggable=true]');if(!row || !event.dataTransfer)return;
    event.dataTransfer.setData('application/x-albion-item',row.dataset.detail);event.dataTransfer.effectAllowed='copy';
  });
  $('cargoDropZone').addEventListener('dragover',event=>{if(!event.dataTransfer?.types.includes('application/x-albion-item'))return;event.preventDefault();event.dataTransfer.dropEffect='copy';$('cargoDropZone').classList.add('drag-over');});
  $('cargoDropZone').addEventListener('dragleave',event=>{if(!$('cargoDropZone').contains(event.relatedTarget))$('cargoDropZone').classList.remove('drag-over');});
  $('cargoDropZone').addEventListener('drop',event=>{event.preventDefault();$('cargoDropZone').classList.remove('drag-over');const key=event.dataTransfer?.getData('application/x-albion-item');if(key)addDesignItem(key);});
  document.addEventListener('dragend',()=>$('cargoDropZone').classList.remove('drag-over'));
  for(const id of ['detailDialog','cargoSheet']) $(id).addEventListener('click',event=>{if(event.target!==$(id))return;const rect=$(id).getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)$(id).close();});
  $('clearCargo').addEventListener('click',()=>{
    if(!cargo.length)return;const previous=cargo.map(i=>({...i})),key=contextKey();cargo=[];cancelPlan();saveCargo();renderCargo();renderTable();
    showNotice('Carga esvaziada.',()=>{if(contextKey()!==key){showNotice('Volte à cidade e ao servidor anteriores para recuperar a carga.');return;}cargo=previous;saveCargo();renderCargo();renderTable();});
  });
  $('railSuggest').addEventListener('click',()=>{showTab('cargo',true);if($('cargoForm').reportValidity())$('cargoForm').requestSubmit();});
  $('refreshVisible').addEventListener('click',loadOpportunities);
  $('toggleLive').addEventListener('click',()=>{$('livePrices').checked=!$('livePrices').checked;$('livePrices').dispatchEvent(new Event('change',{bubbles:true}));syncLiveDisplay();});
  for(const id of ['soundToggle','settingsSound']) $(id).addEventListener('click',()=>{
    if(soundEnabled) {speaker().disable();soundEnabled=false;syncSound();status('soundStatus','Som desativado. Os avisos visuais continuam.');}
    else enableAlertSound();
  });
  $('testSound').addEventListener('click',enableAlertSound);
  $('soundVolume').addEventListener('input',()=>{speaker().setVolume(Number($('soundVolume').value)/100);syncSound();saveAlertSettings();});
  $('dismissOpportunity').addEventListener('click',()=>{$('opportunityNotice').hidden=true;});
  for(const id of ['alertProfit','alertRoi','alertAge','stressDrop','alertsEnabled']) $(id).addEventListener('change',()=>{saveAlertSettings();syncSound();});
  syncSound();
  $('openCargoSheet').addEventListener('click',()=>{$('cargoSheet').showModal();renderRail();});
  $('sheetEdit').addEventListener('click',()=>{$('cargoSheet').close();showTab('cargo',true);$('cargoBudget').focus();});
  $('mobileMore').addEventListener('click',()=>{$('moreMenu').hidden=!$('moreMenu').hidden;$('mobileMore').setAttribute('aria-expanded',!$('moreMenu').hidden);});
  new MutationObserver(syncLiveDisplay).observe($('liveStatus'),{childList:true,attributes:true});
  new MutationObserver(syncLiveDisplay).observe($('refresh'),{attributes:true,attributeFilter:['disabled']});
  for(const id of ['server','cargoCity']) $(id).addEventListener('change',syncDesignFilters);
  syncDesignFilters();syncLiveDisplay();renderRailAlerts();showTab(typeof location !== 'undefined' && location.hash.startsWith('#sel=') ? 'builds' : 'scanner');
}
