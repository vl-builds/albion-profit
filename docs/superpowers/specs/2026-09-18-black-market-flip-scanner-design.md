# Black Market Flip Scanner — Design

Data: 2026-09-18

## Objetivo

Réplica focada do https://www.albionblackscanner.com/: uma web app local que
compara preços de venda nas cidades normais de Albion Online com os preços
de compra do Black Market, e lista oportunidades de flip (comprar barato numa
cidade, vender no Black Market) ordenadas por lucro.

Fora de escopo (YAGNI por agora): crafting/refining, histórico de preços,
gráficos, alertas, tracking de guild, autenticação de usuário, deploy online.

## Fonte de dados

API pública da Albion Online Data Project (AODP):
`https://{host}/api/v2/stats/prices/{item_ids}?locations=...`

Servidores cobertos e respetivo host: `Americas` → `west.albion-online-data.com`,
`Europe` → `europe.albion-online-data.com`. Sem captura de pacotes própria,
sem autenticação — é uma API pública gratuita.

## Lista de itens

Ficheiro estático `items.json` na raiz do projeto: lista curada de itens
vendáveis no Black Market (equipamento — armas, armaduras, acessórios, tiers
e encantamentos comuns), formato:

```json
[{"id": "T4_BAG", "name": "Bag"}, {"id": "T5_HEAD_PLATE_SET1@1", "name": "Soldier Helmet (E1)"}]
```

Não cobre o dataset completo do jogo — só o subconjunto relevante para flip
de Black Market. Pode crescer manualmente depois.

## Referências de projetos existentes (pesquisa)

Antes de fechar o design, pesquisei projetos open-source com o mesmo objetivo
(AlbionFlipper, albion-arbitrage-tracker, albion-blackmarket-arbitrage — todos
consumindo a API pública AODP), e pedi uma segunda opinião técnica (Codex)
sobre a spec resultante. Achados que moldam as decisões abaixo:

1. **Rate limit da AODP: 300 requisições / 5 minutos.** A API aceita múltiplos
   item IDs numa única chamada (separados por vírgula) — por isso o
   `aodp_client.py` agrupa os IDs em lotes, nunca faz loop por item.
2. **Taxas reais do jogo são 4% (premium) / 8% (não-premium)**, não um valor
   arbitrário — usar esses dois valores concretos como opções, não um campo
   de % livre.
3. **O Black Market só mantém ordens de compra** (o jogador vende
   instantaneamente pelo melhor comprador ali, não lista uma ordem de venda).
   Logo o preço de venda no Black Market é `buy_price_max`, **não**
   `sell_price_min` — usar `sell_price_min` nos dois lados geraria lucros
   inventados. O preço de compra na cidade continua a ser `sell_price_min`.
4. **Limite de tamanho de URL (~4096 caracteres).** Uma lista de 100-300 IDs
   pode não caber numa única URL — os lotes devem ser calculados pelo
   tamanho da URL resultante, não por uma contagem fixa de itens.
5. **Qualidade do item é uma dimensão separada da API** (Normal/Bom/
   Excelente/Excepcional/Obra-prima). Comparar preços sem fixar a mesma
   qualidade nos dois lados pode inventar lucro (ex.: comprar Normal na
   cidade mas mostrar o preço de um Excelente no Black Market). O
   `flip_calculator.py` deve comparar preço a preço **dentro da mesma
   qualidade**.
6. **A idade do preço ("age") é crítica**, e deve ser lida por lado: a AODP
   expõe `sell_price_min_date` (lado cidade) e `buy_price_max_date` (lado
   Black Market) — cada um regista quando aquele preço específico foi *visto*
   pela última vez, não quando a ordem foi preenchida. Expor a idade de cada
   lado separadamente e permitir filtrar por idade máxima evita mostrar
   oportunidades "fantasma".
