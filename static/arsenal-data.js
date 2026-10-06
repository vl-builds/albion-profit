/* Arsenal handoff: item references and explicitly illustrative compositions/skills. */
(() => {
const LS='arsenal.v2.builds', LSF='arsenal.v2.filters', LEGACY='albion-personal-builds-v1';
const DEF={act:'all',mod:'all',role:'all',server:'Americas',sort:'played',win:'7d',from:'',to:'',q:'',fam:'all',armor:'all',tier:'0',ench:'-1',qual:'0'};
const ACTL={pve:'PvE',gank:'Gank',group:'Grupos','2v2':'2×2',mists:'Brumas','1v1':'1×1',depths:'Profundezas',hellgates:'Hellgates'};
const MODS={pve:['Solo','Grupo'],gank:['Solo','Grupo pequeno'],group:['5 jogadores','10 jogadores','20+ jogadores'],'2v2':['Letal','Não letal'],mists:['Solo','Dupla'],'1v1':['Mundo aberto','Masmorra corrompida'],depths:['Dupla','Trio'],hellgates:['2×2','5×5','10×10']};
const TR={3:'III',4:'IV',5:'V',6:'VI',7:'VII',8:'VIII'};
const TN={4:'do Adepto',5:'do Perito',6:'do Mestre',7:'do Grão-mestre',8:'do Ancião'};
const QN=['','Normal','Boa','Excepcional','Excelente','Obra-prima'];
const TYPE={plate:'Placa',leather:'Couro',cloth:'Tecido'};
const SLOTL={weapon:'Arma',head:'Cabeça',armor:'Armadura',shoes:'Botas',cape:'Capa',off:'Mão secundária',food:'Comida',potion:'Poção',mount:'Montaria',bag:'Bolsa'};
const GHOST={weapon:'T4_MAIN_SWORD',head:'T4_HEAD_PLATE_SET1',armor:'T4_ARMOR_PLATE_SET1',shoes:'T4_SHOES_PLATE_SET1',cape:'T4_CAPE',off:'T4_OFF_SHIELD',food:'T7_MEAL_OMELETTE',potion:'T6_POTION_HEAL',mount:'T3_MOUNT_HORSE',bag:'T4_BAG'};
const ICON=(id,q)=>`https://render.albiononline.com/v1/item/${encodeURIComponent(id)}.png?quality=${q||1}&size=160`;
const RANKO={S:0,'Muito boa':1,Boa:2,Mediana:3};
const I={};
[['SPEAR','MAIN_SPEAR','Lança','Lanças',0,'S',1810,['Investida da Lança','Avança em linha causando dano a todos no caminho.']],
 ['LANCE','MAIN_SPEAR_LANCE_AVALON','Alvorada','Lanças',0,'S',2013,['Lança Radiante','Arremete e deixa um rastro que atordoa.']],
 ['AXE','MAIN_AXE','Machado de Guerra','Machados',0,'Muito boa',1600,['Rasgo Sangrento','Área que aplica sangramento forte e reduz cura recebida.']],
 ['XBOW','2H_CROSSBOWLARGE','Besta Pesada','Bestas',1,'S',1883,['Tiro Demolidor','Disparo carregado de longo alcance que empurra.']],
 ['AVFIST','2H_KNUCKLES_AVALON','Punhos de Avalon','Luvas de guerra',1,'S',772,['Punho de Avalon','Salto que cria uma zona de impacto e arremessa.']],
 ['SKYBOW','2H_BOW_CRYSTAL','Arco do Andarilho Celeste','Arcos',1,'S',1413,['Flecha Celeste','Tiro carregado que perfura em linha reta.']],
 ['WARBOW','2H_WARBOW','Arco de Guerra','Arcos',1,'Muito boa',1280,['Flecha Mágica','Projétil carregado que atravessa inimigos.']],
 ['BOW','2H_BOW','Arco','Arcos',1,'Muito boa',1235,['Tiro Perfurante','Rajada em linha que aplica lentidão.']],
 ['CARVING','2H_CLEAVER_HELL','Espada Entalhada','Espadas',1,'Boa',1120,['Lâmina Entalhada','Corte em área que silencia.']],
 ['DAGGER','MAIN_DAGGER','Adaga','Adagas',0,'Mediana',1448,['Dança das Lâminas','Série de golpes que aplica sangramento.']]
].forEach(([k,base,name,fam,two,rank,sec,e])=>I[k]={k,slot:'weapon',base,name,fam,twoH:!!two,rank,sec,e});
const SETS=[['P1','PLATE_SET1','Soldado','plate'],['P2','PLATE_SET2','Cavaleiro','plate'],['L1','LEATHER_SET1','Mercenário','leather'],['L2','LEATHER_SET2','Caçador','leather'],['L3','LEATHER_SET3','Assassino','leather'],['C1','CLOTH_SET1','Erudito','cloth'],['C2','CLOTH_SET2','Clérigo','cloth'],['C3','CLOTH_SET3','Mago','cloth']];
const PN={head:{plate:'Elmo',leather:'Capuz',cloth:'Capote'},armor:{plate:'Armadura',leather:'Casaco',cloth:'Robe'},shoes:{plate:'Botas',leather:'Sapatos',cloth:'Sandálias'}};
const PB={head:'HEAD',armor:'ARMOR',shoes:'SHOES'}, PK={head:'H',armor:'A',shoes:'S'};
Object.keys(PN).forEach(p=>SETS.forEach(([c,b,n,t])=>{const k=PK[p]+c;I[k]={k,slot:p,base:`${PB[p]}_${b}`,name:`${PN[p][t]} de ${n}`,fam:TYPE[t],type:t};}));
[['CTH','CAPEITEM_FW_THETFORD','Capa de Thetford','Chance de aplicar dano mágico extra ao alvo.'],['CMA','CAPEITEM_FW_MARTLOCK','Capa de Martlock','Chance de gerar um escudo ao receber dano.'],['CLY','CAPEITEM_FW_LYMHURST','Capa de Lymhurst','Chance de reduzir recargas ao acertar.'],['CDE','CAPEITEM_DEMON','Capa Demoníaca','Chance de causar dano em área ao atacar.'],['CMO','CAPEITEM_MORGANA','Capa de Morgana','Chance de ganhar força ao receber dano.']].forEach(([k,base,name,fx])=>I[k]={k,slot:'cape',base,name,fam:'Capas',fx});
[['OSH','OFF_SHIELD','Escudo','Escudos'],['OTO','OFF_TORCH','Tocha','Tochas'],['OBO','OFF_BOOK','Tomo de Feitiços','Livros']].forEach(([k,base,name,fam])=>I[k]={k,slot:'off',base,name,fam});
[['FOM','food','T7_MEAL_OMELETTE','Omelete de Porco','Aumenta dano e cura causados.','30 min','—',1],['FST','food','T8_MEAL_STEW','Ensopado de Carne','Aumenta a vida máxima.','30 min','—',1],
 ['PH6','potion','T6_POTION_HEAL','Poção de Cura Maior','Cura instantânea e ao longo do tempo.','—','compartilhada entre poções',3],['PH4','potion','T4_POTION_HEAL','Poção de Cura','Cura instantânea menor.','—','compartilhada entre poções',3],['PRE','potion','T7_POTION_STONESKIN','Poção de Resistência Maior','Aumenta resistências por alguns segundos.','curta','compartilhada entre poções',2],
 ['MHO','mount','T3_MOUNT_HORSE','Cavalo de Montaria','Montaria rápida para deslocamento.','—','—',1],['MOX','mount','T3_MOUNT_OX','Boi de Transporte','Carga alta, deslocamento lento.','—','—',1]
].forEach(([k,slot,fixed,name,fx,dur,cd,qty])=>I[k]={k,slot,fixed,name,fam:SLOTL[slot],fx,dur,cd,qty,ftier:+fixed[1]});
I.BAG={k:'BAG',slot:'bag',base:'BAG',name:'Bolsa',fam:'Bolsas'};

const WSK={
 'Lanças':{Q:[['Estocada','Golpe rápido; acertos reduzem a recarga das outras habilidades.'],['Perfuração','Atravessa o alvo e aplica sangramento curto.']],W:[['Salto','Avança até a área escolhida e causa dano ao aterrissar.'],['Rodopio','Gira a haste atingindo todos ao redor.']],P:[['Ímpeto','Cada acerto aumenta a velocidade de ataque.'],['Guarda Firme','Reduz o dano recebido enquanto ataca.']]},
 'Machados':{Q:[['Retalhar','Golpe em cone que aplica sangramento.'],['Corte Amplo','Atinge inimigos à frente em arco largo.']],W:[['Investida Selvagem','Avança e golpeia; cura parte do dano causado.'],['Grito de Guerra','Aumenta o próprio dano por alguns segundos.']],P:[['Sede de Sangue','Parte do dano causado retorna como vida.'],['Fúria','Dano cresce conforme a vida diminui.']]},
 'Bestas':{Q:[['Tiro Explosivo','Projétil que causa dano em área pequena.'],['Tiro Rápido','Disparo curto com recarga baixa.']],W:[['Recuo','Salta para trás e deixa o alvo lento.'],['Ferrolho Pesado','Disparo carregado que empurra o alvo.']],P:[['Mira Firme','Aumenta o alcance parado.'],['Recarga Ágil','Reduz o tempo entre disparos.']]},
 'Luvas de guerra':{Q:[['Jab','Golpe rápido que acumula cargas.'],['Gancho','Golpe que interrompe conjurações.']],W:[['Esquiva Ofensiva','Passo lateral; o próximo golpe é mais forte.'],['Agarrão','Puxa o alvo para perto.']],P:[['Ritmo','Cargas aumentam a velocidade de movimento.'],['Punhos de Ferro','Ataques básicos reduzem a defesa do alvo.']]},
 'Arcos':{Q:[['Flecha Múltipla','Dispara três flechas em leque.'],['Flecha Envenenada','Aplica veneno ao longo do tempo.']],W:[['Salto Evasivo','Salta para trás e ganha velocidade.'],['Chuva de Flechas','Área que desacelera e causa dano.']],P:[['Olho de Águia','Mais dano a longa distância.'],['Andarilho','Mais velocidade fora de combate.']]},
 'Espadas':{Q:[['Talho Heroico','Golpe forte que reduz a recarga de W.'],['Corte Profundo','Aplica sangramento ao alvo.']],W:[['Aparar','Bloqueia o próximo golpe e contra-ataca.'],['Investida','Avança até o alvo e atordoa brevemente.']],P:[['Determinação','Mais resistência a controle.'],['Lâmina Afiada','Golpes críticos causam dano extra.']]},
 'Adagas':{Q:[['Golpe Duplo','Dois cortes rápidos.'],['Lâmina Tóxica','Envenena o alvo.']],W:[['Pulo das Sombras','Salta até o alvo e fica invisível por instantes.'],['Distrair','Silencia o alvo brevemente.']],P:[['Emboscada','Primeiro golpe após invisibilidade causa mais dano.'],['Rapidez','Aumenta a velocidade de ataque.']]}
};
const ASK={
 plate:{head:{A:[['Bloqueio','Bloqueia ataques por instantes.'],['Desafio','Provoca inimigos próximos.']],P:[['Robustez','Mais vida máxima.'],['Tenacidade','Menor duração de controle.']]},armor:{A:[['Muralha','Grande redução de dano por alguns segundos.'],['Provocação','Força inimigos a atacar você.']],P:[['Couraça','Mais resistência física.'],['Firmeza','Resiste a empurrões curtos.']]},shoes:{A:[['Investida Blindada','Corre e ganha resistência.'],['Passo Firme','Remove lentidões.']],P:[['Resiliência','Regenera vida fora de combate.'],['Peso Morto','Menos efeito de lentidão.']]}},
 leather:{head:{A:[['Arrancada','Aumenta a velocidade por instantes.'],['Visão Aguçada','Revela inimigos invisíveis próximos.']],P:[['Rastreador','Mais dano no início da luta.'],['Frieza','Menor custo de energia.']]},armor:{A:[['Frenesi','Aumenta velocidade de ataque e dano.'],['Recuperação','Cura ao longo do tempo.']],P:[['Agilidade','Mais velocidade de movimento.'],['Resistência Leve','Mais resistência mágica.']]},shoes:{A:[['Corrida','Aumenta a velocidade de movimento.'],['Rolamento','Esquiva curta na direção do cursor.']],P:[['Passos Leves','Mais velocidade fora de combate.'],['Fôlego','Menor custo de energia ao correr.']]}},
 cloth:{head:{A:[['Purificar','Remove efeitos negativos.'],['Foco','Reduz recargas por instantes.']],P:[['Sabedoria','Mais energia máxima.'],['Concentração','Conjuração mais rápida.']]},armor:{A:[['Escudo Arcano','Absorve dano por alguns segundos.'],['Reflexo','Devolve parte do dano mágico.']],P:[['Poder Arcano','Mais dano mágico.'],['Mente Serena','Regenera energia.']]},shoes:{A:[['Passo Etéreo','Teleporte curto.'],['Levitar','Fica intangível por instantes.']],P:[['Leveza','Mais velocidade de movimento.'],['Canalização','Menos interrupções ao conjurar.']]}}
};
const KEYC={Q:['#d0604c','#7e2418'],W:['#e1b24a','#8a5f12'],E:['#6f8ea3','#2c3f4c'],P:['#8ea060','#46562a'],D:['#a47ad0','#4d2d73'],R:['#5a9ad6','#1d4a78'],F:['#5fc0c9','#1b5d66']};
const BUILDS=[
 {id:'b1',title:'Lança',act:'1v1',mod:'Mundo aberto',role:'Dano',tier:6,ench:0,qual:2,upd:'2026-09-20',p:{weapon:'SPEAR',head:'HL3',armor:'AL1',shoes:'SL1',cape:'CTH',off:'OTO',food:'FOM',potion:'PH6',mount:'MHO',bag:'BAG'},alts:[{armor:'AP1',shoes:'SC2'}]},
 {id:'b2',title:'Machado de Guerra',act:'gank',mod:'Solo',role:'Dano',tier:6,ench:1,qual:2,upd:'2026-09-18',p:{weapon:'AXE',head:'HP1',armor:'AL2',shoes:'SL1',cape:'CMA',off:'OSH',food:'FOM',potion:'PH6',mount:'MHO',bag:'BAG'},alts:[{head:'HL1',cape:'CDE'}]},
 {id:'b3',title:'Machado de Guerra',act:'mists',mod:'Solo',role:'Dano',tier:5,ench:0,qual:2,upd:'2026-09-11',p:{weapon:'AXE',head:'HC2',armor:'AP2',shoes:'SL3',cape:'CDE',off:'OTO',food:'FST',potion:'PRE',mount:'MHO',bag:'BAG'},alts:[]},
 {id:'b4',title:'Besta Pesada',act:'group',mod:'10 jogadores',role:'Dano',tier:7,ench:0,qual:3,upd:'2026-09-22',p:{weapon:'XBOW',head:'HC1',armor:'AL3',shoes:'SC1',cape:'CLY',food:'FOM',potion:'PH6',bag:'BAG'},alts:[{head:'HL2'}]},
 {id:'b5',title:'Punhos de Avalon',act:'1v1',mod:'Masmorra corrompida',role:'Dano',tier:6,ench:2,qual:2,upd:'2026-09-15',p:{weapon:'AVFIST',head:'HP2',armor:'AP1',shoes:'SP1',cape:'CDE',food:'FST',potion:'PH6',mount:'MHO',bag:'BAG'},alts:[{armor:'AL2'},{shoes:'SL1',cape:'CMA'}]},
 {id:'b6',title:'Arco do Andarilho Celeste',act:'pve',mod:'Solo',role:'Dano',tier:5,ench:1,qual:2,upd:'2026-09-09',p:{weapon:'SKYBOW',head:'HL2',armor:'AL2',shoes:'SL2',cape:'CLY',food:'FOM',potion:'PH4',mount:'MOX',bag:'BAG'},alts:[]},
 {id:'b7',title:'Arco de Guerra',act:'2v2',mod:'Letal',role:'Dano',tier:6,ench:0,qual:2,upd:'2026-09-21',p:{weapon:'WARBOW',head:'HC3',armor:'AL1',shoes:'SC3',cape:'CMO',food:'FOM',potion:'PH6',bag:'BAG'},alts:[{armor:'AC1'}]},
 {id:'b8',title:'Espada Entalhada',act:'hellgates',mod:'5×5',role:'Dano',tier:7,ench:1,qual:2,upd:'2026-09-19',p:{weapon:'CARVING',head:'HP1',armor:'AP2',shoes:'SP2',cape:'CTH',food:'FST',potion:'PRE',bag:'BAG'},alts:[]},
 {id:'b9',title:'Adaga',act:'depths',mod:'Dupla',role:'Dano',tier:5,ench:0,qual:2,upd:'2026-09-06',p:{weapon:'DAGGER',head:'HL3',armor:'AL3',shoes:'SL3',cape:'CDE',off:'OTO',food:'FOM',potion:'PH4',mount:'MHO',bag:'BAG'},alts:[]},
 {id:'b10',title:'Alvorada',act:'group',mod:'5 jogadores',role:'Dano',tier:8,ench:0,qual:2,upd:'2026-09-24',p:{weapon:'LANCE',head:'HP2',armor:'AP1',shoes:'SL1',cape:'CMA',off:'OSH',food:'FST',potion:'PH6',bag:'BAG'},alts:[]}
];
const AXES=[['Popularidade','% de aparições da build na amostra da atividade.'],['Rendimento','Prata ou fama por hora observada.'],['Letalidade','Abates por aparição.'],['Eficiência','Rendimento dividido pelo custo da build.'],['Sobrevivência','Aparições sem morte / total.']];
const LSM='arsenal.v2.mentors';
const MENTORS={AXE:[{name:'Nordake',meta:'Canal PT-BR de Albion Online · lives em twitch.tv/nordake18',channel:'https://www.youtube.com/@nordake',videos:[
  {title:'Combos, builds e macetes PvP | Machado de Guerra',url:'https://www.youtube.com/watch?v=DbWJQwQG3Xc',ctx:'PvP',date:'2025-07-17',acts:['gank','1v1','2v2','mists']},
  {title:'Machado de Guerra PvP solo',url:'https://www.youtube.com/watch?v=uGtzxuj2J54',ctx:'PvP solo',date:'2025-05-25',acts:['gank','1v1','mists']},
  {title:'Dinheiro fácil com essa build | Machado de Guerra',url:'https://www.youtube.com/watch?v=MpB8LskLhjU',ctx:'Prata / PvE',date:'2024-02-07',acts:['pve']}]}]};
const DSK={Q:0,W:0,E:0,P:0,hA:0,hP:0,aA:0,aP:0,sA:0,sP:0};
const hash=s=>{let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)>>>0;}h^=h>>>13;h=Math.imul(h,0x5bd1e995)>>>0;h^=h>>>15;return h>>>0;};
const pt=(i,r)=>{const a=(-90+i*72)*Math.PI/180;return [130+r*Math.cos(a),125+r*Math.sin(a)];};


const data = {LS, LSF, LEGACY, DEF, ACTL, MODS, TR, TN, QN, TYPE, SLOTL, GHOST, ICON, RANKO, I, SETS, PN, PB, WSK, ASK, KEYC, BUILDS, AXES, LSM, MENTORS, DSK, hash, pt};
if (typeof module !== "undefined") module.exports = data;
else globalThis.ArsenalData = data;
})();
