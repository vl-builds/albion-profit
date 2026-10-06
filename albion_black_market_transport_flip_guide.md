# Black Market Flip — Guia Completo de Transporte para Caerleon

**Atualizado:** setembro de 2026  
**Objetivo:** comprar equipamentos baratos nas Royal Cities e transportá-los com risco controlado até Caerleon para vender no Black Market.

> O transporte para Caerleon é uma atividade de **risco real de full loot**. O objetivo não é tornar a rota “segura”, porque isso não existe, mas aumentar a probabilidade de sucesso e garantir que uma morte não destrua o bankroll.

---

## 1. Entenda onde está o risco

Caerleon fica no centro do Royal Continent. A cidade em si é segura, mas as aproximações passam por **Red Zones**, onde uma morte para outro jogador faz você perder equipamento, montaria e carga.

O Black Market fica dentro de Caerleon e funciona como comprador de equipamentos para alimentar o sistema de loot do jogo. O risco do flip está principalmente em três pontos:

1. O preço do Black Market pode mudar antes de você chegar.
2. Os dados do Albion Online Data Project podem estar desatualizados.
3. Você pode morrer durante o transporte e perder a carga inteira.

Por isso, um bom flip não é apenas `BM Price > City Price`.

Ele precisa ser lucrativo **depois de taxas, tempo, risco e possibilidade de morte**.

---

# 2. Fórmula básica do flip

No seu scanner, continue tratando a taxa como parâmetro configurável, porque diferentes ferramentas/documentações de terceiros divergem sobre a aplicação exata das taxas em determinadas operações do Black Market.

Para uma venda imediata:

```text
Lucro_por_item = Receita_líquida_BM - Preço_de_compra
```

Se estiver utilizando a configuração de taxa atual do scanner:

```text
Receita_líquida_BM = BM_Price × (1 - Taxa)
```

Então:

```text
Lucro_total = Quantidade × Lucro_por_item
```

E:

```text
ROI = Lucro_total / Capital_da_carga
```

Mas para transporte é melhor adicionar risco.

```text
EV = P(sucesso) × Lucro_do_flip
     - P(morte) × (Valor_da_carga + Custo_do_set + Custo_da_montaria)
```

Exemplo conceitual:

```text
Carga:             1.000.000
Set + montaria:      200.000
Lucro se chegar:     300.000
```

Se você estimar 10% de chance de morrer:

```text
EV = 0,90 × 300.000 - 0,10 × 1.200.000
EV = 150.000 prata
```

O flip continua positivo.

### Taxa mínima de sobrevivência

Também podemos calcular qual taxa de sucesso é necessária para o transporte não perder dinheiro no longo prazo:

```text
P(sucesso)_mínima = Perda_em_caso_de_morte /
                    (Perda_em_caso_de_morte + Lucro_se_chegar)
```

Esse cálculo será muito útil futuramente no **Flip Score**.

---

# 3. Regra de bankroll

Para quem está começando, não transporte uma parte enorme do patrimônio em uma única viagem.

Regra prática inicial:

```text
Carga por viagem <= 10% a 20% do bankroll disponível
```

A porcentagem pode aumentar conforme você aprende as rotas e mede sua própria taxa de sucesso.

Outra regra útil:

> Uma morte não deveria apagar o lucro de muitas viagens anteriores.

Se cinco viagens boas geram +200k cada e uma morte perde 3 milhões, a estratégia está mal dimensionada mesmo que os flips individuais pareçam ótimos.

---

# 4. Primeiro passo: faça uma viagem de reconhecimento

Antes de transportar qualquer coisa valiosa:

1. Pegue um cavalo barato.
2. Use equipamento barato ou praticamente nada.
3. Saia da sua Royal City.
4. Faça a rota inteira até Caerleon.
5. Observe os mapas de transição.
6. Veja onde ficam os gargalos.
7. Observe onde jogadores costumam ficar parados.
8. Memorize as saídas para o próximo mapa.

Faça isso duas ou três vezes.

O objetivo é chegar ao ponto em que você não precise parar no meio de uma Red Zone para abrir o mapa e descobrir para onde ir.

---

# 5. Tenha sempre duas rotas

Nunca dependa de apenas um caminho.

Antes de sair, prepare:

```text
Rota A = caminho principal
Rota B = caminho alternativo
```

Quando chegar numa Red Zone problemática, você pode voltar e usar a alternativa.

O melhor caminho não é necessariamente o mais curto.

