# Peso de Carga, Lucro/kg e Otimizador de Carga (Planejador de Transporte) — Design

Data: 2026-09-18 (revisado após review técnico)

## Objetivo

Evoluir o Black Market Flip Scanner de "detector de spreads" para uma ferramenta
que ajuda a decidir **o que fisicamente levar numa viagem**: expõe peso e
lucro por kg de cada oportunidade, e monta automaticamente uma carga
(quantidades por item) respeitando capital disponível e capacidade de peso
disponível na montaria, **para uma cidade de origem específica**.

Este design implementa as prioridades **P0** e **P1** de
`albion_black_market_transport_flip_guide.md` (documento de pesquisa fornecido
pelo usuário sobre transporte/risco no Black Market flip). As prioridades
**P2** (histórico de viagens, taxa de sucesso real, Route Risk aprendido —
requer persistência/banco de dados) e **P3** (Flip Score composto, liquidez
via histórico) ficam **fora de escopo**, como specs futuras e independentes.

## Contexto que motivou este design (não re-derivar, já investigado)

- **Não existe portal seguro para Caerleon.** O Realmgate de Caerleon foi
  removido do jogo; o acesso é sempre por zonas de risco (confirmado via wiki
  oficial e pesquisa, e por segunda opinião técnica que apontou o erro numa
  versão anterior deste design que assumia um portal de carga). Peso não
  serve para custo de portal — serve para **lucro por kg** e **planejamento
  de capacidade de carga**.
- **Peso vem de fonte externa** (`ao-bin-dumps/items.xml`, atributo
  `weight="X.X"` por `uniquename`), já que a AODP não expõe peso. Confirmado
  por consulta direta ao XML: `T4_BAG` → 3.4, `T4_MAIN_SWORD` → 5.1,
  `T8_2H_HOLYSTAFF` → 34.2.
- **Peso não varia por encantamento.** As variantes `@1`-`@4` não têm entrada
  própria no `items.xml` — só o id base (sem sufixo) existe. Portanto o mapa
  de pesos tem as mesmas 175 entradas base de antes da expansão de
  `items.json` (que hoje tem 875 = 175 × 5 encantamentos).
- **Por que o otimizador de carga não é uma otimização matematicamente ótima
  (correção importante):** não é por inviabilidade computacional — um
  MILP/CP-SAT resolveria uma mochila de 2 restrições nesse tamanho sem
  problema. O motivo real é que **a REST API de preços da AODP (`/prices`)
  usada hoje pelo scanner não fornece profundidade de order book** — ela
  devolve `sell_price_min`/`buy_price_max` agregados, não quantas unidades
  existem naquele preço (a AODP também publica streams NATS de
  `marketorders.ingest`/`marketorders.deduped` com mais detalhe, mas isso é
  uma integração separada, fora de escopo aqui). Otimizar matematicamente em
  cima de um preço que pode valer só para 1 unidade seria **precisão falsa**.
  Por isso a escolha deliberada é uma heurística gulosa simples, previsível
  e explicável — não uma limitação técnica.
- **`max_qty_per_item` é um limite de exposição, não uma quantidade
  detectada em estoque.** A AODP não informa quantas unidades existem
  àquele preço; o parâmetro existe para limitar o quanto o plano aposta
  numa única oportunidade cuja profundidade real é desconhecida.

## Arquitetura de cálculo de oportunidades (correção central deste review)

O scanner hoje tem `flip_calculator.compute_opportunities(raw_prices,
item_names, tax_pct, max_age_min, now=None)`, que para cada item+qualidade
escolhe a **cidade normal mais barata entre todas** como origem. Essa função
**não muda** — continua alimentando a tabela geral (`GET /api/opportunities`).

**Bug evitado:** filtrar o resultado dessa função por
`source_city == origin_city` está errado, porque um item cuja cidade mais
barata globalmente é Bridgewatch simplesmente desaparece do planejador de
Lymhurst — mesmo que comprá-lo em Lymhurst continue lucrativo.

**Correção:** nova função irmã, só para o Cargo Planner:

```
compute_city_opportunities(raw_prices, item_names, tax_pct, max_age_min, origin_city, now=None) -> list[dict]
```