7. **Descoberto durante a implementação (não previsto pela pesquisa nem pelo
   Codex):** o parâmetro de query `?locations=BlackMarket` (sem espaço) é
   aceite, mas as linhas devolvidas pela API para essa location têm
   `"city": "Black Market"` (com espaço). São duas strings diferentes — usar
   `BlackMarket` para montar o request e `Black Market` para filtrar as
   linhas devolvidas. Confirmado com uma chamada real à API em
   2026-09-18.

## Componentes

- **`items.json`** — lista curada de itens (ver acima).
- **`aodp_client.py`** — função `fetch_prices(server, item_ids, locations)`
  que chama a API AODP em **lotes de item_ids dimensionados pelo tamanho da
  URL** (respeitando o limite de ~4096 caracteres e o rate limit de 300
  req/5min) e devolve os preços brutos por item+qualidade+location,
  incluindo `sell_price_min_date` e `buy_price_max_date`. Cache em memória
  com TTL de ~5 minutos por (server, tupla de item_ids) para não martelar a
  API pública em pedidos repetidos.
- **`flip_calculator.py`** — pega nos preços brutos devolvidos pela AODP e
  produz uma lista de oportunidades:
  `{item_id, item_name, quality, source_city, city_price, city_price_age_min, bm_price, bm_price_age_min, tax_pct, profit, margin_pct}`.
  Lógica: para cada item **e qualidade** (Normal/Bom/Excelente/Excepcional/
  Obra-prima tratados separadamente, nunca misturados), usar o menor
  `sell_price_min` entre as cidades normais (excluindo Black Market) como
  preço de compra, e o `buy_price_max` da location Black Market como preço
  de venda (o Black Market só mantém ordens de compra — não há
  `sell_price_min` lá). Itens com preço `0` em qualquer um dos lados (sem
  ordens ativas) são descartados. Idade de cada lado calculada a partir do
  seu próprio timestamp: `city_price_age_min = now - sell_price_min_date`,
  `bm_price_age_min = now - buy_price_max_date`. Lucro líquido =
  `bm_price * (1 - tax_pct/100) - city_price`, onde `tax_pct` é 4 (premium)
  ou 8 (não-premium), com **8% (não-premium) como default**.
- **`main.py`** (FastAPI) — endpoint
  `GET /api/opportunities?server=Americas&premium=false&max_age_min=60` que
  orquestra client + calculator, filtra itens cuja idade (de qualquer um dos
  dois preços) exceda `max_age_min`, e devolve JSON ordenado por lucro
  decrescente. Serve também os ficheiros estáticos do frontend.
- **`static/index.html` + `static/app.js`** — página única, JS vanilla (sem
  framework), com: seletor de servidor (Americas/Europe), **toggle
  Premium/Não-premium** (default: Não-premium → 8% de taxa), **campo de idade
  máxima dos dados em minutos** (filtra oportunidades com preços
  desatualizados), botão "Atualizar", e tabela ordenável com colunas Item /
  Cidade origem / Preço cidade (+ idade) / Preço Black Market (+ idade) /
  Lucro / Margem %.

## Tratamento de erros

- Preços `0`/ausentes na AODP → item descartado silenciosamente da lista de
  oportunidades (não é um erro, é falta de ordens ativas no mercado).
- Falha de rede ou timeout ao chamar a AODP → o backend devolve HTTP 502 com
  corpo de erro; o frontend mostra um aviso "não foi possível atualizar
  preços" em vez de travar a tabela existente.

## Testes

- `test_flip_calculator.py`: preço válido nos dois lados → lucro e margem
  corretos; preço zero num dos lados → item excluído do resultado; taxa de
  4% (premium) e 8% (não-premium) aplicadas corretamente ao lucro líquido;
  item com idade (de qualquer um dos dois lados) acima do `max_age_min` →
  excluído do resultado; itens de qualidades diferentes no mesmo item_id não
  são cruzados entre si (cada qualidade só compara com ela mesma).

## Stack

Python + FastAPI (backend leve, sem build step de frontend). Dependências:
`fastapi`, `uvicorn`, `httpx` (cliente HTTP), `pytest` (testes).