Um caminho com uma zona extra, mas sem gankers e scouts, pode ser muito melhor que o caminho direto.

---

# 6. Como interpretar o contador de hostis

Nas Red Zones, o jogo mostra o número de jogadores hostis na zona.

Use isso como indicador de risco, não como garantia.

Regra operacional conservadora para começar:

```text
0 hostis  → ótimo
1–2       → normalmente aceitável com atenção
3+        → considere esperar ou mudar a rota
subida repentina → sinal forte de perigo
```

Essa regra é uma heurística usada por transportadores; não significa que dois hostis sejam seguros ou que três sejam automaticamente mortais.

Também observe indicadores de zerg no minimapa. Grupos grandes próximos aparecem como marcadores próprios.

---

# 7. Aprenda a reconhecer scouts

Grupos de gank frequentemente usam personagens para informar que um alvo está chegando.

Sinais suspeitos:

- personagem parado perto da entrada/saída;
- personagem praticamente sem equipamento;
- montaria barata parada na transição;
- jogador que não está coletando nem fazendo PvE;
- personagem que começa a acompanhar você sem motivo;
- jogadores posicionados repetidamente nos mesmos choke points.

Nenhum desses sinais isoladamente prova que seja scout.

Mas se houver scout + vários hostis na zona seguinte, simplesmente volte.

Perder dois minutos é melhor que perder a carga.

---

# 8. Use a bolha de proteção da troca de zona

Ao entrar em uma nova zona você recebe uma janela de proteção.

Não saia correndo automaticamente.

Primeiro:

1. veja o contador de hostis;
2. observe quem está no gate;
3. verifique se alguém parece esperar sua chegada;
4. veja se existe um grupo se posicionando adiante;
5. decida se continua ou volta.

Se a entrada parecer uma armadilha, retornar para a zona anterior costuma ser melhor do que tentar atravessar o grupo.

---

# 9. Montaria: escolha pela carga

Não existe uma única melhor montaria.

Existem dois tipos principais de transporte.

## A. Carga leve / alto valor

É o que eu recomendo para começar no Black Market Flip.

Priorize velocidade, mobilidade e capacidade de sobreviver após ser desmontado.

Opções comuns entre transportadores:

- Riding Horse;
- Armored Horse;
- Wild Boar;
- montarias rápidas equivalentes.

A comunidade ainda usa bastante o Wild Boar em 2026, embora jogadores tenham comentado que ele ficou menos atraente após alterações recentes.

O ponto importante é:

> Sua montaria não deve transformar você numa estátua caso seja desmontado.

## B. Carga pesada

Exemplos:

- Winter Bear;
- Bighorn Ram;
- outras montarias de grande capacidade.

Essas builds apostam em **não serem desmontadas**.

São boas para volumes grandes, mas têm uma desvantagem enorme:

> se o peso da carga depende da montaria e ela cai, você pode ficar extremamente overweight e praticamente sem capacidade de fugir.

Não recomendo começar por esse modelo sozinho.

## E o Transport Ox?

O Ox transporta muito, mas solo em zona letal pode ser uma armadilha para iniciantes.

Se for desmontado e ficar overweight, sua capacidade de escapar despenca.

Use Ox principalmente quando:

- conhecer bem a rota;
- estiver levando carga de risco baixo;
- tiver escolta;
- ou tiver um plano específico de transporte em grupo.

---

# 10. Build de fuga para carga leve

Um modelo bastante usado pela comunidade em 2026 é:

```text
Weapon: Carving Sword / Bloodletter / outra arma de mobilidade
Helmet: Soldier Helmet ou Guardian Helmet
Chest: Assassin Jacket ou chestpiece de gathering com invisibilidade
Boots: Miner Workboots
Cape: Fort Sterling Cape
Potion: Invisibility Potion
Food: opção de carry weight, se necessário
Mount: Horse / Armored Horse / Boar
```

O objetivo dessa build NÃO é matar o ganker.

É criar distância suficiente para:

```text
ser desmontado
→ sobreviver ao primeiro controle
→ ficar invisível
→ criar distância
→ ativar mobilidade / proteção contra purge
→ usar Miner Boots
→ mudar de direção
→ usar invis potion quando apropriado
→ sair do alcance
→ remontar
```

Treine essa sequência antes de transportar milhões.

As skills exatas podem mudar com patches; teste sempre a versão atual no jogo.

---

# 11. Build para transporte pesado

Para montarias como Bear/Ram, a lógica muda.

O foco passa a ser defesa e resistência enquanto montado.

