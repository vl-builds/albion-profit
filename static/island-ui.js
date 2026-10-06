(() => {
  const key='albion-island-lymhurst-v1', el=id=>document.getElementById(id);
  let rows=[], original=null, blocked=false, editing=null, editServer=null, currentServer=null;
  const notified=new Set(), audio=new AlertSound.Notifier(()=>new (window.AudioContext||window.webkitAudioContext)());
  const server=()=>el('server').value;
  const localDate=ms=>{const d=new Date(ms);return new Date(ms-d.getTimezoneOffset()*60000).toISOString().slice(0,16);};
  const date=ms=>new Date(ms).toLocaleString('pt-BR');
  function message(text) { el('islandMessage').textContent=text;el('islandFormMessage').textContent=el('islandEditor').hidden?'':text; }
  function read() {
    try { original=localStorage.getItem(key);rows=IslandModel.parse(original);blocked=false; }
    catch { blocked=true;message('Não foi possível ler os registros da ilha. Dados preservados; exporte uma cópia antes de corrigir.'); }
    el('islandSave').disabled=blocked;
  }
  function save(next) {
    if(blocked)return false;
    try {
      if(localStorage.getItem(key)!==original) { read();reset();render();message('Registros alterados em outra aba. Reabra o plantio para editar.');return false; }
      const raw=JSON.stringify(next);IslandModel.parse(raw);localStorage.setItem(key,raw);original=raw;rows=next;return true;
    } catch { message('Não foi possível salvar. Exporte seus registros e confira o armazenamento do navegador.');return false; }
  }
  function timeMode() {
    const exact=el('islandExact').checked;
    el('islandDates').hidden=!exact;el('islandQuickTime').hidden=exact;
    el('islandPlanted').required=exact;el('islandReady').required=exact;
  }
  function reset() {
    editing=null;editServer=server();el('islandForm').reset();el('islandPlanted').value=localDate(Date.now());
    el('islandSave').textContent='Iniciar acompanhamento';el('islandEditorTitle').textContent='Registrar cenouras';
    el('islandEditor').hidden=true;el('islandDetails').open=false;el('islandFormMessage').textContent='';timeMode();
  }
  function openNew(plot='',plants='') {
    reset();const used=new Set(rows.filter(r=>r.server===server()).map(r=>r.plot));let n=1;while(used.has(`Canteiro ${n}`))n++;
    el('islandPlot').value=plot||`Canteiro ${n}`;el('islandPlants').value=plants;
    el('islandEditor').hidden=false;el('islandPlants').focus();
  }
  function render() {
    const selected=rows.filter(r=>r.server===server()),active=selected.filter(r=>!r.harvested),history=selected.filter(r=>r.harvested);
    el('islandContext').textContent=`Cenouras · ${server()} · acompanhe cada canteiro`;
    el('islandSummary').innerHTML='<div><strong id="islandGrowing">0</strong>Crescendo</div><div><strong id="islandDue">0</strong>Prontos para colher</div><div><strong id="islandCollected">0</strong>Ciclos colhidos</div>';
    el('islandRows').innerHTML=active.slice().sort((a,b)=>a.ready-b.ready).map(r=>`<article class="island-plot" data-island-card="${esc(r.id)}"><div class="island-plot-top"><h3>${esc(r.plot)}</h3><span class="island-badge">Crescendo</span></div><div class="island-bed" aria-hidden="true">${Array.from({length:9},()=>'<span>🌱</span>').join('')}</div><div class="island-plot-body"><p>🥕 Cenouras · ${r.plants} sementes${r.watered?' · Com foco':''}</p><strong data-island-countdown="${esc(r.id)}"></strong><p>Previsão: ${esc(date(r.ready))}</p><progress max="100" value="0" aria-label="Tempo acompanhado até a colheita"></progress><div class="island-plot-actions"><button type="button" class="primary" data-island-harvest="${esc(r.id)}">Colher</button><button type="button" data-island-edit="${esc(r.id)}">Editar</button></div></div></article>`).join('')+`<button type="button" class="island-add" data-island-add><span aria-hidden="true">＋</span>${active.length?'Adicionar plantio':'Registrar meu primeiro plantio'}<small>Suas cenouras e o tempo restante, em um só lugar.</small></button>`;
    el('islandHistoryCount').textContent=history.length;
    el('islandHistory').innerHTML=history.slice().reverse().map(r=>`<article><h3>🥕 ${esc(r.plot)}</h3><p>Plantio: ${esc(date(r.planted))} · ${r.plants} sementes<br>Colhidas: ${r.yield===null?'não informado':fmt(r.yield)} · Sementes recuperadas: ${r.seeds===null?'não informado':fmt(r.seeds)}</p><button type="button" data-island-replant="${esc(r.id)}">Plantar novamente</button><button type="button" data-island-edit="${esc(r.id)}">Anotar resultado</button><button type="button" data-island-harvest="${esc(r.id)}">Desfazer colheita</button></article>`).join('')||'<p class="hint">Suas colheitas aparecerão aqui.</p>';
    if(history.length)el('islandHistory').insertAdjacentHTML('beforeend',`<p class="hint">Saldo dos ciclos com custo e receita preenchidos: ${fmt(IslandModel.balance(selected))} prata.</p>`);
    tick();
  }
  function tick() {
    if(currentServer!==server()) {currentServer=server();reset();render();return;}
    const selected=rows.filter(r=>r.server===server()), due=selected.filter(r=>IslandModel.state(r,Date.now())==='ready');
    el('islandGrowing').textContent=selected.filter(r=>!r.harvested).length-due.length;el('islandDue').textContent=due.length;el('islandCollected').textContent=selected.filter(r=>r.harvested).length;
    el('islandNotice').hidden=!due.length;
    el('islandNoticeText').textContent=`Cenouras prontas para colher em Lymhurst: ${due.map(r=>r.plot).join(', ')}.`;
    document.querySelectorAll('[data-island-countdown]').forEach(node=>{
      const r=rows.find(r=>r.id===node.dataset.islandCountdown);if(!r)return;
      const state=IslandModel.state(r,Date.now()), mins=Math.max(0,Math.ceil((r.ready-Date.now())/60000));
      node.textContent=state==='harvested'?'Colheita registrada':state==='ready'?'Pronto para colher':`Faltam ${Math.floor(mins/60)}h ${mins%60}min`;
      node.className=state==='ready'?'pos':'';
      const card=node.closest('[data-island-card]');if(card){
        if(card.dataset.state!==state){card.dataset.state=state;card.querySelector('.island-badge').textContent=state==='ready'?'Pronto!':'Crescendo';card.querySelectorAll('.island-bed span').forEach(plant=>plant.textContent=state==='ready'?'🥕':'🌱');}
        card.querySelector('progress').value=Math.max(0,Math.min(100,100*(Date.now()-r.planted)/(r.ready-r.planted)));
        const harvest=card.querySelector('[data-island-harvest]');harvest.disabled=blocked||state!=='ready';harvest.textContent=state==='ready'?'✓ Colher':'Aguardando colheita';
      }
    });
    const fresh=due.filter(r=>!notified.has(r.id+':'+r.ready));
    if(fresh.length&&audio.enabled) {
      try { if(audio.play()) {fresh.forEach(r=>notified.add(r.id+':'+r.ready));el('islandSoundStatus').textContent='Aviso de colheita reproduzido. Confira os plantios prontos.';} }
      catch { el('islandSoundStatus').textContent='Som indisponível. O aviso visual continua ativo.'; }
    }
  }
  el('islandForm').addEventListener('submit',event=>{
    event.preventDefault();if(editServer!==server()){reset();message('Servidor mudou. Preencha o plantio novamente.');return;}
    const old=rows.find(r=>r.id===editing),number=id=>el(id).value===''?null:Number(el(id).value);
    let planted=new Date(el('islandPlanted').value).getTime(), ready=new Date(el('islandReady').value).getTime();
    if(!el('islandExact').checked){
      const hours=number('islandHours')??0,minutes=number('islandMinutes')??0;
      if(!Number.isInteger(hours)||!Number.isInteger(minutes)||hours<0||hours>8760||minutes<0||minutes>59||hours*60+minutes<=0){message('Informe quanto falta para colher: horas e/ou minutos.');return;}
      planted=Date.now();ready=planted+(hours*60+minutes)*60000;
    }
    const row={id:editing||crypto.randomUUID(),server:server(),plot:el('islandPlot').value.trim(),plants:number('islandPlants'),planted,ready,watered:el('islandWatered').checked,harvested:old?.harvested||false,yield:number('islandYield'),seeds:number('islandSeeds'),cost:number('islandCost'),revenue:number('islandRevenue')};
    if(!IslandModel.valid(row)||row.planted>Date.now()){message('Confira os valores: plantio não pode estar no futuro e a colheita deve ser posterior ao plantio.');return;}
    if(rows.some(r=>r.id!==row.id&&r.server===row.server&&!r.harvested&&!row.harvested&&r.plot.toLowerCase()===row.plot.toLowerCase())){message('Este canteiro já tem um ciclo ativo. Edite ou registre a colheita anterior.');return;}
    if(save(old?rows.map(r=>r.id===row.id?row:r):[...rows,row])){reset();render();message('Plantio salvo neste navegador.');}
  });
  function rowAction(event){
    const button=event.target.closest('button');if(!button)return;
    if(button.hasAttribute('data-island-add')){openNew();return;}
    const id=button.dataset.islandEdit||button.dataset.islandHarvest||button.dataset.islandReplant,r=rows.find(r=>r.id===id&&r.server===server());if(!r)return;
    if(button.dataset.islandReplant){
      if(rows.some(other=>other.server===r.server&&!other.harvested&&other.plot.toLowerCase()===r.plot.toLowerCase())){message('Este canteiro já tem um plantio em andamento.');return;}
      openNew(r.plot,r.plants);return;
    }
    if(button.dataset.islandEdit){reset();el('islandEditor').hidden=false;el('islandExact').checked=true;el('islandDetails').open=true;timeMode();el('islandEditorTitle').textContent=r.harvested?'Resultado da colheita':'Editar plantio';editing=id;editServer=server();el('islandPlot').value=r.plot;el('islandPlants').value=r.plants;el('islandPlanted').value=localDate(r.planted);el('islandReady').value=localDate(r.ready);el('islandWatered').checked=r.watered;for(const field of ['yield','seeds','cost','revenue'])el('island'+field[0].toUpperCase()+field.slice(1)).value=r[field]??'';el('islandSave').textContent='Salvar alterações';el('islandPlot').focus();}
    else if(!r.harvested&&Date.now()<r.ready){message('A colheita ainda não está pronta. Edite a previsão se o horário mudou.');return;}
    else if(r.harvested&&rows.some(other=>other.id!==r.id&&other.server===r.server&&!other.harvested&&other.plot.toLowerCase()===r.plot.toLowerCase())){message('Este canteiro já tem outro ciclo ativo. Edite o nome do grupo antes de desfazer.');}
    else if(save(rows.map(row=>row.id===id?{...row,harvested:!row.harvested}:row))){reset();render();message(r.harvested?'Colheita desfeita.':'Colheita registrada! No histórico, você pode anotar o resultado ou plantar novamente.');}
  }
  el('islandRows').addEventListener('click',rowAction);el('islandHistory').addEventListener('click',rowAction);
  el('islandNew').addEventListener('click',()=>openNew());
  el('islandCancel').addEventListener('click',reset);el('islandExact').addEventListener('change',timeMode);
  el('islandSound').addEventListener('click',async()=>{
    try {audio.setVolume(.75);if(!await audio.enable())throw new Error();audio.play(true);el('islandSoundStatus').textContent='Som da colheita ativado a 75% nesta página. Mantenha o computador acordado.';}
    catch {el('islandSoundStatus').textContent='Áudio bloqueado. Clique novamente para ativar; avisos visuais continuam.';}
  });
  el('islandExport').addEventListener('click',()=>{
    const blob=new Blob([original??'[]'],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='minha-ilha-lymhurst.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  window.addEventListener('storage',event=>{if(event.key===key){read();reset();render();message('Registros atualizados por outra aba.');}});
  document.addEventListener('visibilitychange',tick);
  read();reset();render();setInterval(tick,1000);
})();