Mesma lógica de agrupamento por item+qualidade e mesmo formato de saída de
`compute_opportunities`, mas o preço de compra usado é **exclusivamente** a
linha de `origin_city` (não o mínimo entre todas as cidades). Se
`origin_city` não tiver preço válido (`sell_price_min == 0` ou ausente) ou
estiver além do `max_age_min`, o item é descartado — mas nunca por causa do
preço em *outra* cidade.

Implementação sugerida (não vinculante para o plano): extrair um helper
privado compartilhado entre as duas funções públicas para não duplicar a
lógica de idade/taxa/formatação de linha — só a etapa "quais linhas de
cidade são candidatas" muda entre as duas.

## Dados novos

### `item_weights.json` (estático, raiz do projeto) + `scripts/generate_item_weights.py`

Em vez de um processo manual não repetível, a geração vira um script
versionado:

```
scripts/generate_item_weights.py
  items.xml (baixado do ao-bin-dumps)
    → parse por uniquename
    → remove sufixo de encantamento
    → filtra só os ids base presentes em items.json
    → escreve item_weights.json
```

Rodar de novo (`py scripts/generate_item_weights.py`) reconstrói o ficheiro
caso `items.json` ganhe itens novos no futuro. O runtime (backend) só lê o
JSON gerado, nunca baixa o XML.

Formato: `{"T4_BAG": 3.4, "T4_MAIN_SWORD": 5.1, ...}` — 175 entradas, chave
= `item_id` **sem** o sufixo `@N`.

## Mudanças no backend

### `flip_calculator.py`

- `compute_opportunities` (existente, **inalterada**): ganha só mais dois
  campos de saída por oportunidade — `weight` (lookup em `item_weights` por
  `item_id` sem sufixo `@N`) e `profit_per_kg` (`profit / weight`). Novo
  parâmetro `item_weights: dict[str, float]`.
- `compute_city_opportunities` (nova, ver seção acima): mesma assinatura de
  saída, incluindo `weight`/`profit_per_kg`, mas filtrando por
  `origin_city` na origem do cálculo, não depois.

### `cargo_optimizer.py` (novo módulo)

```
optimize_cargo(opportunities, budget, available_weight, max_qty_per_item=5) -> dict
```

`opportunities` já vem filtrada para uma única cidade (saída de
`compute_city_opportunities`) — este módulo não conhece cidades, só recebe
uma lista de candidatos.

**Aritmética interna em inteiros** (evita erro de ponto flutuante): peso
convertido para gramas (`round(weight * 1000)`), prata já é inteiro. A
alocação usa `remaining_weight_g`, `remaining_budget` como inteiros; a saída
da API converte peso de volta para kg (float) só na formatação final.

**Best-of-Greedy**: roda a mesma alocação gulosa 3 vezes, cada vez ordenando
os candidatos por um critério diferente —
`profit_per_kg` desc, `margin_pct` (ROI) desc, `profit` (lucro unitário)
desc — cada execução respeitando `available_weight`, `budget` e
`max_qty_per_item` simultaneamente (aloca a maior quantidade inteira que
couber nas três restrições, pula o item se a quantidade calculada for 0).
Compara as 3 execuções pelo `totals.profit` e devolve a de maior lucro
total. Custo computacional é 3× uma alocação gulosa O(n log n) — continua
trivial mesmo com centenas de candidatos.

**Saída por item** (mais informação que a v1 do spec, para permitir
validar no jogo sem voltar à tabela principal):

```json
{
  "item_id": "...", "item_name": "...", "quality": 2,
  "quantity": 5,
  "unit_cost": 10000, "total_cost": 50000,
  "bm_unit_price": 19000,
  "unit_weight": 5.1, "total_weight": 25.5,
  "unit_profit": 8000, "total_profit": 40000,
  "roi_pct": 80.0, "profit_per_kg": 1568.63,
  "source_age_min": 4.2, "bm_age_min": 2.1
}
```

**Totais**, com capacidade restante e qual restrição limitou o plano:

```json
{
  "capital_used": 1750000, "capital_remaining": 250000,
  "weight_used": 842.5, "weight_remaining": 57.5,
  "budget_utilization_pct": 87.5, "weight_utilization_pct": 93.6,
  "profit": 420000, "roi_pct": 24.0,
  "binding_constraint": "weight",
  "strategy_used": "profit_per_kg"
}
```

`binding_constraint` é calculado no fim, comparando as duas
`*_utilization_pct`: a maior das duas é a restrição que "travou" o plano
(`"weight"` ou `"capital"`); se as duas ficarem abaixo de 90% (sobrou
capacidade dos dois lados — os candidatos elegíveis simplesmente acabaram),
o valor é `"none"`. Se as duas ficarem a 2 pontos percentuais ou menos uma
da outra (e pelo menos uma ≥ 90%), retorna `"both"`.

### `main.py`

- `GET /api/opportunities` (existente): cada item ganha `weight` e
  `profit_per_kg`, como já descrito.
- `TRANSPORT_ORIGINS`: nova constante = as 5 Royal Cities **excluindo
  Caerleon** (`Bridgewatch, Lymhurst, Martlock, Thetford, FortSterling`).
  Caerleon fica de fora do planejador de transporte porque comprar no
  Marketplace normal de Caerleon e vender no Black Market ali do lado é um
  **flip local sem travessia de zona de risco** — um conceito diferente,
  que pode virar sua própria opção no futuro, não misturado com rotas de
  transporte.
- `GET /api/cargo-plan` (novo): query params validados via FastAPI
  (rejeitam automaticamente com HTTP 422 se fora do domínio, sem lógica
  manual de validação):
  - `server`, `premium`, `max_age_min` — mesmos da rota existente.
  - `city: str` — deve estar em `TRANSPORT_ORIGINS`, senão 422.
  - `budget: int = Query(..., gt=0)`.
  - `available_weight: float = Query(..., gt=0)`.
  - `max_qty_per_item: int = Query(5, gt=0)`.

  Busca preços via `fetch_prices` (**reaproveitando o cache existente de
  300s** já implementado em `aodp_client.py` — como a chave de cache é
  `(server, tuple(item_ids))` e `item_ids` é sempre a lista completa de
  `items.json`, ajustar peso/budget/cidade no formulário e clicar de novo
  **não dispara uma nova chamada à AODP** dentro da janela de 5 minutos;
  não é necessária nenhuma camada de cache adicional), chama
  `compute_city_opportunities`, depois `optimize_cargo`. Retorna o dict de
  `optimize_cargo` mais um campo de status:

  ```json
  {"status": "ok", "items": [...], "totals": {...}}
  ```

  Ou, quando nada é retornado:

  ```json
  {"status": "empty", "reason": "no_opportunities", "items": [], "totals": {"capital_used": 0, "capital_remaining": <budget>, "weight_used": 0, "weight_remaining": <available_weight>, "budget_utilization_pct": 0, "weight_utilization_pct": 0, "profit": 0, "roi_pct": 0, "binding_constraint": "none", "strategy_used": null}}
  ```

  `reason` é `"no_opportunities"` (nenhum item passou no filtro de
  cidade/idade/preço válido antes mesmo de tentar alocar) ou
  `"no_item_fits"` (existiam candidatos, mas nenhum coube no peso/orçamento
  disponível — ex.: o item mais barato já excede o `budget`). Mesmo
  tratamento de erro 502 já existente em caso de falha da AODP.

## Mudanças no frontend

### Tabela principal

Duas colunas novas, sortáveis: **Peso (kg)** e **Lucro/kg**.

### Novo painel "Planejador de Carga"