Estrutura comum:

```text
Chest: Plate Armor de alto IP
Weapon: opção defensiva/mobilidade
Off-hand: defensivo quando aplicável
Boots: Miner Workboots
Cape: Fort Sterling ou Brecilien dependendo da build
Potion: Gigantify Potion ou outra opção defensiva
```

Essas builds podem carregar muito mais, porém ficam muito mais vulneráveis caso a montaria caia.

Por isso são indicadas depois que você já domina as rotas.

---

# 12. Não fique exatamente em 100% de peso

Deixe margem de segurança.

Por exemplo:

```text
Peso planejado: 70%–90%
```

Não existe uma porcentagem universal perfeita, porque depende da montaria, bag, comida e build.

O princípio é simples:

> Se qualquer buff acabar ou sua montaria cair, você ainda precisa conseguir se mover.

No scanner, futuramente podemos calcular automaticamente:

```text
Peso_total_da_carga
Peso_por_item
Quantidade_máxima
Lucro_por_kg
Lucro_por_viagem
```

---

# 13. Quando sair da cidade

Evite criar um horário completamente previsível.

Se você fizer sempre:

```text
21:00
mesma cidade
mesma rota
mesma montaria
```

você fica muito mais fácil de identificar.

Prefira:

- variar horário;
- variar rota;
- observar o movimento antes da viagem;
- evitar transportar imediatamente após comprar uma carga enorme se houver jogadores suspeitos acompanhando o mercado/saída.

---

# 14. Bandit Assault: oportunidade e perigo

Em fevereiro de 2026 o Bandit Assault foi reformulado dentro do novo sistema de Faction Warfare.

Agora há grande movimentação de facções pelas Red Zones durante o evento.

Isso cria dois efeitos opostos.

### Vantagem

Há muitos jogadores circulando e os gankers podem ter mais dificuldade para isolar um único transportador.

Alguns transportadores aproveitam o movimento das facções como cobertura.

### Desvantagem

O evento também concentra PvP em determinadas províncias e fortalezas.

Logo:

> “Transportar durante Bandit Assault” não significa automaticamente “rota segura”.

A melhor utilização é observar onde o conflito está acontecendo e evitar os principais hotspots.

---

# 15. Dragonfire e tráfego em 2026

A atualização **Dragonfire**, lançada em 31 de agosto de 2026, adicionou os Ancient Lands e novos portais pelo mundo aberto, inclusive em Red Zones.

Relatos recentes da comunidade indicam aumento de atividade em certas aproximações de Caerleon e próximo a portais.

Portanto:

> não assuma que uma rota que era tranquila meses atrás continua tranquila hoje.

O scanner pode futuramente ter um campo manual de **Route Risk** para registrar quais zonas estão mais perigosas em cada período.

---

# 16. Durante a viagem

Depois de entrar na primeira Red Zone:

### NÃO faça

- parar para colher;
- lutar contra mob;
- abrir inventário por vários segundos;
- ficar olhando mercado;
- digitar no chat;
- perseguir outro jogador;
- desmontar sem necessidade.

### Faça

- mantenha a montaria em movimento;
- preserve o gallop;
- evite tocar mobs;
- observe nametags nas bordas da tela;
- mantenha o cursor preparado para mudar de direção;
- cheque rapidamente o minimapa;
- mantenha uma saída alternativa em mente.

---

# 17. Se um jogador começar a perseguir você

Não entre em pânico.

Primeiro identifique:

```text
Ele está sozinho?
Existe outro jogador à frente?
O contador de hostis aumentou?
Ele está tentando empurrar você para uma direção específica?
```

Gank organizado frequentemente funciona como rede:

```text
Scout
   ↓
Perseguidor
   ↓
Dismounter
   ↓
Jogadores esperando na frente
```

O maior erro é simplesmente continuar pela estrada óbvia até cair no grupo seguinte.

Se perceber tentativa de corte, use terreno e rota alternativa — desde que você conheça o mapa e não perca o gallop em mobs.

---

# 18. Se você for desmontado

Sua prioridade é **distância**, não combate.

Sequência genérica:

```text
1. Absorva/evite o primeiro CC
2. Use invisibilidade do chest para quebrar visão
3. Escolha uma direção diferente da mais óbvia
4. Use mobilidade da arma
5. Ative proteção necessária contra purge/CC
6. Use Miner Boots
7. Abra grande distância
8. Limpe/espere DoTs quando necessário
9. Use Invisibility Potion
10. Continue mudando de direção
11. Remonte assim que tiver segurança
```

