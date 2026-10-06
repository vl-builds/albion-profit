/* Native HTML renderer for the Arsenal handoff. All dynamic text/attributes are escaped. */
(() => {
const h = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;", "'":"&#39;"}[c]));
function renderArsenal(v, bind) {
const {adv, advCount, altLabel, altNext, altNone, altOpacity, altPrev, areas, author, bHead, bTitle, bannerError, bannerStale, cancelCompare, cleanState, clearB, clearFilters, closeDetail, closePick, compareMode, compareWarn, compareWarnText, ctxLabel, cur, dEquip, dGuide, dList, dMetrics, dRight, dSkills, detailOpen, dt, duplicate, emptyHint, extraLabel, f, famOpts, fxRows, gridCols, gridSlots, guide, guideCols, half, hasB, hasNotice, hv, isCustom, isEmpty, isMobile, listCount, listTabs, loading, mTabs, mainPadX, metCols, mf, miniTile, modAllLabel, modDisabled, modOpacity, modOpts, noRadar, notes, notice, on, onNotes, pagePad, pick, picking, radarA, radarAria, radarB, radarLabels, radarRows, radarSpokes, restore, restoreOpacity, rootRef, rowCols, rowTile, rows, save, saveName, serverLabel, share, showExtra, showInfo, showRadar, sk, skel, skillRows, sortNote, startCompare, status, stop, tile, toggleAdv, toggleExtra, toggleInfo, toggleRadar, topCols, usageRows, winH} = v;
return `
<div class="arsenal-page" style="padding:${h(pagePad)}" data-node="n1">
<div class="arsenal-window" style="height:${h(winH)}" data-node="n2">

<header class="arsenal-header" data-node="n3">
  <div aria-hidden="true" class="arsenal-emblem" data-node="n4">⚔</div>
  <div class="av5" data-node="n5">
    <div class="av6" data-node="n6">
      <h1 class="av7" data-node="n7" id="buildsHeading">Arsenal</h1>
      <button data-on-click="${bind(toggleInfo)}" aria-label="Sobre os dados do Arsenal" aria-expanded="${h(showInfo)}" class="av8" data-node="n8" type="button">i</button>
      <span class="av9" data-node="n9">Equipamentos e composições · ${h(serverLabel)}</span>
      <div class="av10" data-node="n10"></div>
      <div class="av11" data-node="n11">
        <button data-on-click="${bind(toggleAdv)}" aria-expanded="${h(adv)}" class="av12" data-node="n12" type="button">Filtros avançados${h(advCount)}</button>
        <button data-on-click="${bind(clearFilters)}" class="av13" data-node="n13" type="button">↺ Limpar</button>
        <button data-on-click="${bind(share)}" class="av14" data-node="n14" type="button">Copiar link da seleção</button>
      </div>
    </div>
    <div class="arsenal-filters" data-node="n15">
      <label class="av16" data-node="n16">Atividade
        <span class="av17" data-node="n17"><select data-value="${h(f.act)}" data-on-change="${bind(on.act)}" class="av18" data-node="n18"><option value="all" class="av19" data-node="n19">Todas</option><option value="pve" class="av20" data-node="n20">PvE</option><option value="gank" class="av21" data-node="n21">Gank</option><option value="group" class="av22" data-node="n22">Grupos</option><option value="2v2" class="av23" data-node="n23">2×2</option><option value="mists" class="av24" data-node="n24">Brumas</option><option value="1v1" class="av25" data-node="n25">1×1</option><option value="depths" class="av26" data-node="n26">Profundezas</option><option value="hellgates" class="av27" data-node="n27">Hellgates</option></select><span aria-hidden="true" class="av28" data-node="n28">▼</span></span></label>
      <label class="av29" data-node="n29">Modalidade
        <span class="av30" data-node="n30"><select data-value="${h(f.mod)}" data-on-change="${bind(on.mod)}"${modDisabled ? " disabled" : ""} class="av31" style="opacity:${h(modOpacity)}" data-node="n31"><option value="all" class="av32" data-node="n32">${h(modAllLabel)}</option>${modOpts.map((o,oIndex) => `<option value="${h(o)}" class="av33" data-node="n33-${oIndex}">${h(o)}</option>`).join("")}</select><span aria-hidden="true" class="av34" data-node="n34">▼</span></span></label>
      <label class="av35" data-node="n35">Função
        <span class="av36" data-node="n36"><select data-value="${h(f.role)}" data-on-change="${bind(on.role)}" class="av37" data-node="n37"><option value="all" class="av38" data-node="n38">Todas</option><option value="Dano" class="av39" data-node="n39">Dano</option><option value="Tanque" class="av40" data-node="n40">Tanque</option><option value="Suporte" class="av41" data-node="n41">Suporte</option><option value="Cura" class="av42" data-node="n42">Cura</option></select><span aria-hidden="true" class="av43" data-node="n43">▼</span></span></label>
      <label class="av44" data-node="n44">Servidor
        <span class="av45" data-node="n45"><select data-value="${h(f.server)}" data-on-change="${bind(on.server)}" class="av46" data-node="n46"><option value="Americas" class="av47" data-node="n47">Americas</option><option value="Europe" class="av48" data-node="n48">Europe</option><option value="Asia" class="av49" data-node="n49">Asia</option></select><span aria-hidden="true" class="av50" data-node="n50">▼</span></span></label>
      <label class="av51" data-node="n51">Ordenar por
        <span class="av52" data-node="n52"><select data-value="${h(f.sort)}" data-on-change="${bind(on.sort)}" class="av53" data-node="n53"><option value="played" class="av54" data-node="n54">Mais jogadas</option><option value="winrate" class="av55" data-node="n55">Taxa de vitória</option><option value="pop" class="av56" data-node="n56">Popularidade</option><option value="cost" class="av57" data-node="n57">Custo</option><option value="recent" class="av58" data-node="n58">Atualização mais recente</option><option value="author" class="av59" data-node="n59">Avaliação do autor (1×1)</option><option value="name" class="av60" data-node="n60">Nome</option></select><span aria-hidden="true" class="av61" data-node="n61">▼</span></span></label>
      <label class="av62" data-node="n62">Janela de tempo
        <span class="av63" data-node="n63"><select data-value="${h(f.win)}" data-on-change="${bind(on.win)}" class="av64" data-node="n64"><option value="24h" class="av65" data-node="n65">24 horas</option><option value="7d" class="av66" data-node="n66">7 dias</option><option value="30d" class="av67" data-node="n67">30 dias</option><option value="custom" class="av68" data-node="n68">Personalizado</option></select><span aria-hidden="true" class="av69" data-node="n69">▼</span></span></label>
      <label class="av70" data-node="n70">Buscar
        <input type="search" value="${h(f.q)}" data-on-input="${bind(on.q)}" placeholder="Arma, peça ou build" class="av71" data-node="n71"></label>
    </div>
    ${isCustom ? `
      <div class="av72" data-node="n72">
        <label class="av73" data-node="n73">De <input type="date" value="${h(f.from)}" data-on-input="${bind(on.from)}" class="av74" data-node="n74"></label>
        <label class="av75" data-node="n75">Até <input type="date" value="${h(f.to)}" data-on-input="${bind(on.to)}" class="av76" data-node="n76"></label>
      </div>
    ` : ""}
  </div>
</header>
<div class="arsenal-backup" aria-label="Cópias das minhas builds">
  <button id="buildExport" type="button" data-node="export" data-on-click="${bind(v.exportBuilds)}">Exportar builds</button>
  <label>Importar cópia <input id="buildImport" type="file" accept="application/json,.json" data-node="import" data-on-change="${bind(v.importBuilds)}"></label>
  <span>Suas builds ficam salvas neste navegador.</span>
</div>

${showInfo ? `
  <div class="av77" data-node="n77">
    <div class="av78" data-node="n78"><strong class="av79" data-node="n79">Verificado</strong><br class="av80" data-node="n80">Nomes oficiais PT-BR de <code class="av81" data-node="n81">build-catalog.json</code>. Ícones: render.albiononline.com.</div>
    <div class="av82" data-node="n82"><strong class="av83" data-node="n83">Avaliação do autor</strong><br class="av84" data-node="n84">M4ax · 26/05/2026 · PvP 1×1, seleção de 10 armas. Opinião, não estatística.</div>
    <div class="av85" data-node="n85"><strong class="av86" data-node="n86">Demonstrativo</strong><br class="av87" data-node="n87">Habilidades, efeitos e radar marcados com DEMO. Não entram em rankings.</div>
    <div class="av88" data-node="n88"><strong class="av89" data-node="n89">Sem fonte ainda</strong><br class="av90" data-node="n90">Uso, vitória, preços, poder de item e atributos numéricos.</div>
  </div>
` : ""}

${adv ? `
  <div class="av91" data-node="n91">
    <label class="av92" data-node="n92">Família de arma
      <span class="av93" data-node="n93"><select data-value="${h(f.fam)}" data-on-change="${bind(on.fam)}" class="av94" data-node="n94"><option value="all" class="av95" data-node="n95">Todas</option>${famOpts.map((o,oIndex) => `<option value="${h(o)}" class="av96" data-node="n96-${oIndex}">${h(o)}</option>`).join("")}</select><span aria-hidden="true" class="av97" data-node="n97">▼</span></span></label>
    <label class="av98" data-node="n98">Tipo de armadura
      <span class="av99" data-node="n99"><select data-value="${h(f.armor)}" data-on-change="${bind(on.armor)}" class="av100" data-node="n100"><option value="all" class="av101" data-node="n101">Todos</option><option value="plate" class="av102" data-node="n102">Placa</option><option value="leather" class="av103" data-node="n103">Couro</option><option value="cloth" class="av104" data-node="n104">Tecido</option></select><span aria-hidden="true" class="av105" data-node="n105">▼</span></span></label>
    <label class="av106" data-node="n106">Tier mínimo
      <span class="av107" data-node="n107"><select data-value="${h(f.tier)}" data-on-change="${bind(on.tier)}" class="av108" data-node="n108"><option value="0" class="av109" data-node="n109">Qualquer</option><option value="4" class="av110" data-node="n110">IV</option><option value="5" class="av111" data-node="n111">V</option><option value="6" class="av112" data-node="n112">VI</option><option value="7" class="av113" data-node="n113">VII</option><option value="8" class="av114" data-node="n114">VIII</option></select><span aria-hidden="true" class="av115" data-node="n115">▼</span></span></label>
    <label class="av116" data-node="n116">Encantamento
      <span class="av117" data-node="n117"><select data-value="${h(f.ench)}" data-on-change="${bind(on.ench)}" class="av118" data-node="n118"><option value="-1" class="av119" data-node="n119">Qualquer</option><option value="0" class="av120" data-node="n120">.0</option><option value="1" class="av121" data-node="n121">.1</option><option value="2" class="av122" data-node="n122">.2</option><option value="3" class="av123" data-node="n123">.3</option><option value="4" class="av124" data-node="n124">.4</option></select><span aria-hidden="true" class="av125" data-node="n125">▼</span></span></label>
    <label class="av126" data-node="n126">Qualidade mínima
      <span class="av127" data-node="n127"><select data-value="${h(f.qual)}" data-on-change="${bind(on.qual)}" class="av128" data-node="n128"><option value="0" class="av129" data-node="n129">Qualquer</option><option value="1" class="av130" data-node="n130">Normal</option><option value="2" class="av131" data-node="n131">Boa</option><option value="3" class="av132" data-node="n132">Excepcional</option><option value="4" class="av133" data-node="n133">Excelente</option><option value="5" class="av134" data-node="n134">Obra-prima</option></select><span aria-hidden="true" class="av135" data-node="n135">▼</span></span></label>
    <label class="av136" data-node="n136">Orçamento máximo
      <input${true ? " disabled" : ""} placeholder="Sem fonte de preços" class="av137" data-node="n137"></label>
  </div>
` : ""}

${bannerError ? `
  <div role="alert" class="av138" data-node="n138">⚠ Fonte de dados indisponível. A composição em edição foi preservada; nenhum dado foi apagado.</div>
` : ""}
${bannerStale ? `
  <div role="status" class="av139" data-node="n139">⏳ Dados antigos: última atualização da fonte há 12 dias. Use com cautela.</div>
` : ""}

${isMobile ? `
  <nav role="tablist" aria-label="Seções do Arsenal" class="arsenal-mobile-tabs" data-node="n140">
    ${mTabs.map((t,tIndex) => `
      <button role="tab" aria-selected="${h(t.on)}" data-on-click="${bind(t.go)}" class="av141" style="border:1.5px solid ${h(t.bd)};background:${h(t.bg)};color:${h(t.fg)}" data-node="n141-${tIndex}" type="button">${h(t.l)}</button>
    `).join("")}
  </nav>
` : ""}

<div class="arsenal-body" style="grid-template-columns:${h(gridCols)};padding:12px ${h(mainPadX)} 14px" data-node="n142">

  <section aria-label="Lista de builds" class="arsenal-list-panel" style="display:${h(dList)}" data-node="n143">
    <div class="av144" data-node="n144">
      <h2 class="av145" data-node="n145">Builds</h2>
      <div role="tablist" aria-label="Origem das builds" class="av146" data-node="n146">
        ${listTabs.map((t,tIndex) => `
          <button role="tab" aria-selected="${h(t.on)}" data-on-click="${bind(t.go)}" class="av147" style="background:${h(t.bg)};color:${h(t.fg)}" data-node="n147-${tIndex}" type="button">${h(t.l)}</button>
        `).join("")}
      </div>
      <div class="av148" data-node="n148"></div>
      <span class="av149" data-node="n149">${h(listCount)}</span>
    </div>
    <div class="av150" data-node="n150">${h(sortNote)}</div>
    ${compareMode ? `
      <div role="status" class="av151" data-node="n151">Comparar: escolha outra build da mesma atividade. <button data-on-click="${bind(cancelCompare)}" class="av152" data-node="n152" type="button">Cancelar</button></div>
    ` : ""}
    <div class="arsenal-build-list" data-node="n153">
      ${loading ? `
        ${skel.map((s,sIndex) => `
          <div aria-hidden="true" class="av154" data-node="n154-${sIndex}">
            <div class="av155" data-node="n155-${sIndex}"></div>
            <div class="av156" data-node="n156-${sIndex}"><div class="av157" data-node="n157-${sIndex}"></div><div class="av158" data-node="n158-${sIndex}"></div></div>
          </div>
        `).join("")}
        <p role="status" class="av159" data-node="n159">Carregando builds…</p>
      ` : ""}
      ${isEmpty ? `
        <div class="av160" data-node="n160">
          <div class="av161" data-node="n161">Nenhuma build neste filtro</div>
          <p class="av162" data-node="n162">${h(emptyHint)}</p>
          <button data-on-click="${bind(clearFilters)}" class="av163" data-node="n163" type="button">Limpar filtros</button>
        </div>
      ` : ""}
      ${rows.map((r,rIndex) => `
        <div role="button" tabindex="0" aria-pressed="${h(r.sel)}" aria-label="${h(r.aria)}" data-on-click="${bind(r.go)}" data-on-keydown="${bind(r.key)}" class="av164" style="grid-template-columns:${h(rowCols)};background:${h(r.bg)};border-left:5px solid ${h(r.marker)}" data-node="n164-${rIndex}">
          <div class="av165" style="width:${h(rowTile)}px;height:${h(rowTile)}px" data-node="n165-${rIndex}">
            <img src="${h(r.wImg)}" alt="" loading="lazy" class="av166" data-node="n166-${rIndex}">
            <span class="av167" data-node="n167-${rIndex}">${h(r.tier)}</span>
            ${r.hasOff ? `
              <span class="av168" data-node="n168-${rIndex}"><img src="${h(r.offImg)}" alt="" loading="lazy" class="av169" data-node="n169-${rIndex}"></span>
            ` : ""}
          </div>
          <div class="av170" data-node="n170-${rIndex}">
            <div class="av171" data-node="n171-${rIndex}">
              <span class="av172" style="background:${h(r.ribbon)};color:${h(r.ribbonFg)}" data-node="n172-${rIndex}">${h(r.title)}</span>
              ${r.dirty ? `<span title="Rascunho não salvo" class="av173" data-node="n173-${rIndex}">● rascunho</span>` : ""}
              ${r.isB ? `<span class="av174" data-node="n174-${rIndex}">B</span>` : ""}
            </div>
            <div class="av175" data-node="n175-${rIndex}">
              ${r.minis.map((m,mIndex) => `
                <span title="${h(m.name)}" class="av176" style="width:${h(miniTile)}px;height:${h(miniTile)}px" data-node="n176-${rIndex}-${mIndex}"><img src="${h(m.img)}" alt="${h(m.name)}" loading="lazy" class="av177" data-node="n177-${rIndex}-${mIndex}"></span>
              `).join("")}
            </div>
            <div class="av178" data-node="n178-${rIndex}">
              <span class="av179" data-node="n179-${rIndex}">${h(r.act)}</span>
              <span class="av180" data-node="n180-${rIndex}">${h(r.mod)}</span>
              <span class="av181" data-node="n181-${rIndex}">${h(r.role)}</span>
              ${r.hasRank ? `<span title="Avaliação do autor, não estatística" class="av182" data-node="n182-${rIndex}">M4ax: ${h(r.rank)}</span>` : ""}
              <span class="av183" style="background:${h(r.srcBg)};color:${h(r.srcFg)}" data-node="n183-${rIndex}">${h(r.src)}</span>
            </div>
          </div>
        </div>
      `).join("")}
    </div>
  </section>

  <section aria-label="Detalhes da build" class="arsenal-detail-panel" style="display:${h(dRight)}" data-node="n184">
    <div class="av185" data-node="n185">
      <h2 class="av186" data-node="n186">${h(cur.title)}</h2>
      <span class="av187" style="background:${h(status.bg)};color:${h(status.fg)};border:1.5px solid ${h(status.bd)}" data-node="n187">${h(status.l)}</span>
      <span class="av188" data-node="n188">${h(cur.ctx)}</span>
    </div>

    <div class="arsenal-top-grid" style="grid-template-columns:${h(topCols)}" data-node="n189">
      <div class="arsenal-equipment" style="display:${h(dEquip)}" data-node="n190">
        <div class="av191" data-node="n191">
          <h3 class="av192" data-node="n192">Equipamento</h3>
          <div class="av193" data-node="n193"></div>
          <label class="av194" data-node="n194">Tier <select data-value="${h(cur.tier)}" data-on-change="${bind(on.cTier)}" aria-label="Tier da build" class="av195" data-node="n195"><option value="4" class="av196" data-node="n196">IV</option><option value="5" class="av197" data-node="n197">V</option><option value="6" class="av198" data-node="n198">VI</option><option value="7" class="av199" data-node="n199">VII</option><option value="8" class="av200" data-node="n200">VIII</option></select></label>
          <label class="av201" data-node="n201">Enc. <select data-value="${h(cur.ench)}" data-on-change="${bind(on.cEnch)}" aria-label="Encantamento" class="av202" data-node="n202"><option value="0" class="av203" data-node="n203">.0</option><option value="1" class="av204" data-node="n204">.1</option><option value="2" class="av205" data-node="n205">.2</option><option value="3" class="av206" data-node="n206">.3</option><option value="4" class="av207" data-node="n207">.4</option></select></label>
          <label class="av208" data-node="n208">Qual. <select data-value="${h(cur.qual)}" data-on-change="${bind(on.cQual)}" aria-label="Qualidade" class="av209" data-node="n209"><option value="1" class="av210" data-node="n210">Normal</option><option value="2" class="av211" data-node="n211">Boa</option><option value="3" class="av212" data-node="n212">Excepcional</option><option value="4" class="av213" data-node="n213">Excelente</option><option value="5" class="av214" data-node="n214">Obra-prima</option></select></label>
        </div>

        <div class="av215" style="grid-template-columns:repeat(6, ${h(half)}px);grid-template-areas:${h(areas)}" data-node="n215">
          <div class="av216" data-node="n216"></div>
          ${gridSlots.map((sl,slIndex) => `
            <div class="av217" style="grid-area:${h(sl.area)}" data-node="n217-${slIndex}">
              <button data-on-click="${bind(sl.pick)}" data-on-pointerenter="${bind(sl.hover)}" data-on-focus="${bind(sl.hover)}" data-on-dragover="${bind(sl.dragOver)}" data-on-drop="${bind(sl.drop)}" aria-label="${h(sl.aria)}" class="arsenal-slot-button" style="width:${h(tile)}px;height:${h(tile)}px;background:${h(sl.bg)};border:2px solid ${h(sl.border)};box-shadow:${h(sl.shadow)}" data-node="n218-${slIndex}" type="button">
                ${sl.has ? `
                  <img src="${h(sl.img)}" alt="" data-iid="${h(sl.iid)}" class="av219" style="display:${h(sl.imgD)}" data-node="n219-${slIndex}">
                  ${sl.failed ? `<span class="av220" data-node="n220-${slIndex}">Imagem indisponível<br class="av221" data-node="n221-${slIndex}">${h(sl.short)}</span>` : ""}
                  <span class="av222" data-node="n222-${slIndex}">${h(sl.tier)}</span>
                  ${sl.hasEnch ? `<span class="av223" data-node="n223-${slIndex}">.${h(sl.ench)}</span>` : ""}
                  ${sl.changed ? `<span class="av224" data-node="n224-${slIndex}">alterado</span>` : ""}
                ` : ""}
                ${sl.empty ? `
                  <img src="${h(sl.ghost)}" alt="" class="av225" data-node="n225-${slIndex}">
                  <span class="av226" style="color:${h(sl.emptyFg)}" data-node="n226-${slIndex}">${h(sl.emptyLabel)}</span>
                ` : ""}
              </button>
              ${sl.canRemove ? `
                <button data-on-click="${bind(sl.remove)}" aria-label="${h(sl.removeAria)}" title="Remover peça" class="av227" data-node="n227-${slIndex}" type="button">×</button>
              ` : ""}
            </div>
          `).join("")}
        </div>

        <button data-on-click="${bind(toggleExtra)}" aria-expanded="${h(showExtra)}" class="av228" data-node="n228" type="button">${h(extraLabel)}</button>

        <div aria-live="polite" class="arsenal-hover-summary" data-node="n229">
          <div class="av230" data-node="n230">
            <div class="av231" data-node="n231">${h(hv.name)}</div>
            <div class="av232" data-node="n232">${h(hv.meta)}</div>
          </div>
          <button data-on-click="${bind(v.openHovered)}" class="av233" data-node="n233" type="button"${hv.has ? '' : ' hidden'}>Ver detalhes</button>
        </div>

        <div class="av234" data-node="n234">
          <div class="av235" data-node="n235"></div>
          <button data-on-click="${bind(altPrev)}"${altNone ? " disabled" : ""} aria-label="Alternativa anterior" class="av236" style="opacity:${h(altOpacity)}" data-node="n236" type="button">‹</button>
          <div class="av237" data-node="n237"><div class="av238" data-node="n238">${h(altLabel)}</div><div class="av239" data-node="n239">Alternativas</div></div>
          <button data-on-click="${bind(altNext)}"${altNone ? " disabled" : ""} aria-label="Próxima alternativa" class="av240" style="opacity:${h(altOpacity)}" data-node="n240" type="button">›</button>
          <div class="av241" data-node="n241"></div>
        </div>

        <div class="av242" data-node="n242">
          <input value="${h(saveName)}" data-on-input="${bind(on.saveName)}" aria-label="Nome da build" placeholder="Nome da build" maxlength="100" class="av243" data-node="n243">
          <button data-on-click="${bind(save)}" class="av244" data-node="n244" type="button">Salvar build</button>
          <button data-on-click="${bind(duplicate)}" class="av245" data-node="n245" type="button">Duplicar</button>
          <button data-on-click="${bind(startCompare)}" aria-pressed="${h(compareMode)}" class="av246" data-node="n246" type="button">Comparar</button>
          <button data-on-click="${bind(restore)}"${cleanState ? " disabled" : ""} class="av247" style="opacity:${h(restoreOpacity)}" data-node="n247" type="button">Restaurar original</button>
        </div>
      </div>

      <div class="arsenal-skills" style="display:${h(dSkills)}" data-node="n248">
        <div class="av249" data-node="n249">
          <h3 class="av250" data-node="n250">Habilidades</h3>
          <span title="Nomes e descrições demonstrativos. Valide com spells.json antes de publicar." class="av251" data-node="n251">DEMO</span>
        </div>
        <div class="arsenal-skill-rows" data-node="n252">
          ${skillRows.map((row,rowIndex) => `
            <div class="av253" data-node="n253-${rowIndex}">
              <span title="${h(row.label)}" class="av254" data-node="n254-${rowIndex}"><img src="${h(row.img)}" alt="${h(row.label)}" class="av255" data-node="n255-${rowIndex}"></span>
              <span aria-hidden="true" class="av256" data-node="n256-${rowIndex}">›</span>
              ${row.slots.map((k,kIndex) => `
                <button data-on-click="${bind(k.go)}" aria-label="${h(k.aria)}" aria-pressed="${h(k.on)}" title="${h(k.tip)}" class="av257" style="box-shadow:${h(k.ring)}" data-node="n257-${rowIndex}-${kIndex}" type="button">
                  <span class="av258" style="background:radial-gradient(circle at 35% 30%, ${h(k.c1)}, ${h(k.c2)})" data-node="n258-${rowIndex}-${kIndex}">${h(k.ab)}</span>
                  <span class="av259" data-node="n259-${rowIndex}-${kIndex}">${h(k.key)}</span>
                </button>
              `).join("")}
            </div>
          `).join("")}
        </div>

        <div aria-live="polite" class="av260" data-node="n260">
          <div class="av261" data-node="n261">
            <strong class="av262" data-node="n262">${h(sk.name)}</strong>
            <span class="av263" data-node="n263">${h(sk.where)}</span>
          </div>
          <div class="av264" data-node="n264">${h(sk.desc)}</div>
          <div class="av265" data-node="n265">${h(sk.numbers)}</div>
          ${sk.hasOpts ? `
            <div class="av266" data-node="n266">Trocar por</div>
            <div class="av267" data-node="n267">
              ${sk.opts.map((o,oIndex) => `
                <button data-on-click="${bind(o.use)}" aria-pressed="${h(o.cur)}" class="av268" style="border:1.5px solid ${h(o.bd)};background:${h(o.bg)}" data-node="n268-${oIndex}" type="button"><span class="av269" data-node="n269-${oIndex}"><strong class="av270" data-node="n270-${oIndex}">${h(o.name)}</strong> — ${h(o.desc)}</span><span class="av271" data-node="n271-${oIndex}">${h(o.tag)}</span></button>
              `).join("")}
              ${sk.unav.map((u,uIndex) => `
                <div class="av272" data-node="n272-${uIndex}"><span class="av273" data-node="n273-${uIndex}"><strong class="av274" data-node="n274-${uIndex}">${h(u.name)}</strong></span><span class="av275" data-node="n275-${uIndex}">Indisponível: ${h(u.reason)}</span></div>
              `).join("")}
            </div>
          ` : ""}
        </div>

        <div class="av276" data-node="n276">
          <div class="av277" data-node="n277">Capa e consumíveis <span class="av278" data-node="n278">DEMO</span></div>
          ${fxRows.map((x,xIndex) => `
            <div class="av279" data-node="n279-${xIndex}">
              <img src="${h(x.img)}" alt="" class="av280" data-node="n280-${xIndex}">
              <div class="av281" data-node="n281-${xIndex}"><strong class="av282" data-node="n282-${xIndex}">${h(x.name)}</strong> · ${h(x.fx)} <span class="av283" data-node="n283-${xIndex}">${h(x.meta)}</span></div>
            </div>
          `).join("")}
        </div>
      </div>
    </div>

    <div class="av284" style="display:${h(dGuide)}" data-node="n284">
      <div class="av285" data-node="n285">
        <h3 class="av286" data-node="n286">Como jogar</h3>
        <span class="av287" data-node="n287">${h(guide.weapon)}</span>
        <div class="av288" data-node="n288"></div>
        <span title="Conteúdo de criadores. Não é estatística." class="av289" data-node="n289">REFERÊNCIA DE CRIADOR</span>
      </div>
      <div class="av290" style="grid-template-columns:${h(guideCols)}" data-node="n290">
        <div class="av291" data-node="n291">
          ${guide.mentors.map((m,mIndex) => `
            <div class="av292" style="border:1.5px solid ${h(m.bd)}" data-node="n292-${mIndex}">
              <div class="av293" data-node="n293-${mIndex}">
                <span aria-hidden="true" class="av294" data-node="n294-${mIndex}">${h(m.initial)}</span>
                <div class="av295" data-node="n295-${mIndex}">
                  <div class="av296" data-node="n296-${mIndex}">${h(m.name)}</div>
                  <div class="av297" data-node="n297-${mIndex}">${h(m.meta)}</div>
                </div>
                <a href="${h(m.channel)}" target="_blank" rel="noopener noreferrer" class="av298" data-node="n298-${mIndex}">Canal ↗</a>
                ${m.mine ? `<button data-on-click="${bind(m.remove)}" aria-label="Remover referência" class="av299" data-node="n299-${mIndex}" type="button">×</button>` : ""}
              </div>
              <div class="av300" data-node="n300-${mIndex}">
                ${m.videos.map((v,vIndex) => `
                  <a href="${h(v.url)}" target="_blank" rel="noopener noreferrer" class="av301" style="background:${h(v.bg)};border:1px solid ${h(v.bd)}" data-node="n301-${mIndex}-${vIndex}">
                    <span aria-hidden="true" class="av302" data-node="n302-${mIndex}-${vIndex}">▶</span>
                    <span class="av303" data-node="n303-${mIndex}-${vIndex}"><strong class="av304" data-node="n304-${mIndex}-${vIndex}">${h(v.title)}</strong><span class="av305" data-node="n305-${mIndex}-${vIndex}"> · ${h(v.ctx)}</span></span>
                    <span class="av306" style="color:${h(v.dateC)}" data-node="n306-${mIndex}-${vIndex}">${h(v.date)}</span>
                  </a>
                `).join("")}
              </div>
              <div class="av307" data-node="n307-${mIndex}">${h(m.note)}</div>
            </div>
          `).join("")}
          ${guide.none ? `
            <div class="av308" data-node="n308">
              <strong class="av309" data-node="n309">Nenhuma referência cadastrada</strong><br class="av310" data-node="n310">Ainda não há um criador verificado para ${h(guide.weapon)}. Indique um canal abaixo — ele fica marcado como indicação sua.
            </div>
          ` : ""}
          <details class="av311" data-node="n311">
            <summary class="av312" data-node="n312">＋ Indicar criador para ${h(guide.weapon)}</summary>
            <div class="av313" data-node="n313">
              <input value="${h(mf.name)}" data-on-input="${bind(mf.onName)}" placeholder="Nome do criador" aria-label="Nome do criador" class="av314" data-node="n314">
              <input value="${h(mf.url)}" data-on-input="${bind(mf.onUrl)}" placeholder="Link do vídeo ou canal" aria-label="Link do vídeo ou canal" class="av315" data-node="n315">
              <input value="${h(mf.ctx)}" data-on-input="${bind(mf.onCtx)}" placeholder="Contexto (ex.: PvP solo)" aria-label="Contexto do vídeo" class="av316" data-node="n316">
              <button data-on-click="${bind(mf.add)}" class="av317" data-node="n317" type="button">Adicionar</button>
            </div>
            <div class="av318" data-node="n318">Aceita links do YouTube ou Twitch. Fica salvo neste navegador.</div>
          </details>
        </div>
        <div class="av319" data-node="n319">
          <label for="buildNotes" class="av320" data-node="n320">Seu plano de jogo</label>
          <textarea id="buildNotes" data-on-input="${bind(onNotes)}" rows="7" maxlength="2000" placeholder="Combos que aprendeu, quando usar cada habilidade, matchups e o que testar" class="av321" data-node="n321">${h(notes)}</textarea>
          <div class="av322" data-node="n322">Salvo junto com a build ao clicar em “Salvar build”.</div>
        </div>
      </div>
    </div>

    <div class="av323" style="display:${h(dMetrics)}" data-node="n323">
      <div class="av324" data-node="n324">
        <h3 class="av325" data-node="n325">Métricas</h3>
        <div class="av326" data-node="n326"></div>
        <label class="av327" data-node="n327"><input type="checkbox"${showRadar ? " checked" : ""} data-on-input="${bind(toggleRadar)}" class="av328" data-node="n328"> Mostrar prévia demonstrativa</label>
      </div>
      <div class="av329" style="grid-template-columns:${h(metCols)}" data-node="n329">
        <div class="av330" data-node="n330">
          ${showRadar ? `
            <svg viewBox="0 0 260 250" role="img" aria-label="${h(radarAria)}" class="av331" data-node="n331">
              <circle cx="130" cy="125" r="88" fill="none" stroke="#9a6b45" stroke-width="1.2" class="av332" data-node="n332"></circle>
              <circle cx="130" cy="125" r="62" fill="none" stroke="#9a6b45" stroke-width="1" class="av333" data-node="n333"></circle>
              <circle cx="130" cy="125" r="36" fill="none" stroke="#9a6b45" stroke-width="1" class="av334" data-node="n334"></circle>
              ${radarSpokes.map((s,sIndex) => `<line x1="130" y1="125" x2="${h(s.x)}" y2="${h(s.y)}" stroke="#9a6b45" stroke-width="1" class="av335" data-node="n335-${sIndex}"></line>`).join("")}
              <polygon points="${h(radarA)}" fill="rgba(79,180,160,.62)" stroke="#2f7d78" stroke-width="2" class="av336" data-node="n336"></polygon>
              ${hasB ? `<polygon points="${h(radarB)}" fill="rgba(155,51,36,.28)" stroke="#9b3324" stroke-width="2" stroke-dasharray="5 3" class="av337" data-node="n337"></polygon>` : ""}
              ${radarLabels.map((l,lIndex) => `<text x="${h(l.x)}" y="${h(l.y)}" text-anchor="${h(l.anchor)}" font-family="Alegreya Sans, sans-serif" font-size="12" font-weight="800" fill="#3a2414" class="av338" data-node="n338-${lIndex}">${h(l.t)}</text>`).join("")}
              <text x="130" y="246" text-anchor="middle" font-family="Alegreya Sans, sans-serif" font-size="11" font-weight="800" fill="#9b3324" class="av339" data-node="n339">DEMONSTRATIVO · não entra em rankings</text>
            </svg>
          ` : ""}
          ${noRadar ? `
            <div class="av340" data-node="n340">
              <div class="av341" data-node="n341">Dados ainda indisponíveis</div>
              <p class="av342" data-node="n342">Nenhuma fonte de uso conectada para ${h(ctxLabel)}. O gráfico só aparece com métricas reais — ou como prévia marcada.</p>
            </div>
          ` : ""}
        </div>
        <div class="av343" data-node="n343">
          <p class="av344" data-node="n344">Compare a build com outras da mesma atividade. Popularidade não é força: cada eixo precisa de uma definição verificável e de uma amostra declarada.</p>
          ${showRadar ? `
            <div class="av345" data-node="n345">
              <span class="av346" data-node="n346"><span class="av347" data-node="n347"></span>A · ${h(cur.title)}</span>
              ${hasB ? `<span class="av348" data-node="n348"><span class="av349" data-node="n349"></span>B · ${h(bTitle)}</span>` : ""}
            </div>
            <table class="av350" data-node="n350">
              <thead class="av351" data-node="n351"><tr class="av352" data-node="n352"><th class="av353" data-node="n353">Eixo</th><th class="av354" data-node="n354">A</th><th class="av355" data-node="n355">${h(bHead)}</th><th class="av356" data-node="n356">Definição</th></tr></thead>
              <tbody class="av357" data-node="n357">
                ${radarRows.map((x,xIndex) => `
                  <tr class="av358" data-node="n358-${xIndex}"><td class="av359" data-node="n359-${xIndex}">${h(x.axis)}</td><td class="av360" data-node="n360-${xIndex}">${h(x.a)}</td><td class="av361" data-node="n361-${xIndex}">${h(x.b)}</td><td class="av362" data-node="n362-${xIndex}">${h(x.def)}</td></tr>
                `).join("")}
              </tbody>
            </table>
          ` : ""}
          <div class="av363" data-node="n363">
            ${usageRows.map((u,uIndex) => `
              <div class="av364" data-node="n364-${uIndex}"><span class="av365" data-node="n365-${uIndex}">${h(u.k)}:</span> <strong class="av366" style="color:${h(u.c)}" data-node="n366-${uIndex}">${h(u.v)}</strong></div>
            `).join("")}
          </div>
          ${author.has ? `
            <div class="av367" data-node="n367">
              <strong class="av368" data-node="n368">Avaliação do autor</strong> · ${h(author.text)} · <a href="${h(author.url)}" target="_blank" rel="noopener noreferrer" class="av369" data-node="n369">Ver trecho (${h(author.time)})</a>
            </div>
          ` : ""}
          ${compareWarn ? `
            <div role="alert" class="av370" data-node="n370">${h(compareWarnText)}</div>
          ` : ""}
          ${hasB ? `
            <button data-on-click="${bind(clearB)}" class="av371" data-node="n371" type="button">Remover comparação</button>
          ` : ""}
        </div>
      </div>
    </div>
  </section>
</div>

${hasNotice ? `
  <div role="status" class="arsenal-toast" data-node="n372">${h(notice)}</div>
` : ""}

${picking ? `
  <div data-on-click="${bind(closePick)}" class="arsenal-picker-backdrop" data-node="n373">
    <div role="dialog" aria-modal="true" aria-label="${h(pick.title)}" data-on-click="${bind(stop)}" class="arsenal-picker" data-node="n374">
      <div class="av375" data-node="n375">
        <h3 class="av376" data-node="n376">${h(pick.title)}</h3>
        <button data-on-click="${bind(closePick)}" aria-label="Fechar" class="av377" data-node="n377" type="button">×</button>
      </div>
      <p class="av378" data-node="n378">${h(pick.hint)}</p>
      <div class="arsenal-picker-list" data-node="n379">
        ${pick.items.map((p,pIndex) => `
          <div draggable="true" data-on-dragstart="${bind(p.drag)}" class="arsenal-picker-row" style="background:${h(p.bg)};border:1.5px solid ${h(p.bd)}" data-node="n380-${pIndex}">
            <span class="av381" data-node="n381-${pIndex}"><img src="${h(p.img)}" alt="" loading="lazy" class="av382" data-node="n382-${pIndex}"></span>
            <div class="av383" data-node="n383-${pIndex}"><div class="av384" data-node="n384-${pIndex}">${h(p.name)}</div><div class="av385" data-node="n385-${pIndex}">${h(p.meta)}</div></div>
            <div class="av386" data-node="n386-${pIndex}">
              <button data-on-click="${bind(p.info)}" class="av387" data-node="n387-${pIndex}" type="button">Detalhes</button>
              <button data-on-click="${bind(p.use)}"${p.isCur ? " disabled" : ""} class="av388" data-node="n388-${pIndex}" type="button">${h(p.useLabel)}</button>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  </div>
` : ""}

${detailOpen ? `
  <div data-on-click="${bind(closeDetail)}" class="arsenal-detail-backdrop" data-node="n389">
    <aside role="dialog" aria-modal="true" aria-label="${h(dt.name)}" data-on-click="${bind(stop)}" class="arsenal-item-detail" data-node="n390">
      <div class="av391" data-node="n391">
        <span class="av392" data-node="n392"><img src="${h(dt.img)}" alt="" class="av393" data-node="n393"></span>
        <div class="av394" data-node="n394">
          <h3 class="av395" data-node="n395">${h(dt.name)}</h3>
          <div class="av396" data-node="n396">${h(dt.sub)}</div>
        </div>
        <button data-on-click="${bind(closeDetail)}" aria-label="Fechar detalhes" class="av397" data-node="n397" type="button">×</button>
      </div>
      <dl class="av398" data-node="n398">
        ${dt.rows.map((d,dIndex) => `
          <dt class="av399" data-node="n399-${dIndex}">${h(d.k)}</dt>
          <dd class="av400" style="color:${h(d.c)};font-style:${h(d.st)}" data-node="n400-${dIndex}">${h(d.v)}</dd>
        `).join("")}
      </dl>
      <div class="av401" data-node="n401">Alternativas para o mesmo espaço</div>
      <div class="av402" data-node="n402">
        ${dt.alts.map((a,aIndex) => `
          <button data-on-click="${bind(a.use)}" title="${h(a.name)}" aria-label="${h(a.aria)}" class="av403" style="border:2px solid ${h(a.bd)}" data-node="n403-${aIndex}" type="button"><img src="${h(a.img)}" alt="" loading="lazy" class="av404" data-node="n404-${aIndex}"></button>
        `).join("")}
      </div>
    </aside>
  </div>
` : ""}

</div>
</div>
`;
}
if (typeof module !== "undefined") module.exports = renderArsenal;
else globalThis.renderArsenal = renderArsenal;
})();