- Campos: **Cidade de origem** (`<select>` só com as 5 Royal Cities de
  `TRANSPORT_ORIGINS` — não Caerleon, não Black Market), **Capital
  disponível** (prata), **Peso disponível para carga** (kg — rótulo
  deliberadamente não é "peso máximo da montaria": é o peso que sobra
  depois de já contar equipamento/comida/poções, entrada manual por
  enquanto), **Qtd. máx. por item** (default 5, com texto de ajuda "limite
  de exposição, não é estoque confirmado"), botão "Montar carga".
- Resultado: tabela com item/qualidade/quantidade/custo total/peso
  total/lucro total/ROI da linha, mais uma seção de totais mostrando
  capital e peso usados **e restantes**, utilização % de cada um, qual foi
  a restrição limitante (`binding_constraint`), e a estratégia vencedora.
- **Alerta de bankroll** (campo opcional "Bankroll total"): se preenchido e
  `totals.capital_used > 0.2 * bankroll_total`, aviso visível. Cálculo e
  exibição só no frontend.
- Mensagem fixa: "Confirme preço e quantidade disponível no jogo antes de
  comprar — a AODP não garante profundidade do estoque."
- Quando `status == "empty"`, mostra a mensagem correspondente ao `reason`
  em vez de uma tabela vazia sem explicação.

## Testes

- `test_item_weights_data.py`:
  - `item_weights.json` não vazio; todo valor é `float`/`int` finito e
    `> 0`.
  - **Igualdade de conjuntos nos dois sentidos**: o conjunto de chaves de
    `item_weights.json` é exatamente igual ao conjunto de ids base (sem
    `@N`) presentes em `items.json` — nem falta nenhum, nem sobra nenhum
    extra.
- `test_flip_calculator.py` (extensão):
  - `compute_opportunities` calcula `weight`/`profit_per_kg` corretos.
  - `compute_city_opportunities`: item cujo preço mais barato globalmente
    está numa cidade diferente da `origin_city` ainda aparece no resultado
    se for lucrativo especificamente em `origin_city` (o teste que
    comprova a correção do bug).
  - `compute_city_opportunities` ignora preço de `origin_city` inválido
    mesmo que outra cidade tenha preço ótimo.
- `test_cargo_optimizer.py` (novo):
  - respeita `available_weight` (nunca excede o peso total);
  - respeita `budget` (nunca excede o capital total);
  - respeita `max_qty_per_item`;
  - caso restrito por peso: heurística `profit_per_kg` vence o
    Best-of-Greedy;
  - caso restrito por capital: heurística `roi`/`profit` vence o
    Best-of-Greedy (prova de que o best-of-3 supera usar só
    `profit_per_kg` sozinho);
  - fronteira exata: peso disponível igual à soma exata dos itens
    escolhidos cabe sem erro de arredondamento;
  - item sem peso no `item_weights` é ignorado com segurança (não
    quebra);
  - totais dos itens somam exatamente os totais gerais (nenhuma
    divergência de arredondamento);
  - `binding_constraint` correto nos casos de peso-limitado,
    capital-limitado e nenhum-dos-dois;
  - execução determinística: mesma entrada sempre produz mesma saída
    (sem dependência de ordem de iteração de dict/set).
- `test_main.py` (extensão):
  - `GET /api/cargo-plan` com AODP mockado retorna o plano calculado;
  - `city` fora de `TRANSPORT_ORIGINS`, ou `budget`/`available_weight`
    negativos ou zero → HTTP 422 (validação do FastAPI, sem lógica
    manual);
  - nenhuma oportunidade na cidade → `status: "no_opportunities"`;
  - oportunidades existem mas nenhuma cabe → `status: "no_item_fits"`;
  - falha da AODP → 502, igual à rota existente.

## Fora de escopo (explicitamente adiado)

- Otimização matematicamente ótima via MILP/CP-SAT — não é inviável
  computacionalmente (correção feita nesta revisão), é deliberadamente
  evitada porque os preços de entrada não têm profundidade confirmada.
- Integração com os streams NATS da AODP (`marketorders.ingest`/`deduped`)
  para profundidade real de order book — possível melhoria futura, não
  neste design.
- Cálculo automático de peso disponível a partir de equipamento/montaria —
  por ora é entrada manual do usuário.
- Persistência de viagens/histórico, taxa de sucesso real, Route Risk
  aprendido (P2 do documento — precisa de banco de dados, spec própria).
- Flip Score composto e liquidez via `/history` da AODP (P3 do documento —
  spec própria, depois de P0/P1 validados em uso real).
- Flip local Caerleon-Marketplace→Black Market e rotas via Brecilien
  (Roads of Avalon aleatórios) — conceitos distintos de transporte
  tradicional Royal City→Caerleon, tratados em specs futuras se fizer
  sentido.