Não gaste todas as skills ao mesmo tempo sem saber o que está tentando evitar.

Um bom ganker espera Miner Boots para usar purge.

Por isso a ordem das habilidades importa.

---

# 19. Chegando em Caerleon

Assim que entrar em Caerleon, a parte de full-loot terminou.

Agora não corra diretamente para vender tudo.

Faça:

```text
1. Abra o Black Market
2. Pesquise novamente o item
3. Confirme o preço atual
4. Confirme a quantidade que o BM realmente quer
5. Compare com o que o scanner mostrou
6. Venda apenas enquanto a operação continuar lucrativa
```

Essa etapa é CRÍTICA.

O AODP pode mostrar um preço verdadeiro de 10 minutos atrás que já foi consumido por outro jogador.

---

# 20. Não confunda preço com profundidade da ordem

Este é um dos maiores riscos do scanner.

Exemplo:

```text
Scanner:
BM = 120.000
Quantidade transportada = 20
```

Mas no jogo pode existir apenas:

```text
1 unidade @ 120.000
4 unidades @ 105.000
15 unidades @ 85.000
```

Se você calcular as vinte unidades por 120k, o lucro é fictício.

O Albion Online Data Project nem sempre fornece profundidade confiável do order book.

Logo o scanner deve considerar:

```text
Preço AODP = sinal
Preço confirmado no jogo = execução
```

---

# 21. O que fazer se o preço caiu

Você tem quatro opções.

### 1. Vender mesmo assim

Se ainda houver lucro aceitável.

### 2. Guardar no banco de Caerleon

E esperar o Black Market voltar a subir.

### 3. Criar uma ordem de venda para o Black Market

Quando fizer sentido e as condições/taxas forem favoráveis.

### 4. Vender no mercado normal de Caerleon

Pode funcionar para determinados itens, mas a liquidez do mercado normal de Caerleon tende a ser diferente das Royal Cities.

Não venda no prejuízo apenas porque chegou até lá.

---

# 22. Volta para a Royal City

Depois de vender a carga, existem três estratégias.

## Opção A — Voltar montado

Você retorna pela Red Zone com o mesmo set.

Vantagem:

- não precisa recomprar montaria/set.

Desvantagem:

- continua existindo risco de morrer, embora agora você não esteja carregando a mercadoria principal.

## Opção B — Vender montaria/set em Caerleon

Depois faça fast travel sem bagagem.

Vantagem:

- evita a viagem de retorno.

Desvantagem:

- você pode perder dinheiro revendendo o equipamento em Caerleon.

Esse custo precisa entrar no cálculo do flip.

## Opção C — Bankar o equipamento e viajar sem bagagem

Útil se você pretende operar também a partir de Caerleon, mas não resolve automaticamente o próximo transporte saindo de outra cidade.

Caerleon possui restrições especiais de fast travel com bagagem/equipamento; para movimentar mercadoria até lá, o transporte físico pelas zonas perigosas continua sendo parte central da economia.

---

# 23. Passo a passo completo de uma operação

## Fase 1 — Scanner

```text
1. Escolher servidor
2. Escolher Premium / não-Premium
3. Filtrar dados antigos
4. Ordenar por lucro / ROI
5. Escolher UMA cidade de origem
6. Selecionar itens com preço recente
7. Conferir valor total da carga
8. Conferir peso
9. Conferir lucro esperado
```

## Fase 2 — Validação dentro do jogo

```text
10. Abrir mercado da cidade de origem
11. Confirmar preço real
12. Comprar quantidade pequena inicialmente
13. Não ultrapassar o limite de risco do bankroll
```

## Fase 3 — Preparação

```text
14. Equipar escape set
15. Equipar montaria adequada
16. Levar potion
17. Conferir peso
18. Definir rota A
19. Definir rota B
```

## Fase 4 — Transporte

```text
20. Entrar na primeira Red Zone
21. Ler contador de hostis
22. Observar possíveis scouts
23. Usar proteção de entrada para analisar
24. Voltar se houver sinal forte de emboscada
25. Manter gallop
26. Evitar mobs
27. Não parar
28. Trocar de rota se necessário
```

## Fase 5 — Caerleon

```text
29. Entrar na cidade
30. Abrir Black Market
31. Confirmar preço
32. Confirmar quantidade da ordem
33. Vender apenas a quantidade lucrativa
34. Guardar o restante se necessário
```

## Fase 6 — Registro

