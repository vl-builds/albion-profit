(() => {
const {LS, LSF, LEGACY, DEF, ACTL, MODS, TR, TN, QN, TYPE, SLOTL, GHOST, ICON, RANKO, I, SETS, PN, PB, WSK, ASK, KEYC, BUILDS, AXES, LSM, MENTORS, DSK, hash, pt} = typeof module !== "undefined" ? require("./arsenal-data.js") : globalThis.ArsenalData;
class Arsenal {
  constructor(root) {
    this.root = root;
    this.storageOkay = true;
    this.mentorsOkay = true;
    this.props = {};
  }
  state={f:{...DEF},adv:false,showInfo:false,listTab:'catalog',selId:'b1',alts:{},drafts:{},saved:[],picking:null,detail:null,hover:null,skillSel:{row:'weapon',key:'Q'},compareMode:false,compareId:null,compareWarn:'',radar:null,imgFail:{},notice:'',mTab:'equip',w:1300,showExtra:false,saveName:'',myMentors:[],mf:{name:'',url:'',ctx:''},notesD:{}};
  setState(update) {
    const patch = typeof update === 'function' ? update(this.state) : update;
    if (!Object.entries(patch).some(([k,v]) => this.state[k] !== v)) return;
    Object.assign(this.state, patch);
    if (!this.root) return;
    if (this.renderPending) return;
    this.renderPending = true;
    queueMicrotask(() => { this.renderPending = false; this.render(); });
  }
  async initialize() {
    this.props.demoState = 'carregando'; this.render();
    try {
      const response = await fetch('/build-catalog.json');
      if (!response.ok) throw Error('Catálogo indisponível');
      this.connectCatalog(await response.json());
      this.restoreStorage();
      this.props.demoState = 'normal';
    } catch (error) {
      this.props.demoState = 'fonte indisponível';
      this.catalogUnavailable = true;
    }
    this.render();
    this.ro = new ResizeObserver(() => {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = setTimeout(() => {
        const w = this.root.offsetWidth;
        if (w > 0 && Math.abs(w - this.state.w) > 24) this.setState({w});
      }, 60);
    });
    this.ro.observe(this.root);
    this.root.addEventListener('error', e => {
      if (e.target.tagName !== 'IMG') return;
      const id = this.imageId(e.target);
      if (id) { this.state.imgFail[id] = true; this.imageFallback(e.target, id); }
    }, true);
    this.root.addEventListener('dragstart', () => {
      this.root.classList.add('is-dragging');
      this.root.querySelectorAll('.arsenal-window > [inert]').forEach(node => {node.inert=false;});
    });
    ['dragend','drop'].forEach(type => this.root.addEventListener(type, () => {
      this.root.classList.remove('is-dragging');
      const modal = !!this.root.querySelector('[role="dialog"]');
      this.root.querySelectorAll('.arsenal-window > :not(.arsenal-picker-backdrop):not(.arsenal-detail-backdrop):not(.arsenal-toast)').forEach(node => {node.inert=modal;});
    }));
    this.root.addEventListener('keydown', e => {
      if (e.key === 'Escape') { this.root.classList.remove('is-dragging'); this.setState({picking:null,detail:null,compareMode:false}); return; }
      if (['ArrowLeft','ArrowRight','Home','End'].includes(e.key) && e.target.getAttribute('role') === 'tab') {
        const tabs = [...e.target.closest('[role="tablist"]').querySelectorAll('[role="tab"]')], index=tabs.indexOf(e.target);
        const next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(index+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
        e.preventDefault(); tabs[next].focus(); tabs[next].click(); return;
      }
      if (e.key !== 'Tab') return;
      const dialog = [...this.root.querySelectorAll('[role="dialog"]')].at(-1);
      if (!dialog) return;
      const nodes = [...dialog.querySelectorAll('button:not(:disabled),input,select,textarea,a[href],[tabindex="0"]')].filter(x => x.getClientRects().length);
      const first = nodes[0], last = nodes.at(-1);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    });
  }
  connectCatalog(catalog) {
    if (!Array.isArray(catalog) || !catalog.length) throw Error('Catálogo inválido');
    const slots = {weapon:'weapon',offhand:'off',head:'head',body:'armor',feet:'shoes',cape:'cape'};
    for (const item of catalog) {
      if (!slots[item.slot] || !/^T4_[A-Z0-9_]+$/.test(item.id)) continue;
      const base = item.id.slice(3), key = Object.keys(I).find(k => I[k].base === base) || 'X_' + base;
      const type = /_PLATE_/.test(base) ? 'plate' : /_LEATHER_/.test(base) ? 'leather' : /_CLOTH_/.test(base) ? 'cloth' : undefined;
      I[key] = {...I[key],k:key,slot:slots[item.slot],base,name:item.name.replace(/ do Adepto$/, ''),fam:type ? TYPE[type] : item.family,type,twoH:!!item.twoHanded,rank:item.rank,sec:item.second};
    }
  }
  validFilters(raw) {
    const f = {...DEF};
    if (!raw || typeof raw !== 'object') return f;
    const allowed = {act:['all',...Object.keys(ACTL)],role:['all','Dano','Tanque','Suporte','Cura'],server:['Americas','Europe','Asia'],sort:['played','winrate','pop','cost','recent','author','name'],win:['24h','7d','30d','custom'],armor:['all',...Object.keys(TYPE)],tier:['0','4','5','6','7','8'],ench:['-1','0','1','2','3','4'],qual:['0','1','2','3','4','5']};
    for (const [k,values] of Object.entries(allowed)) if (values.includes(raw[k])) f[k] = raw[k];
    if (['all',...(MODS[f.act] || [])].includes(raw.mod)) f.mod = raw.mod;
    if (raw.fam === 'all' || Object.values(I).some(i => i.slot === 'weapon' && i.fam === raw.fam)) f.fam = raw.fam;
    if (typeof raw.q === 'string') f.q = raw.q.slice(0,150);
    for (const k of ['from','to']) if (/^\d{4}-\d{2}-\d{2}$/.test(raw[k] || '')) f[k] = raw[k];
    return f;
  }
  validate(record) {
    const b = record?.slots ? this.fromLegacy(record) : record;
    if (!b || typeof b.id !== 'string' || !/^[\w-]{1,140}$/.test(b.id) || ['__proto__','constructor','prototype'].includes(b.id) || BUILDS.some(x=>x.id===b.id) || typeof b.title !== 'string' || !b.title.trim() || b.title.length > 100 || !Object.hasOwn(ACTL,b.act) || ![4,5,6,7,8].includes(b.tier) || ![0,1,2,3,4].includes(b.ench) || ![1,2,3,4,5].includes(b.qual) || !b.p || typeof b.p !== 'object') throw Error('Cópia de builds inválida.');
    const p = {};
    for (const [slot,key] of Object.entries(b.p)) {
      if (!Object.hasOwn(SLOTL,slot) || (key !== null && (!Object.hasOwn(I,key) || I[key].slot !== slot))) throw Error('Equipamento incompatível com o espaço da build.');
      p[slot] = key;
    }
    if (!p.weapon || (I[p.weapon].twoH && p.off)) throw Error('Confira a arma e a mão secundária.');
    const sk = {...DSK};
    for (const k of Object.keys(sk)) if (Number.isInteger(b.sk?.[k]) && b.sk[k] >= 0 && b.sk[k] < 20) sk[k] = b.sk[k];
    if (b.notes != null && (typeof b.notes !== 'string' || b.notes.length > 2000)) throw Error('Plano de jogo inválido.');
    return {id:b.id,title:b.title.trim(),act:b.act,mod:typeof b.mod === 'string' ? b.mod.slice(0,60) : '—',role:typeof b.role === 'string' ? b.role.slice(0,30) : '—',tier:b.tier,ench:b.ench,qual:b.qual,p,sk,alts:[],notes:b.notes || '',legacy:!!b.legacy,origin:typeof b.origin === 'string' ? b.origin.slice(0,140) : '',upd:typeof b.upd === 'string' ? b.upd.slice(0,30) : '',savedAt:typeof b.savedAt === 'string' ? b.savedAt.slice(0,30) : ''};
  }
  readBuilds(key) {
    const rows = JSON.parse(localStorage.getItem(key) || '[]');
    if (!Array.isArray(rows) || rows.length > 200) throw Error('Cópia inválida');
    const result = rows.map(b => this.validate(b));
    if (new Set(result.map(b => b.id)).size !== result.length) throw Error('Identificadores repetidos');
    return result;
  }
  restoreStorage() {
    let saved = [];
    try { saved = this.readBuilds(LS); } catch { this.storageOkay = false; }
    try {
      const legacy = this.readBuilds(LEGACY);
      const ids = new Set(saved.map(b => b.id));
      saved.push(...legacy.filter(b => !ids.has(b.id)));
      if (saved.length > 200) throw Error('Limite de builds');
    } catch { this.storageOkay = false; }
    this.state.saved = saved;
    if (!this.storageOkay) this.state.notice = 'Não foi possível ler todas as builds salvas. Os dados originais foram preservados; exporte os registros recuperados. Gravação bloqueada.';
    try {
      const rows = JSON.parse(localStorage.getItem(LSM) || '[]');
      if (!Array.isArray(rows) || rows.some(m => !m || typeof m.name !== 'string' || !this.safeCreatorUrl(m.url) || !Object.hasOwn(I,m.weapon) || typeof m.id !== 'string' || typeof m.ctx !== 'string' || typeof m.added !== 'string')) throw Error();
      this.state.myMentors = rows;
    } catch { this.mentorsOkay = false; }
    try {
      const shared = location.hash.startsWith('#sel=') ? JSON.parse(decodeURIComponent(location.hash.slice(5))) : null;
      this.state.f = this.validFilters(shared?.f || JSON.parse(localStorage.getItem(LSF) || 'null'));
      if (shared && this.all().some(b => b.id === shared.id)) {
        this.state.selId = shared.id;
        this.state.listTab = saved.some(b => b.id === shared.id) ? 'mine' : 'catalog';
      }
    } catch { /* Keep usable defaults for a malformed filter or link. */ }
  }
  safeCreatorUrl(value) {
    try { const u = new URL(value); return u.protocol === 'https:' && ['youtube.com','www.youtube.com','m.youtube.com','youtu.be','www.youtu.be','twitch.tv','www.twitch.tv','m.twitch.tv'].includes(u.hostname) && !u.username && !u.password; } catch { return false; }
  }
  imageId(img) {
    try { return decodeURIComponent(new URL(img.getAttribute('src')).pathname.split('/').at(-1)).replace(/\.png$/, ''); } catch { return ''; }
  }
  imageFallback(img,id) {
    const item = Object.values(I).find(i => i.fixed === id || i.base === id.replace(/^T\d_/,'').replace(/@\d$/,''));
    const label = document.createElement('span'); label.className = 'arsenal-image-fallback';
    label.textContent = 'Imagem indisponível' + (item ? ' · ' + item.name : '');
    img.replaceWith(label);
  }
  showHover(slot) {
    if (this.restoringFocus || this.root?.classList.contains('is-dragging') || this.state.hover === slot) return;
    this.state.hover = slot;
    if (!this.root) return;
    // Update only the summary: replacing the hovered tile can interrupt a click or drag.
    const hv = this.renderVals().hv;
    const name = this.root.querySelector('[data-node="n231"]');
    const meta = this.root.querySelector('[data-node="n232"]');
    const button = this.root.querySelector('[data-node="n233"]');
    if (name) name.textContent = hv.name;
    if (meta) meta.textContent = hv.meta;
    if (button) button.hidden = !hv.has;
  }
  render() {
    if (!this.root) return;
    const active = this.root.contains(document.activeElement) ? document.activeElement : null;
    const focus = active?.dataset.node, start = active?.selectionStart, end = active?.selectionEnd;
    const scroll = [...this.root.querySelectorAll('[data-node]')].filter(e => e.scrollTop || e.scrollLeft).map(e => [e.dataset.node,e.scrollTop,e.scrollLeft]);
    const opened = [...this.root.querySelectorAll('details[open]')].map(e => e.dataset.node);
    const oldDialogs = [...this.root.querySelectorAll('[role="dialog"]')].map(d => d.dataset.node);
    const oldDialog = oldDialogs.at(-1);
    const handlers = [];
    const values = this.renderVals();
    values.exportBuilds = () => this.exportBuilds(); values.importBuilds = e => this.importBuilds(e);
    values.openHovered = () => { const slot=this.state.hover, key=this.cur(this.sel()).p[slot]; if(key) this.setState({detail:{slot,key}}); };
    this.root.innerHTML = globalThis.renderArsenal(values, fn => { handlers.push(fn); return handlers.length - 1; });
    this.root.querySelectorAll('*').forEach(node => {
      for (const attr of [...node.attributes]) if (attr.name.startsWith('data-on-')) {
        const fn = handlers[Number(attr.value)]; if (typeof fn === 'function') node.addEventListener(attr.name.slice(8),fn);
      }
      if (node.tagName === 'SELECT') node.value = node.dataset.value;
    });
    for (const [id,top,left] of scroll) { const node = this.root.querySelector(`[data-node="${id}"]`); if (node) {node.scrollTop = top;node.scrollLeft = left;} }
    for (const id of opened) { const node = this.root.querySelector(`[data-node="${id}"]`); if (node) node.open = true; }
    this.root.querySelectorAll('img').forEach(img => { const id = this.imageId(img); if (this.state.imgFail[id]) this.imageFallback(img,id); });
    const dialog = [...this.root.querySelectorAll('[role="dialog"]')].at(-1);
    this.restoringFocus = true;
    this.dialogFocus ||= {};
    if (dialog && !oldDialogs.includes(dialog.dataset.node)) {
      this.dialogFocus[dialog.dataset.node] = focus;
      dialog.querySelector('button,input,select')?.focus({preventScroll:true});
    } else {
      const target = oldDialog && dialog?.dataset.node !== oldDialog ? this.dialogFocus[oldDialog] : focus;
      const restore = this.root.querySelector(`[data-node="${target}"]`);
      restore?.focus({preventScroll:true});
      if (restore?.setSelectionRange && start != null) { try {restore.setSelectionRange(start,end);} catch {} }
    }
    this.restoringFocus = false;
    this.root.querySelectorAll('[role="dialog"]').forEach(d => {d.inert = d !== dialog;});
    this.root.querySelectorAll('.arsenal-window > :not(.arsenal-picker-backdrop):not(.arsenal-detail-backdrop):not(.arsenal-toast)').forEach(node => {node.inert = !!dialog;});
  }
  exportBuilds() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(this.state.saved,null,2)],{type:'application/json'}));
    const a = document.createElement('a'); a.href = url; a.download = 'minhas-builds-albion.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
  }
  async importBuilds(event) {
    try {
      if (!this.storageOkay || this.catalogUnavailable) throw Error('Dados anteriores preservados; gravação bloqueada até recuperar o catálogo e o armazenamento.');
      const file = event.target.files[0]; if (!file) return;
      if (file.size > 1000000) throw Error('Arquivo muito grande.');
      const raw = JSON.parse(await file.text());
      if (!Array.isArray(raw) || raw.length > 200) throw Error('Cópia inválida.');
      const incoming = raw.map(b => this.validate(b));
      const next = [...this.state.saved], ids = new Set(next.map(b => b.id));
      for (const b of incoming) if (!ids.has(b.id)) { next.push(b); ids.add(b.id); }
      if (next.length > 200) throw Error('Limite de 200 builds.');
      localStorage.setItem(LS,JSON.stringify(next));
      this.setState({saved:next,listTab:'mine'}); this.note('Cópia importada. Registros com o mesmo identificador foram preservados.');
    } catch (error) { this.note(error.message); } finally { event.target.value = ''; }
  }
  fromLegacy(b){
    if (!b || typeof b.id !== 'string' || typeof b.name !== 'string' || !Object.hasOwn(ACTL,b.mode) || !b.slots || typeof b.notes !== 'string') throw Error('Build antiga inválida.');
    const map={weapon:'weapon',offhand:'off',head:'head',body:'armor',feet:'shoes',cape:'cape'},p={};let tier=4;
    for(const [s,id] of Object.entries(b.slots)){const slot=map[s];const m=typeof id === 'string' && /^T4_([A-Z0-9_]+)$/.exec(id);if(!slot || !m)throw Error('Equipamento antigo inválido.');const k=Object.keys(I).find(x=>I[x].base===m[1]&&I[x].slot===slot);if(!k)throw Error('Equipamento antigo não encontrado no catálogo.');p[slot]=k;}
    if(!p.weapon)return null;
    return {id:'legacy-'+b.id,title:b.name,act:b.mode,mod:'—',role:'—',tier,ench:0,qual:1,upd:'',p,alts:[],sk:{...DSK},notes:b.notes,legacy:true};
  }
  note(t){clearTimeout(this.nt);this.setState({notice:t});this.nt=setTimeout(()=>this.setState({notice:''}),3800);}
  setF(o){this.setState(s=>{const f={...s.f,...o};try{localStorage.setItem(LSF,JSON.stringify(f));}catch(e){}return {f};});}
  all(){return [...BUILDS.map(b=>({...b,src:'catalog'})),...this.state.saved.map(b=>({...b,src:'mine'}))];}
  comp(b,alt){return {p:{...b.p,...(alt>0&&b.alts[alt-1]?b.alts[alt-1]:{})},tier:b.tier,ench:b.ench||0,qual:b.qual||1,sk:{...DSK,...(b.sk||{})}};}
  cur(b){const a=this.state.alts[b.id]||0;return this.state.drafts[b.id]||this.comp(b,a);}
  dirty(b){const d=this.state.drafts[b.id];return (!!d&&JSON.stringify(d)!==JSON.stringify(this.comp(b,this.state.alts[b.id]||0))) || (Object.hasOwn(this.state.notesD,b.id)&&this.state.notesD[b.id] !== (b.notes||''));}
  iid(k,c){const it=I[k];if(!it)return '';return it.fixed||`T${c.tier}_${it.base}${c.ench?'@'+c.ench:''}`;}
  iname(k,c){const it=I[k];if(!it)return '';return it.fixed||it.fam==='Importado'?it.name:`${it.name} ${TN[c.tier]||''}`.trim();}
  itier(k,c){const it=I[k];return it&&it.fixed?it.ftier:c.tier;}
  edit(fn){const b=this.sel();const c=JSON.parse(JSON.stringify(this.cur(b)));const msg=fn(c);this.setState(s=>({drafts:{...s.drafts,[b.id]:c}}));if(msg)this.note(msg);}
  sel(){const all=this.all();return all.find(b=>b.id===this.state.selId)||all[0];}
  equip(slot,key){
    if (!Object.hasOwn(I,key) || I[key].slot !== slot) return;
    if (slot === 'off' && I[this.cur(this.sel()).p.weapon]?.twoH) { this.note('Esta arma usa duas mãos.'); return; }
    this.edit(c=>{const prev=c.p[slot];c.p[slot]=key;let m=`${this.iname(key,c)} equipado.`;
      if(slot==='weapon'){if(I[key].twoH&&c.p.off){c.p.off=null;m+=' Arma de duas mãos: mão secundária liberada.';}if(!prev||I[prev].fam!==I[key].fam){c.sk.Q=c.sk.W=c.sk.E=c.sk.P=0;m+=' Habilidades da arma revalidadas.';}}
      if(['head','armor','shoes'].includes(slot)&&(!prev||I[prev].type!==I[key].type)){const p={head:'h',armor:'a',shoes:'s'}[slot];c.sk[p+'A']=0;c.sk[p+'P']=0;m+=` Habilidades de ${SLOTL[slot]} redefinidas (novo tipo de peça).`;}
      return m;});
    this.setState({picking:null});
  }
  skillOpts(row,key,c){
    const k=c.p[row];if(!k||!I[k])return [];const it=I[k];
    if(row==='weapon'){if(key==='E')return it.e?[it.e]:[];return (WSK[it.fam]||{})[key]||[];}
    const t=it.type;if(!t)return [];return ASK[t][row][key==='P'?'P':'A'];
  }
  renderVals(){
    const st=this.state,f=st.f,P=this.props;
    const demo=P.demoState||'normal';
    const isMobile=st.w<980;
    const all=this.all();const b=this.sel();const c=this.cur(b);const alt=st.alts[b.id]||0;
    const orig=this.comp(b,0);const isDirty=this.dirty(b);
    const on={};
    ['act','mod','role','server','sort','win','from','to','q','fam','armor','tier','ench','qual'].forEach(k=>on[k]=e=>this.setF(k==='act'?{act:e.target.value,mod:'all'}:{[k]:e.target.value}));
    on.cTier=e=>this.edit(x=>{x.tier=+e.target.value;});
    on.cEnch=e=>this.edit(x=>{x.ench=+e.target.value;});
    on.cQual=e=>this.edit(x=>{x.qual=+e.target.value;});
    on.saveName=e=>this.setState({saveName:e.target.value});
    // filter
    const q=f.q.trim().toLocaleLowerCase('pt-BR');
    let list=all.filter(x=>{
      if(st.listTab==='mine'?x.src!=='mine':x.src!=='catalog')return false;
      if(f.act!=='all'&&x.act!==f.act)return false;
      if(f.mod!=='all'&&x.mod!==f.mod)return false;
      if(f.role!=='all'&&x.role!==f.role)return false;
      const xc=this.cur(x);
      if(f.fam!=='all'&&I[xc.p.weapon]?.fam!==f.fam)return false;
      if(f.armor!=='all'&&I[xc.p.armor]?.type!==f.armor)return false;
      if(+f.tier&&xc.tier<+f.tier)return false;
      if(+f.ench>=0&&xc.ench!==+f.ench)return false;
      if(+f.qual&&xc.qual<+f.qual)return false;
      if(q){const hay=[x.title,...Object.values(xc.p).filter(Boolean).map(k=>this.iname(k,xc))].join(' ').toLocaleLowerCase('pt-BR');if(!hay.includes(q))return false;}
      return true;});
    const noData=['played','winrate','pop','cost'].includes(f.sort);
    const byName=(a,z)=>a.title.localeCompare(z.title,'pt-BR');
    if(f.sort==='recent')list.sort((a,z)=>(z.upd||z.savedAt||'').localeCompare(a.upd||a.savedAt||''));
    else if(f.sort==='author')list.sort((a,z)=>{const ra=a.act==='1v1'?RANKO[I[this.cur(a).p.weapon]?.rank]??9:9,rz=z.act==='1v1'?RANKO[I[this.cur(z).p.weapon]?.rank]??9:9;return ra-rz||byName(a,z);});
    else list.sort(byName);
    const sortL={played:'Mais jogadas',winrate:'Taxa de vitória',pop:'Popularidade',cost:'Custo'}[f.sort];
    const sortNote=noData?`${sortL}: dados ainda indisponíveis para ${f.server} · ${ {'24h':'24 horas','7d':'7 dias','30d':'30 dias',custom:'período personalizado'}[f.win]}. Ordenado por nome, sem ranking.`:f.sort==='author'?'Ordenado pela avaliação do autor M4ax (apenas 1×1). Opinião, não estatística.':f.sort==='recent'?'Ordenado pela data de atualização da composição.':'Ordenado por nome.';
    if(demo==='vazio')list=[];
    const loading=demo==='carregando';
    const tileRow=isMobile?72:84, mini=isMobile?36:40;
    const rows=loading?[]:list.map(x=>{const xc=this.cur(x);const s=x.id===b.id;const w=I[xc.p.weapon]||{};const r=x.act==='1v1'&&w.rank;
      return {id:x.id,title:x.title,sel:s,aria:`${x.title}, ${ACTL[x.act]||x.act}`,go:()=>this.pickRow(x),key:e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();this.pickRow(x);}},
        bg:s?'linear-gradient(90deg, rgba(231,194,106,.6), rgba(231,194,106,.18))':'transparent',marker:s?'#b8862b':'transparent',
        ribbon:s?'linear-gradient(90deg,#7a5a3a,#9c7a55)':'transparent',ribbonFg:s?'#fff6e2':'#3a2414',
        wImg:ICON(this.iid(xc.p.weapon,xc),xc.qual),tier:TR[xc.tier],hasOff:!!xc.p.off,offImg:xc.p.off?ICON(this.iid(xc.p.off,xc),xc.qual):'',
        minis:['head','armor','shoes','cape'].filter(k=>xc.p[k]).map(k=>({img:ICON(this.iid(xc.p[k],xc),xc.qual),name:this.iname(xc.p[k],xc)})),
        act:ACTL[x.act]||x.act,mod:x.mod,role:x.role,hasRank:!!r,rank:w.rank,
        src:x.src==='mine'?(x.legacy?'Importada':'Minha build'):'Catálogo · demo',srcBg:x.src==='mine'?'#2f7d78':'rgba(90,60,30,.15)',srcFg:x.src==='mine'?'#effaf8':'#4a2e18',
        dirty:this.dirty(x),isB:st.compareId===x.id};});
    // slots
    const tile=isMobile?76:92, half=Math.round(tile/2)+8;
    const two=I[c.p.weapon]?.twoH;
    const slotList=['bag','head','cape','weapon','armor','off','shoes','food','potion',...(st.showExtra?['mount']:[])];
    const gridSlots=slotList.map(slot=>{const k=c.p[slot];const has=!!k&&!!I[k];const locked=slot==='off'&&two;const id=has?this.iid(k,c):'';const failed=!!st.imgFail[id];const changed=has&&(orig.p[slot]||null)!==(k||null)||(!has&&!!orig.p[slot]&&!locked);
      return {area:slot,has,empty:!has,failed,imgD:failed?'none':'block',img:has?ICON(id,c.qual):'',short:has?I[k].name:'',tier:has?TR[this.itier(k,c)]:'',hasEnch:has&&!I[k].fixed&&c.ench>0,ench:c.ench,changed,
        ghost:locked?ICON(this.iid(c.p.weapon,c),1):ICON(GHOST[slot],1),emptyLabel:locked?'Duas mãos':SLOTL[slot],emptyFg:locked?'#7e2418':'#5a3d24',
        bg:has?'linear-gradient(160deg,#557b8e,#2b4555 72%)':locked?'repeating-linear-gradient(45deg, rgba(126,36,24,.12) 0 6px, rgba(126,36,24,.04) 6px 12px)':'rgba(120,90,55,.18)',
        border:changed?'#e7c26a':has?'#1b2c37':'rgba(107,74,43,.5)',
        shadow:changed?'0 0 0 3px rgba(231,194,106,.55), inset 0 0 0 1px #9fbccb':has?'inset 0 0 0 1px #9fbccb, 0 3px 6px rgba(0,0,0,.35)':'inset 0 0 0 1px rgba(255,248,230,.4)',
        aria:locked?`Mão secundária bloqueada: arma de duas mãos`:has?`${SLOTL[slot]}: ${this.iname(k,c)}. Trocar peça`:`${SLOTL[slot]} vazio. Escolher peça`,
        pick:()=>locked?this.note('A arma equipada usa as duas mãos. Troque por uma arma de uma mão para usar a mão secundária.'):this.setState({picking:slot}),
        hover:()=>this.showHover(slot),dragOver:e=>e.preventDefault(),
        drop:e=>{e.preventDefault();const key=e.dataTransfer.getData('text/plain');if(I[key]&&I[key].slot===slot&&!locked)this.equip(slot,key);},
        iid:id,
        canRemove:has&&slot!=='weapon',removeAria:`Remover ${SLOTL[slot].toLowerCase()}`,remove:()=>this.edit(x=>{x.p[slot]=null;return `${SLOTL[slot]} removido.`;})};});
    const areas=`"bag bag head head cape cape" "weapon weapon armor armor off off" ". . shoes shoes . ." "sep sep sep sep sep sep" ". food food potion potion ."${st.showExtra?' ". . mount mount . ."':''}`;
    // hover summary
    const hs=st.hover,hk=hs&&c.p[hs];
    const hv=hk&&I[hk]?{has:true,name:this.iname(hk,c),meta:[SLOTL[hs],I[hk].fam!==SLOTL[hs]?I[hk].fam:'',`Tier ${TR[this.itier(hk,c)]}`,I[hk].fixed?'':`.${c.ench}`,QN[c.qual]].filter(Boolean).join(' · '),open:()=>this.setState({detail:{slot:hs,key:hk}})}:{has:false,name:'Passe o mouse ou foque uma peça',meta:'Clique para trocar · arraste da lista de opções · × remove',open:null};
    // skills
    const rowsDef=[['weapon',['Q','W','E','P']],['head',['hA','hP']],['armor',['aA','aP']],['shoes',['sA','sP']]];
    const keyLbl={Q:'Q',W:'W',E:'E',P:'P',hA:'D',hP:'P',aA:'R',aP:'P',sA:'F',sP:'P'};
    const skillRows=rowsDef.filter(([r])=>c.p[r]&&I[c.p[r]]).map(([r,keys])=>({label:SLOTL[r],img:ICON(this.iid(c.p[r],c),1),slots:keys.map(key=>{const kk=key.length>1?key[1]:key;const opts=this.skillOpts(r,kk,c);const o=opts[c.sk[key]]||opts[0];const on=st.skillSel.row===r&&st.skillSel.key===key;const col=KEYC[keyLbl[key]]||KEYC.P;
      return {key:keyLbl[key],ab:o?o[0].split(' ').map(w=>w[0]).join('').slice(0,2):'—',on,tip:o?`${o[0]} — ${o[1]}`:'Sem habilidade',aria:`${SLOTL[r]} ${keyLbl[key]}: ${o?o[0]:'sem habilidade'}`,c1:col[0],c2:col[1],ring:on?'0 0 0 3px #e7c26a, 0 0 10px rgba(231,194,106,.8)':'0 2px 3px rgba(0,0,0,.25)',go:()=>this.setState({skillSel:{row:r,key}})};})}));
    const ss=st.skillSel;let sk={name:'Selecione uma habilidade',where:'',desc:'',numbers:'',hasOpts:false,opts:[],unav:[]};
    if(c.p[ss.row]&&I[c.p[ss.row]]){const kk=ss.key.length>1?ss.key[1]:ss.key;const opts=this.skillOpts(ss.row,kk,c);const ci=Math.min(c.sk[ss.key]||0,Math.max(opts.length-1,0));const o=opts[ci];
      const itType=I[c.p[ss.row]].type;
      const unav=ss.row==='weapon'?[]:Object.keys(TYPE).filter(t=>t!==itType).map(t=>({name:ASK[t][ss.row][kk==='P'?'P':'A'][0][0],reason:`exige peça de ${TYPE[t]}`}));
      sk={name:o?o[0]:'Sem habilidade',where:`${SLOTL[ss.row]} · ${keyLbl[ss.key]==='P'?'Passiva':'Tecla '+keyLbl[ss.key]} · ${this.iname(c.p[ss.row],c)}`,desc:o?o[1]:'Este espaço não tem habilidade para a peça atual.',numbers:'Dano, cura, escudo, alcance, duração, energia, conjuração e recarga: indisponíveis (spells.json não conectado).',hasOpts:opts.length>0,
        opts:opts.map((x,i)=>({name:x[0],desc:x[1],cur:i===ci,tag:i===ci?'Em uso':'Usar',bd:i===ci?'#b8862b':'rgba(107,74,43,.4)',bg:i===ci?'rgba(231,194,106,.35)':'rgba(255,248,230,.5)',use:()=>this.edit(z=>{z.sk[ss.key]=i;})})),unav};}
    const fxRows=['cape','food','potion'].filter(s=>c.p[s]&&I[c.p[s]]).map(s=>{const it=I[c.p[s]];return {img:ICON(this.iid(c.p[s],c),1),name:this.iname(c.p[s],c),fx:it.fx||'Efeito não catalogado.',meta:s==='cape'?'':`· duração ${it.dur} · qtd. ${it.qty}`};});
    // metrics
    const ctxLabel=`${ACTL[b.act]||b.act}${b.mod&&b.mod!=='—'?' · '+b.mod:''} · ${f.server}`;
    const showRadar=st.radar===null?!!P.metricsPreview:st.radar;
    const vals=x=>{const xc=this.cur(x);return AXES.map((_,i)=>30+hash(i+':'+x.id+JSON.stringify(xc.p))%65);};
    const poly=v=>v.map((n,i)=>pt(i,88*n/100).map(z=>z.toFixed(1)).join(',')).join(' ');
    const bB=st.compareId&&all.find(x=>x.id===st.compareId && x.act===b.act);
    const va=vals(b),vb=bB?vals(bB):null;
    const radarLabels=AXES.map((a,i)=>{const [x,y]=pt(i,106);return {t:a[0],x:x.toFixed(0),y:(y+4).toFixed(0),anchor:Math.abs(x-130)<8?'middle':x>130?'start':'end'};});
    const radarSpokes=AXES.map((_,i)=>{const [x,y]=pt(i,88);return {x:x.toFixed(1),y:y.toFixed(1)};});
    const radarRows=AXES.map((a,i)=>({axis:a[0],a:va[i],b:vb?vb[i]:'—',def:a[1]}));
    const usageRows=[['Atividade',ACTL[b.act]||b.act],['Modalidade',b.mod||'—'],['Servidor',f.server],['Período',{'24h':'24 horas','7d':'7 dias','30d':'30 dias',custom:`${f.from||'?'} a ${f.to||'?'}`}[f.win]],['Fonte de uso','Nenhuma conectada'],['Última atualização','—'],['Amostra','Dados ainda indisponíveis'],['Definição de uso','Não definida sem fonte']].map(([k,v],i)=>({k,v,c:i>=4?'#9b3324':'#3a2414'}));
    const w=I[c.p.weapon]||{};const hasAuthor=b.act==='1v1'&&!!w.rank;
    const author={has:hasAuthor,text:hasAuthor?`M4ax · 26/05/2026 · PvP 1×1 com poder de item parecido · ${w.name}: ${w.rank}`:'',url:hasAuthor?`https://www.youtube.com/watch?v=WNk-cSYIT14&t=${w.sec}s`:'#',time:hasAuthor?`${Math.floor(w.sec/60)}:${String(w.sec%60).padStart(2,'0')}`:''};
    // status
    const status=b.src==='mine'?(isDirty?{l:'Minha build · alterações não salvas',bg:'#f3e3b5',fg:'#4a300a',bd:'#b8862b'}:{l:b.legacy?'Importada da versão anterior':'Minha build · salva',bg:'#d6ece8',fg:'#154a46',bd:'#2f7d78'}):(isDirty?{l:'Rascunho modificado',bg:'#f3e3b5',fg:'#4a300a',bd:'#b8862b'}:{l:'Catálogo · composição demonstrativa',bg:'rgba(90,60,30,.1)',fg:'#4a2e18',bd:'#8a6a4a'});
    // picker
    let pick={title:'',hint:'',items:[]};
    if(st.picking){const slot=st.picking;const keys=Object.keys(I).filter(k=>I[k].slot===slot&&I[k].fam!=='Importado');
      pick={title:`Escolher ${SLOTL[slot].toLowerCase()}`,hint:slot==='weapon'?'Armas de duas mãos liberam a mão secundária. Arraste um item até o espaço, se preferir.':'Arraste um item até o espaço ou use “Equipar”.',
        items:keys.map(k=>{const isCur=c.p[slot]===k;return {img:ICON(this.iid(k,c),c.qual),name:this.iname(k,c),meta:[I[k].fam,I[k].twoH?'Duas mãos':slot==='weapon'?'Uma mão':'',I[k].rank?`M4ax 1×1: ${I[k].rank}`:''].filter(Boolean).join(' · '),isCur,useLabel:isCur?'Equipado':'Equipar',bg:isCur?'rgba(231,194,106,.35)':'rgba(255,248,230,.5)',bd:isCur?'#b8862b':'rgba(107,74,43,.3)',
          use:()=>this.equip(slot,k),info:()=>this.setState({detail:{slot,key:k}}),drag:e=>{e.dataTransfer.setData('text/plain',k);e.dataTransfer.effectAllowed='copy';}};})};}
    // detail
    let dt={name:'',sub:'',img:'',rows:[],alts:[]};
    if(st.detail&&I[st.detail.key]){const {slot,key}=st.detail;const it=I[key];const U='#7e2418';const row=(k,v,warn)=>({k,v,c:warn?U:'#3a2414',st:warn?'italic':'normal'});
      const cons=['food','potion','mount'].includes(slot);
      const roles={weapon:'Fonte principal de dano e das habilidades Q, W e E.',head:'Habilidade D e passiva de utilidade.',armor:'Habilidade R; define a defesa principal.',shoes:'Habilidade F; mobilidade.',cape:'Efeito passivo da capa.',off:'Complementa a arma de uma mão.',food:'Bônus de longa duração.',potion:'Recurso de emergência em luta.',mount:'Deslocamento entre zonas.',bag:'Capacidade de carga.'};
      const skn=slot==='weapon'?['Q','W','E','P'].map(kk=>this.skillOpts('weapon',kk,{...c,p:{...c.p,weapon:key}}).map(o=>o[0]).join(' / ')).join(' · '):['head','armor','shoes'].includes(slot)?`${ASK[it.type][slot].A.map(o=>o[0]).join(' / ')} · passivas: ${ASK[it.type][slot].P.map(o=>o[0]).join(' / ')}`:'—';
      const rows=cons?[row('Tier / variante',`${TR[it.ftier]} · ${it.fixed}`),row('Efeitos (DEMO)',it.fx),row('Duração',it.dur),row('Recarga',it.cd),row('Quantidade planejada',String(it.qty)),row('Custo unitário','Indisponível — sem observação de preço',true),row('Custo total estimado','Indisponível',true),row('Motivo da escolha',roles[slot]),row('Fonte','Nome oficial; efeitos demonstrativos',true)]
        :[row('Categoria',`${SLOTL[slot]} · ${it.fam}`),row('Tier · encantamento · qualidade',`${TR[c.tier]} · .${c.ench} · ${QN[c.qual]}`),row('Poder de item','Indisponível — base, qualidade, encantamento e especialização exigem items.xml',true),row('Condições do cálculo','Sem regras de atividade aplicadas (ex.: limite de PI nas Brumas/Hellgates)',true),row('Atributos','Indisponíveis — fonte não conectada',true),row('Habilidades (DEMO)',skn),row('Mãos',it.twoH?'Duas mãos':slot==='weapon'?'Uma mão':'—'),row('Requisitos','Destravamento do tier na árvore de Destinos — valores exatos indisponíveis',true),row('Papel na composição',roles[slot]),row('Preço por cidade',`Sem observação de preço em ${f.server}`,true),row('Horário da observação','—',true),row('Avaliação do autor',it.rank?`M4ax (1×1, 26/05/2026): ${it.rank}`:'Sem avaliação para este item'),row('Fonte',`build-catalog.json · ID ${this.iid(key,c)}`)];
      const altKeys=Object.keys(I).filter(k=>I[k].slot===slot&&k!==key&&I[k].fam!=='Importado').slice(0,10);
      dt={name:this.iname(key,c),sub:`${SLOTL[slot]} · ${it.fam}`,img:ICON(this.iid(key,c),c.qual),rows,alts:altKeys.map(k=>({img:ICON(this.iid(k,c),1),name:this.iname(k,c),aria:`Equipar ${this.iname(k,c)}`,bd:'#1b2c37',use:()=>{this.equip(slot,k);this.setState({detail:{slot,key:k}});}}))};}
    // layout
    const nAlts=(b.alts||[]).length+1;
    const tabs=[['builds','Builds'],['equip','Equipamento'],['skills','Habilidades'],['metrics','Métricas']];
    const advN=['fam','armor'].filter(k=>f[k]!=='all').length+(+f.tier?1:0)+(+f.ench>=0?1:0)+(+f.qual?1:0);
    const vis=t=>!isMobile||st.mTab===t;
    const wk=c.p.weapon, wName=I[wk]?`${I[wk].name} ${TN[c.tier]||''}`.trim():'—';
    const saveM=list=>{try{if(!this.mentorsOkay)throw Error();localStorage.setItem(LSM,JSON.stringify(list));}catch(e){this.note('Não foi possível salvar as referências. Os dados anteriores foram preservados.');return false;}this.setState({myMentors:list});return true;};
    const mentors=[...(MENTORS[wk]||[]).map(m=>({...m,mine:false})),...st.myMentors.filter(m=>m.weapon===wk).map(m=>({name:m.name,meta:'Indicação sua · não verificada',channel:m.url,videos:[{title:m.url.replace(/^https?:\/\/(www\.)?/,'').slice(0,60),url:m.url,ctx:m.ctx||'sem contexto',date:m.added,acts:[]}],mine:true,id:m.id}))];
    const guide={weapon:wName,none:mentors.length===0,mentors:mentors.map(m=>({name:m.name,initial:m.name[0].toUpperCase(),meta:m.meta,channel:m.channel,mine:m.mine,bd:m.mine?'#2f7d78':'#b8862b',
      remove:()=>saveM(st.myMentors.filter(x=>x.id!==m.id)),
      note:m.mine?'Adicionada por você neste navegador.':`Vídeos em destaque para ${ACTL[b.act]||b.act} primeiro. Métodos do criador podem mudar com patches — confira a data.`,
      videos:[...m.videos].sort((a,z)=>(z.acts.includes(b.act)?1:0)-(a.acts.includes(b.act)?1:0)||z.date.localeCompare(a.date)).map(v=>{const fit=v.acts.includes(b.act);const old=v.date&&v.date<'2025-01-01';return {title:v.title,url:v.url,ctx:v.ctx+(fit?' · combina com esta atividade':''),date:v.date?v.date.split('-').reverse().join('/')+(old?' · antigo':''):'',dateC:old?'#9b3324':'#5a3d24',bg:fit?'rgba(231,194,106,.28)':'rgba(255,248,230,.5)',bd:fit?'#b8862b':'rgba(107,74,43,.3)'};})}))};
    const mf={...st.mf,onName:e=>this.setState({mf:{...this.state.mf,name:e.target.value}}),onUrl:e=>this.setState({mf:{...this.state.mf,url:e.target.value}}),onCtx:e=>this.setState({mf:{...this.state.mf,ctx:e.target.value}}),
      add:()=>{const {name,url,ctx}=this.state.mf;if(!name.trim()){this.note('Informe o nome do criador.');return;}if(!/^https:\/\/(www\.|m\.)?(youtube\.com|youtu\.be|twitch\.tv)\//i.test(url.trim())){this.note('Use um link https do YouTube ou Twitch.');return;}
        if(!saveM([...st.myMentors,{id:'m'+Date.now(),weapon:wk,name:name.trim().slice(0,60),url:url.trim(),ctx:ctx.trim().slice(0,60),added:new Date().toISOString().slice(0,10)}]))return;this.setState({mf:{name:'',url:'',ctx:''}});this.note(`${name.trim()} indicado para ${wName}.`);}};
    const notes=st.notesD[b.id]??(b.notes||'');
    return {
      guide,mf,guideCols:isMobile||st.w<1200?'minmax(0,1fr)':'minmax(0,1.4fr) minmax(0,1fr)',dGuide:vis('skills')?'flex':'none',
      notes,onNotes:e=>{const v=e.target.value;this.setState(s=>({notesD:{...s.notesD,[b.id]:v}}));},
      f,on,adv:st.adv,showInfo:st.showInfo,isMobile,
      pagePad:isMobile?'0':'16px',winH:isMobile?'auto':'calc(100dvh - 160px)',mainPadX:isMobile?'10px':'16px',
      gridCols:isMobile?'minmax(0,1fr)':'minmax(320px, 35fr) minmax(0, 65fr)',topCols:isMobile?'minmax(0,1fr)':'minmax(0, 1.05fr) minmax(0, 1fr)',metCols:isMobile||st.w<1200?'minmax(0,1fr)':'280px minmax(0,1fr)',
      dList:vis('builds')?'flex':'none',dRight:isMobile&&st.mTab==='builds'?'none':'flex',dEquip:vis('equip')?'flex':'none',dSkills:vis('skills')?'flex':'none',dMetrics:vis('metrics')?'flex':'none',
      mTabs:tabs.map(([k,l])=>({l,on:st.mTab===k,go:()=>this.setState({mTab:k}),bg:st.mTab===k?'linear-gradient(#e1b24a,#a8781e)':'transparent',fg:st.mTab===k?'#2a1b10':'#f1dca6',bd:st.mTab===k?'#f0cf7a':'transparent'})),
      serverLabel:f.server,toggleInfo:()=>this.setState(s=>({showInfo:!s.showInfo})),toggleAdv:()=>this.setState(s=>({adv:!s.adv})),advCount:advN?` (${advN})`:'',
      clearFilters:()=>{this.setF({...DEF});this.note('Filtros limpos. Composições e rascunhos preservados.');},
      share:()=>{const h='#sel='+encodeURIComponent(JSON.stringify({f,id:b.id}));try{history.replaceState(null,'',h);}catch(e){location.hash=h;}const url=location.href;(navigator.clipboard?navigator.clipboard.writeText(url):Promise.reject()).then(()=>this.note('Link da seleção copiado.'),()=>this.note('Link atualizado na barra de endereço.'));},
      modOpts:f.act==='all'?[]:MODS[f.act],modDisabled:f.act==='all',modOpacity:f.act==='all'?.55:1,modAllLabel:f.act==='all'?'Escolha a atividade':'Todas',
      famOpts:[...new Set(Object.values(I).filter(x=>x.slot==='weapon').map(x=>x.fam))].sort(),isCustom:f.win==='custom',
      bannerError:demo==='fonte indisponível',bannerStale:false,
      listTabs:[['catalog','Catálogo'],['mine',`Minhas (${st.saved.length})`]].map(([k,l])=>({l,on:st.listTab===k,go:()=>this.setState({listTab:k}),bg:st.listTab===k?'linear-gradient(#e1b24a,#a8781e)':'transparent',fg:st.listTab===k?'#2a1b10':'#f1dca6'})),
      listCount:loading?'…':`${rows.length} composições`,sortNote,loading,skel:[1,2,3,4,5],isEmpty:!loading&&rows.length===0,
      emptyHint:st.listTab==='mine'?'Você ainda não salvou builds. Monte uma composição e use “Salvar build”.':f.role!=='all'&&f.role!=='Dano'?`O catálogo atual não tem composições de ${f.role.toLowerCase()} — não inventamos builds para preencher.`:'Ajuste atividade, modalidade ou busca.',
      rows,rowCols:`${tileRow}px minmax(0,1fr)`,rowTile:tileRow,miniTile:mini,compareMode:st.compareMode,cancelCompare:()=>this.setState({compareMode:false}),
      cur:{title:b.title,ctx:ctxLabel,tier:String(c.tier),ench:String(c.ench),qual:String(c.qual)},status,
      tile,half,areas,gridSlots,showExtra:st.showExtra,extraLabel:st.showExtra?'▾ Ocultar montaria':'▸ Mostrar montaria',toggleExtra:()=>this.setState(s=>({showExtra:!s.showExtra})),hv,
      altLabel:`${alt+1}/${nAlts}`,altNone:nAlts<2,altOpacity:nAlts<2?.45:1,altPrev:()=>this.goAlt(b,-1,nAlts),altNext:()=>this.goAlt(b,1,nAlts),
      saveName:st.saveName,save:()=>this.save(b,c),duplicate:()=>this.save(b,c,true),startCompare:()=>{this.setState({compareMode:true,compareWarn:'',mTab:isMobile?'builds':st.mTab});this.note('Escolha a build B na lista.');},
      restore:()=>{this.setState(s=>{const d={...s.drafts},notes={...s.notesD};delete d[b.id];delete notes[b.id];return {drafts:d,notesD:notes,alts:{...s.alts,[b.id]:0}};});this.note('Composição original restaurada.');},cleanState:!isDirty&&alt===0,restoreOpacity:!isDirty&&alt===0?.45:1,
      skillRows,sk,fxRows,
      showRadar,noRadar:!showRadar,toggleRadar:()=>this.setState({radar:!showRadar}),ctxLabel,radarA:poly(va),radarB:vb?poly(vb):'',hasB:!!bB,bTitle:bB?bB.title:'',bHead:bB?'B':'B',radarLabels,radarSpokes,radarRows,
      radarAria:`Prévia demonstrativa: ${AXES.map((a,i)=>`${a[0]} ${va[i]}`).join(', ')}`,usageRows,author,compareWarn:!!st.compareWarn,compareWarnText:st.compareWarn,clearB:()=>this.setState({compareId:null}),
      hasNotice:!!st.notice,notice:st.notice,
      picking:!!st.picking,pick,closePick:()=>this.setState({picking:null}),stop:e=>e.stopPropagation(),
      detailOpen:!!st.detail,dt,closeDetail:()=>this.setState({detail:null})
    };
  }
  pickRow(x){
    const st=this.state;
    if(st.compareMode){const a=this.sel();if(x.id===a.id)return;if(x.act!==a.act){this.setState({compareWarn:`Comparação bloqueada: ${x.title} é de ${ACTL[x.act]||x.act}, contexto diferente de ${ACTL[a.act]||a.act}.`,compareMode:false});return;}this.setState({compareId:x.id,compareMode:false,compareWarn:'',radar:true});this.note(`Comparando com ${x.title}.`);return;}
    this.setState({selId:x.id,hover:null,compareId:st.compareId===x.id || this.all().find(b=>b.id===st.compareId)?.act!==x.act?null:st.compareId,compareWarn:'',saveName:x.src==='mine'?x.title:'',mTab:st.w<980&&st.mTab==='builds'?'equip':st.mTab});
  }
  goAlt(b,d,n){
    if(this.dirty(b))this.note('Rascunho descartado ao trocar de alternativa.');
    this.setState(s=>{const dr={...s.drafts},notes={...s.notesD};delete dr[b.id];delete notes[b.id];return {drafts:dr,notesD:notes,alts:{...s.alts,[b.id]:((s.alts[b.id]||0)+d+n)%n}};});
  }
  save(b,c,dup){
    if(!this.storageOkay || this.catalogUnavailable){this.note('Os dados originais foram preservados. Gravação bloqueada até recuperar o catálogo e o armazenamento.');return;}
    const own=b.src==='mine'&&!b.legacy&&!dup;
    const name=dup?`Cópia de ${b.title}`:((this.state.saveName||'').trim()||b.title);
    const rec={id:own?b.id:'u'+Date.now()+'-'+crypto.randomUUID(),title:name.slice(0,100),act:b.act,mod:b.mod,role:b.role,tier:c.tier,ench:c.ench,qual:c.qual,p:{...c.p},sk:{...c.sk},alts:[],notes:(this.state.notesD[b.id]??(b.notes||'')).slice(0,2000),origin:b.origin||b.id,savedAt:new Date().toISOString(),upd:new Date().toISOString().slice(0,10)};
    const saved=own?this.state.saved.map(s=>s.id===b.id?rec:s):[...this.state.saved,rec];
    try{if(saved.length>200)throw Error();localStorage.setItem(LS,JSON.stringify(saved));}catch(e){this.note('Não foi possível salvar neste navegador (limite de 200 builds). A composição continua aberta.');return;}
    this.setState(s=>{const d={...s.drafts};delete d[b.id];delete d[rec.id];return {saved,drafts:d,selId:rec.id,listTab:'mine',saveName:rec.title};});
    this.note(dup?`Cópia “${rec.title}” criada.`:`Build “${rec.title}” salva neste navegador.`);
  }
}

if (typeof module !== "undefined") module.exports = Arsenal;
else new Arsenal(document.getElementById("arsenalRoot")).initialize();
})();