```text
35. Registrar preço real de compra
36. Registrar preço real do Black Market
37. Registrar lucro realizado
38. Registrar duração da viagem
39. Registrar rota usada
40. Registrar número máximo de hostis encontrados
41. Registrar tentativa de gank
```

Esses dados permitirão melhorar o scanner com informações de risco reais.

---

# 24. Como integrar transporte ao Black Market Flip Scanner

Hoje o scanner responde principalmente:

```text
Onde existe diferença de preço?
```

A próxima versão deveria responder:

```text
Qual carga eu deveria transportar AGORA?
```

Para isso, adicionar:

```text
Origin City
Buy Price
BM Price
Buy Price Age
BM Price Age
Item Weight
Quantity
Cargo Value
Profit / Item
Profit Total
ROI
Profit / kg
Estimated Trip Profit
Freshness Score
Route Risk
Confidence Score
```

---

# 25. Freshness Score

Exemplo inicial:

```text
0–5 min     = 100
5–15 min    = 90
15–30 min   = 75
30–60 min   = 50
1–2 h       = 25
>2 h        = 10
```

O ideal é calcular separadamente:

```text
Source Freshness
BM Freshness
```

E usar o pior dos dois como limitador.

```text
Freshness = min(SourceFreshness, BMFreshness)
```

---

# 26. Profit per kg

Um item pode dar muito lucro por unidade, mas ocupar muito espaço/peso.

Adicionar:

```text
Profit_per_kg = Net_Profit / Item_Weight
```

Isso permite encontrar cargas muito mais eficientes.

---

# 27. Otimizador automático de carga

Essa provavelmente é a melhoria mais interessante para o projeto.

Em vez de mostrar apenas uma tabela de itens, o scanner poderia receber:

```text
Capital disponível: 2.000.000
Capacidade: 900 kg
Cidade: Lymhurst
Risco máximo da carga: 20% bankroll
Freshness máximo: 30 min
```

E montar automaticamente a melhor cesta de produtos.

Matematicamente isso é uma variação do problema de **Knapsack / otimização de mochila**.

Objetivo:

```text
Maximizar:
Σ quantidade_item × lucro_item
```

Restrições:

```text
Σ custo_item <= orçamento
Σ peso_item <= capacidade
quantidade_item <= limite confiável
idade_preço <= limite
cidade_item = cidade_de_origem
```

Resultado:

```text
TRANSPORT PLAN

Lymhurst → Caerleon

8x Item A
13x Item B
4x Item C
21x Item D

Capital:      1.720.000
Peso:         812 kg
Lucro estim.:   486.000
ROI:              28,2%
Freshness:        91/100
```

Isso transforma o scanner de um detector de oportunidades em um **planejador de transporte**.

---

# 28. Route Risk Score

Podemos começar simples.

```text
Route Risk =
Red Zone Count
+ Route Length
+ Historical Gank Reports
+ Current Hostile Count (manual)
+ Time-of-day Risk
```

Exemplo:

```text
LOW
MEDIUM
HIGH
EXTREME
```

Depois de várias viagens, o sistema pode aprender com seus próprios dados.

Exemplo:

```text
Lymhurst → Caerleon
Trips: 48
Deaths: 3
Success Rate: 93.75%
```

Agora o EV do transporte deixa de usar uma estimativa genérica e passa a usar **seus próprios resultados**.

---

# 29. Flip Score proposto

Primeira versão:

```text
Flip Score =
0.25 × ROI Score
+ 0.25 × Freshness Score
+ 0.20 × Profit Score
+ 0.15 × Liquidity/Confidence Score
+ 0.10 × Profit-per-kg Score
+ 0.05 × Route Safety Score
```

Exemplo visual:

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Carving Sword 5.1

Origin:      Lymhurst
Buy:         42,000
BlackMarket: 67,000

Profit:      +21,000
ROI:          50%
Age:           6 min
Profit/kg:     High
Route Risk:    Medium

FLIP SCORE:   91 / 100
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

# 30. Regra de ouro

O scanner nunca deve dizer:

```text
COMPRE ESTE ITEM
```

Ele deve dizer:

```text
OPORTUNIDADE PROVÁVEL
CONFIRME NO JOGO
```

O AODP é excelente para encontrar discrepâncias, mas não substitui o order book que você vê naquele momento dentro do Albion.

---

# 31. SOP resumido

```text
SCAN
 ↓
FILTRAR PREÇOS RECENTES
 ↓
ESCOLHER CIDADE
 ↓
MONTAR CARGA
 ↓
VALIDAR PREÇO NO JOGO
 ↓
CHECK BANKROLL / PESO
 ↓
ROTA A + ROTA B
 ↓
CHECK HOSTILES
 ↓
TRANSPORTAR
 ↓
CHEGAR EM CAERLEON
 ↓
REVALIDAR BLACK MARKET
 ↓
VENDER
 ↓
REGISTRAR RESULTADO
 ↓
ATUALIZAR SCORE / RISCO
```

---

# 32. Prioridade de implementação no seu projeto

### P0 — antes de aumentar capital

- filtro de idade separado para origem e Black Market;
- lucro líquido;
- ROI;
- valor total da carga;
- peso total;
- profit/kg;
- limite de bankroll por viagem.

### P1 — grande melhoria

- planejador automático de carga;
- selecionar uma cidade de origem;
- capacidade da montaria;
- orçamento máximo;
- otimização por lucro total.

### P2 — inteligência de risco

- registrar viagens;
- registrar rota;
- registrar ganks;
- taxa histórica de sucesso;
- Route Risk Score;
- Expected Value ajustado à chance de morte.

### P3 — scanner avançado

- Flip Score;
- alertas de oportunidades muito frescas;
- histórico de spreads;
- comparação entre cidades;
- recomendação de carga por montaria;
- painel de performance por rota.

---

# Fontes pesquisadas

## Oficiais / Wiki

- Albion Online — Caerleon and the Black Market  
  https://albiononline.com/news/guide-caerleon

- Albion Online — Zone Types and Flagging  
  https://albiononline.com/news/guide-zone-types-flagging

- Albion Online — The World of Albion  
  https://albiononline.com/news/guide-world-albion

- Albion Online — Feature Focus: Bandit Assault, 10 Feb 2026  
  https://albiononline.com/news/feature-focus-bandit-assault

- Albion Online — Realm Divided Part II, 23 Feb 2026  
  https://albiononline.com/news/realm-divided-part-ii-live

- Albion Online — Dragonfire Live, 31 Aug 2026  
  https://albiononline.com/news/dragonfire-live

- Albion Online Wiki — Flagging  
  https://wiki.albiononline.com/wiki/Flagging

- Albion Online Wiki — Max Load  
  https://wiki.albiononline.com/wiki/Max_Load

## Guias de economia/transporte

- Albion Free Market — Transporting Guide, atualizado em 2026  
  https://albionfreemarket.com/articles/view/transporting-guide

- Albion Snipe — Black Market Flipper / Routes  
  https://www.albionsnipe.com/

- Albion Snipe — Buy Order or Sell Order  
  https://www.albionsnipe.com/guides/buy-order-or-sell-order

## Discussões recentes da comunidade usadas como referência prática

- Reddit — How to get to Caerleon?, maio de 2026  
  https://www.reddit.com/r/albiononline/comments/1t9dt3i/how_to_get_to_carleon/

- Reddit — Transport, julho de 2026  
  https://www.reddit.com/r/albiononline/comments/1uvx8ss/transport/

- Reddit — Transport builds, agosto de 2026  
  https://www.reddit.com/r/albiononline/comments/1vexpad/what_are_some_of_the_best_transport_sets/

- Reddit — Transporte, agosto de 2026  
  https://www.reddit.com/r/albiononline/comments/1vndlxh/transporte/

- Reddit — Selling in Caerleon market, setembro de 2026  
  https://www.reddit.com/r/albiononline/comments/1wbt7on/selling_in_caerleon_market/

---

## Conclusão

O Black Market Flip Scanner já resolve o primeiro problema: **descobrir spreads**.

A evolução natural é fazê-lo resolver o segundo problema: **como transformar esses spreads numa carga transportável com risco controlado**.

A arquitetura ideal passa a ser:

```text
AODP
 ↓
PRICE SCANNER
 ↓
FRESHNESS FILTER
 ↓
FLIP ENGINE
 ↓
CARGO OPTIMIZER
 ↓
ROUTE RISK
 ↓
EXPECTED VALUE
 ↓
FLIP SCORE
 ↓
TRANSPORT PLAN
 ↓
CONFIRMAÇÃO IN-GAME
 ↓
EXECUÇÃO
 ↓
TRIP HISTORY
 ↓
RISK MODEL
```

Com isso, o projeto deixa de ser apenas um **Black Market price scanner** e começa a se tornar um **Black Market Transport & Arbitrage Terminal**.
