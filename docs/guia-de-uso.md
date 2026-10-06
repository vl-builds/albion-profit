# Guia do Albion Profit

Aplicação local para comparar preços de equipamentos nas cidades com ofertas de
compra do Black Market e preparar uma carga editável para Caerleon.

## Executar

Requer Python 3.10 ou superior. Na pasta do projeto:

```powershell
python -m pip install -r requirements.txt
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

Abra http://127.0.0.1:8000 no navegador.

Para iniciar em segundo plano com verificação prévia de acesso ao serviço de preços,
execute `./Iniciar-Flip.ps1` no PowerShell. Pelo Codex, a inicialização deve ter acesso
de rede autorizado: o servidor herda o ambiente do processo que o iniciou. Uma
instância iniciada com proxy de rede restrito pode abrir a página normalmente,
mas falhar em todas as consultas externas. Nesse caso, encerre essa instância e
inicie novamente com rede autorizada. O script não altera configurações de proxy.

## Flips de coleta

A aba **Coleta** compara recursos brutos (madeira, minério, fibra, peles e pedra)
entre mercados das seis cidades. Permite compra direta ou ordem de compra,
venda imediata ou anúncio, filtros de tier/encantamento, orçamento, quantidade
e idade máxima. Duas ordens também permitem comparar a margem na mesma cidade.
Os nomes em português e as variantes vêm de `resource_catalog.json`, extraído de
[ao-bin-dumps/items.json](https://github.com/ao-data/ao-bin-dumps/blob/master/formatted/items.json).

O capital simulado inclui compra e criação das ordens (2,5% por ordem).
O lucro desconta também o imposto de venda configurado (8%, ou 4% com Premium).
Cada linha usa o orçamento independentemente; quantidade simulada não indica
estoque disponível. Não inclui refino, transporte, peso, perdas ou novas taxas
de alteração de ordem. Confirme preços, profundidade e capacidade no jogo.

O histórico AODP é das ordens de venda na cidade de destino: média por dia
informado nos últimos sete dias completos UTC, cobertura e preço médio ponderado.
Ausência de dados não significa volume zero e não estima velocidade de execução
de ordens de compra. Falhas no histórico não invalidam uma consulta de preços.
**Preparar registro** abre um rascunho em Meus flips; informe a compra efetiva e
salve para usar a persistência compartilhada já existente. A pesquisa não registra
compras automaticamente.

## Primeira carga

1. Selecione Americas ou Europe e a cidade de compra. Os padrões são Americas,
   Lymhurst e orçamento de 100.000 pratas para mercadorias.
2. Informe se possui Premium e a idade máxima aceita para os preços.
   Filtre por família, tier e encantamento; a tela começa em T4.0 e permite
   selecionar todos. Esses filtros também limitam a sugestão de carga.
3. Adicione itens individualmente ou informe o peso livre e use **Sugerir carga**.
   A sugestão começa com limite de uma unidade por item e só substitui uma carga vazia.
4. Confira tier, encantamento, qualidade, preço e quantidade no jogo. Edite a
   quantidade e preencha o preço unitário real de compra; apagar o preço real
   volta a usar a estimativa. Quantidades acima de uma unidade pressupõem o mesmo
   preço unitário para todas elas.
5. Confira totais, avisos de orçamento/peso e cenários de queda de 5%, 10% e 20%
   do preço do Black Market. Edições manuais podem exceder os limites; a tela avisa.

O preço mínimo de venda é arredondado para cima e cobre compra e taxa de venda
(4% com Premium, 8% sem Premium, conforme configuração atual do projeto).
Não inclui montaria, equipamento, tempo, transporte ou perda da carga.

Os rascunhos são salvos no armazenamento local do navegador, por servidor e cidade.
Não são histórico de compras ou vendas executadas. Não há sincronização entre
navegadores ou endereços/portas diferentes. Atualizar oportunidades preserva os
preços da carga selecionada e suas confirmações; remova e adicione novamente um
item para usar uma nova observação. A idade da observação continua aumentando.

## Limites dos dados

A API pública AODP depende de observações de jogadores. O cache local dura até
60 segundos. A atualização automática é opcional, ocorre a cada minuto com a
aba visível e não interrompe consultas em andamento. A tela separa horário da
consulta, horário de obtenção dos dados da API e idade dos preços no jogo.
Preço recente não garante disponibilidade nem quantidade naquele
valor. Confirmar a compra manualmente não confirma a oferta BM. Os cenários são
simulações, não previsões. Este módulo ainda não calcula rotas nem registra vendas.

## Catálogo ampliado

O catálogo contém 6.375 variantes (255 modelos em T4–T8 e encantamentos .0–.4),
com nomes localizados e pesos. São candidatos de equipamento; aparecer na base
não comprova demanda no BM. O scanner exige uma oferta positiva de compra do BM
e um preço positivo de venda na cidade, da mesma qualidade e dentro da idade aceita.
Ferramentas, equipamentos de coleta, montarias, cosméticos e protótipos não entram.
As famílias da tela agrupam modelos (por exemplo, Espadas e Armaduras).

Fonte: https://github.com/ao-data/ao-bin-dumps. `catalog_source.json` registra os
hashes dos dois arquivos usados. Para regenerar, coloque `items.xml` e
`formatted/items.json` (renomeado para `items.json`) da mesma revisão em uma pasta:

```powershell
python scripts/generate_catalog.py CAMINHO_DA_PASTA
```

O gerador confere IDs e encantamentos existentes, nomes e pesos e produz
`items.json`, `item_details.json`, `item_weights.json` e o manifesto da fonte.
O cliente limita requisições a 180/minuto e 300/5 minutos por processo, compartilha
consultas concorrentes por cache e mantém até oito seleções em memória.
Uma consulta completa é dividida em lotes e pode demorar mais que uma filtrada.

## Preços ao vivo

Ao iniciar a aplicação, duas conexões somente de leitura acompanham o assunto
`marketorders.deduped` do AODP, uma para Americas e outra para Europe. Elas são
encerradas com a aplicação; reconexões usam espera progressiva de até 60 segundos.
`nats-py` está incluído em `requirements.txt`.

Na tela, **Receber preços ao vivo** habilita atualizações a cada três segundos
sem consultar novamente a API externa para cada mensagem. O modo também renova
a base REST a cada minuto com a aba visível. Desmarcar mantém apenas as consultas
REST (e a atualização automática opcional). O controle pausa a recepção na tela;
as conexões compartilhadas continuam enquanto a aplicação estiver aberta.

Cada preço identifica sua origem: **Observado via API** ou **Recebido ao vivo**.
Para o fluxo, o horário é o recebimento local, pois a mensagem pública não informa
o horário da observação original. A observação mais recente de cada item, qualidade e mercado é escolhida
entre as ordens recebidas nos últimos dez minutos; em empate de horário, usa-se
o menor preço na origem e o maior no BM, respeitando também a idade máxima selecionada e a expiração da ordem.
Uma observação ao vivo só substitui a base REST se seu recebimento for mais recente
que a observação dessa base. Uma nova observação REST mais recente tem preferência.

O fluxo é parcial: não transmite um livro completo nem confirma execução/cancelamento
de todas as ordens. Uma ordem já pode ter sido vendida. Por isso, a aplicação não
usa a quantidade observada como estoque nem como limite automático de compra.
Dados ao vivo expiram sem renovar artificialmente a idade da base REST; reiniciar
a aplicação perde essas observações em memória. Ordens repetidas são substituídas
pelo identificador, e o armazenamento é limitado a 50 mil ordens por servidor.
Somente itens do catálogo, qualidades válidas e mercados suportados são aceitos.

Os filtros e a sugestão de carga usam a mesma combinação de fontes quando o modo
ao vivo está marcado. Itens já adicionados à carga e preços reais preenchidos pelo
usuário não são alterados pelas mensagens; remova e adicione um item para adotar
uma estimativa nova. A interface informa falhas de conexão e tenta reconectar.

Referências de implementação:
- https://www.albion-online-data.com/developer
- https://github.com/ao-data/albiondata-client/blob/master/lib/market.go
- https://github.com/ao-data/albiondata-server-rails/blob/main/lib/location.rb
- https://github.com/ao-data/albiondata-server-rails/blob/main/app/services/market_order_dedupe_service.rb

No assunto deduplicado, os preços já chegam em prata (não dividir por 10.000).
O local 3003 representa o Black Market; 3005 representa o mercado normal de Caerleon.

## Acompanhamento de oportunidades

O filtro **Todas as cidades** reúne Bridgewatch, Lymhurst, Martlock, Thetford e
Fort Sterling, com uma linha por item, qualidade e cidade, tanto na consulta
quanto no fluxo ao vivo. A coluna Cidade de compra identifica a origem. Favoritos,
histórico, alertas e carga distinguem o mesmo item em cidades diferentes.
O modo tem seu próprio rascunho e favoritos, preservando os salvos por cidade.
É possível montar uma carga manual com várias origens; a sugestão automática
continua exigindo uma cidade específica. Na API, use `all_cities=true`, sem `city`.

Atualizações da mesma consulta preservam a tabela enquanto carregam e em caso de
falha, mantendo a idade original dos preços. Dados vencidos deixam a lista ativa.
**Manter ordem das linhas** estabiliza a ordenação, sem congelar os preços.

Use a estrela para salvar até 100 favoritos por servidor e cidade no navegador,
distinguindo também a qualidade. Eles permanecem visíveis quando não há cotação;
as atualizações continuam dependendo dos filtros da consulta atual.

**Oportunidades recentes** guarda até 200 saídas durante uma hora na sessão,
com o último preço e o motivo observado: perda de lucro, idade máxima, janela
ao vivo encerrada ou ausência de um par válido. Ausência não confirma venda.
Recarregar a página ou mudar os filtros da consulta reinicia esse histórico,
mas preserva os favoritos. Preços históricos não podem ser adicionados à carga.

## Verificação

Alertas na página combinam lucro mínimo por unidade (inicialmente 20.000), ROI
mínimo (40%) e idade de ambos os preços (até 2 minutos, limitada também pelo
filtro geral), exigindo ainda lucro positivo após a queda simulada (10% por padrão). São critérios ajustáveis, não uma garantia de execução. A mesma
oportunidade só gera novo aviso após 15 minutos, lucro 20% maior e dado mais
recente. O histórico mostra até 20 avisos da consulta nesta sessão. O histórico de avisos reinicia ao recarregar; os limites e o volume ficam salvos no navegador. Notificações do navegador são opcionais e
dependem de permissão; só funcionam com a página aberta e recebendo atualizações.
Não há monitoramento com a aplicação fechada. A busca textual não filtra alertas.

```powershell
python -m pytest -q -p no:cacheprovider
node tests/cargo-model.test.cjs
node tests/opportunity-model.test.cjs
node tests/alert-model.test.cjs
node tests/risk-model.test.cjs
node tests/trade-model.test.cjs
node --check static/app.js
```

Node é necessário apenas para os testes dos cálculos do frontend, não para usar a aplicação.


## Cotação recente e risco na viagem

A tabela exibe por padrão apenas pares de preços do item/qualidade/cidade com até
2 minutos. “Mostrar referências antigas” permite consultar os demais preços
até a idade máxima geral, sem adicioná-los à carga. O limite não é ampliado pelo
filtro geral. Referências antigas não geram alertas nem entram na sugestão da tela.
A sugestão envia `recent_only=true` e `stress_drop_pct=10` (ou o valor escolhido).
Chamadas antigas da API sem esses parâmetros conservam seu comportamento.

Cada linha mostra o preço mínimo inteiro para cobrir compra e taxa de venda
imediata, a queda percentual até esse mínimo, e o lucro após a queda simulada.
Destaques e alertas exigem lucro positivo no cenário; a carga salva permanece
editável, mas recebe aviso quando seus preços deixam de ser recentes. Pedidos de
venda, taxas anteriores, transporte e perda da carga não estão incluídos nessa
conta de venda imediata. Simular uma queda não prevê a cotação na chegada.

A preferência pela observação mais recente evita conservar uma oferta antiga
mais vantajosa depois que chega outra inferior. Ela não reconstrói o livro de
ordens: uma observação pode ser parcial e uma ordem pode já ter sido consumida.
A recepção de mensagens gerais não atualiza a idade de um item específico.

O painel inclui orientações e links oficiais para o Albion Data Client:
https://www.albion-online-data.com/client e /client-faq. A aplicação não instala
nem detecta o coletor. É necessário executar o coletor e carregar os mercados e
itens no jogo; deduplicação e dados criptografados podem limitar a atualização.


## Saída frequente no Black Market

`/api/liquidity?server=Americas&item_ids=T5_ARMOR_PLATE_SET1` consulta até 50 IDs
válidos por chamada, todas as qualidades separadas, no Black Market. A janela
considera os sete últimos dias completos em UTC, descarta o dia atual e deduplica
pontos por dia sem somar uploads repetidos. Dias ausentes são desconhecidos.
A média diária divide somente pelos dias informados; o preço médio é ponderado
pelas unidades, e a variação é o coeficiente de variação dos preços médios diários.

Dados suficientes exigem cinco dias informados e último dia de até dois dias atrás.
Saída frequente exige também cinco dias com vendas e dez unidades por dia informado.
Esse limiar é uma regra inicial do produto, não garantia de liquidez nem previsão
de tempo de venda. API vazia/incompleta aparece como dados insuficientes; falha de
rede aparece como indisponibilidade. O histórico não é oferta executável.

O filtro **Somente flips com liquidez comprovada** inicia ativo e exclui da lista,
e da sugestão itens sem histórico suficiente. Os alertas sempre exigem liquidez, inclusive com o filtro da lista desativado. Além da cobertura e dos
cinco dias ativos, exige pelo menos 10 unidades no volume informado dividido por
7 e mediana de pelo menos 10 unidades por dia informado. A mediana impede que um
único pico de vendas aprove um item de baixo giro. Dias ausentes continuam
classificados como desconhecidos; a divisão pela janela é uma referência conservadora.

A sugestão envia `liquid_only=true` para `/api/cargo-plan`. O servidor consulta
histórico em lotes de até 50 IDs, filtra por item e qualidade e limita a quantidade
à parte inteira de 10% do menor valor entre mediana diária e volume informado/7,
além dos limites de orçamento, peso e quantidade do usuário. Falha de histórico
retorna 502, sem sugerir itens não verificados. Chamadas antigas sem `liquid_only`
conservam o comportamento anterior. Desmarcar o filtro permite a análise ampla.

Cargas manuais e salvas não são removidas: recebem avisos se não houver liquidez
comprovada ou se a quantidade total do mesmo item/qualidade, somada entre cidades,
exceder o limite sugerido. Esse limite não representa estoque nem previsão de
prazo. Os destaques, com filtro ativo, também exigem cotação recente e lucro após
a queda simulada. Referências antigas continuam identificadas na tabela.

O histórico é carregado para pares lucrativos e itens da carga, compartilhado entre
cidades de origem e separado por servidor e qualidade. Cache de 15 minutos,
limite de 6.500 itens em memória e orçamento de requisições compartilhado com preços.
Histórico vencido ou de uma janela UTC anterior não aprova itens no navegador.

## Registro pessoal de operações

O registro é manual, local ao navegador, com até 1.000 lotes e servidores separados.
Datas usam horário local. Um lote deve ter o mesmo estado; vendas parciais exigem
separar os lotes e dividir custos e taxas. O botão da carga preenche identificação
e quantidade; só preenche compra se o usuário já informou o preço real.

Lucro realizado = valor recebido após imposto - compra total - taxas extras.
As taxas extras incluem criação/alteração e anúncios anteriores; não se desconta
novamente o imposto já embutido no recibo. Operações pendentes não contam como lucro.
A espera após anunciar só é calculada com data do anúncio; o tempo desde a compra
é separado. A mediana usa apenas ordens vendidas com as datas necessárias, sem
prever prazo futuro. Arquivar é reversível e exclui o lote dos totais. Exportação
JSON inclui arquivadas; não há sincronização ou importação automática. Se dados
salvos estiverem inválidos, são preservados e novas gravações ficam bloqueadas.


## Som das oportunidades excepcionais

Em Alertas, os padrões são 20.000 pratas de lucro por unidade, ROI de 40%,
ambas as cotações de até 2 minutos e lucro positivo após queda simulada de 10%.
Os avisos sempre exigem liquidez comprovada por item e qualidade. Esses limites,
o volume e a pausa dos alertas são salvos no navegador.

**Ativar e testar som** libera o áudio por interação explícita e toca uma sequência
de três notas. O volume vai de 0 a 100%; zero é silencioso. O teste não cria avisos
nem consome o intervalo de alertas. É necessário ativar novamente após recarregar.
O som é disparado pela chegada de novos avisos, nunca por redesenhar o histórico.
Um intervalo global de 10 segundos evita sequências sobrepostas; todos os avisos
continuam registrados na tela. A regra por item permanece: 15 minutos, lucro 20%
maior e observação mais recente. Um banner mostra o melhor item do novo grupo.

A página precisa permanecer aberta, recebendo dados, com o computador acordado.
O navegador pode suspender abas e áudio; não há monitoramento com a página fechada.
Falha ou suspensão do áudio não interrompe os avisos visuais. Notificações do
navegador continuam opcionais e dependem de permissão separada.

Verificação do áudio e alertas:
`node --test --test-isolation=none tests/alert-sound.test.cjs tests/alert-model.test.cjs`


## Seleção pesquisada de itens

O seletor **Seleção de itens** inicia em **Seleção BM: básicos T4–T6 .0/.1**:
33 modelos / 198 variantes definidos em `research_profile.json`. O catálogo
retorna a lista e as fontes; a interface explica que são candidatos de pesquisa,
não lucro garantido. `profile=bm_core` limita preços, fluxo ao vivo e sugestão
no servidor, além da filtragem visual. Família, tier e encantamento se combinam
por interseção. `profile=all` (padrão para clientes antigos) usa o catálogo completo.
A seleção pesquisada continua exigindo os mesmos critérios de liquidez, idade e
margem. Alertas mantêm 20 mil/un. e 40%. Pesquisa e validação histórica estão em
`docs/pesquisa-itens-flip-bm.md`; cotações salvas não renovam sua idade.

## Planejamento de venda pendente no BM

Em **Meus flips → Planejar venda pendente no BM**, informe item/variante/qualidade,
quantidade, compra unitária e preço-alvo escolhido. Média, volume total, período,
data de conferência e concorrência são observações manuais do jogo; não preenchemos
alvos automaticamente com cotações antigas. O volume diário não prevê prazo de venda.

O cálculo desconta imposto de venda, criação inicial da ordem e outros custos
previstos. As taxas são editáveis e devem ser conferidas no jogo; os valores
iniciais são 8% sem Premium (4% com Premium) e 2,5% de criação. Arredondamentos e
mínimos efetivos do jogo podem diferir da estimativa. ROI do plano usa compra mais
taxas de criação e custos extras como capital. O cenário de queda de 10% conserva
a taxa de criação original e não inclui uma nova alteração não informada.

Planos ficam em `albion-order-plans-v1`, por servidor, com edição e exportação.
Dados inválidos são preservados e bloqueiam novas gravações. Preparar registro
preenche identificação, alvo e taxas futuras, mas exige informar a compra real e
salvar explicitamente. Nunca cria uma operação automaticamente.

Nos lotes pendentes, lucro potencial = alvo × quantidade × (1 − imposto) − compra
− taxas já pagas − taxas futuras. Ao pagar uma taxa prevista, mova o valor de
futuras para já pagas, sem duplicá-lo. O alvo não altera receitas realizadas.
Encerrar usa o comprovante líquido e taxas efetivamente pagas; previsões ficam
fora dos gráficos de lucro realizado. Vendas parciais continuam exigindo separar
lotes e distribuir custos. Tempo anunciado aparece quando há data do anúncio.

Validação: `node --test --test-isolation=none tests/order-model.test.cjs tests/trade-model.test.cjs`.


## Sincronização de Meus flips

Os lotes são persistidos em `data/trades.json`, fora da pasta pública, e mantêm uma cópia no navegador. Após atualizar a página, todos os navegadores que acessam este mesmo servidor local recebem os registros compartilhados. Na migração, IDs existentes no servidor prevalecem sobre cópias locais antigas; lotes locais ausentes são adicionados. Novas gravações exigem conexão com o servidor. Conflitos de edição pedem recarregamento e não sobrescrevem a outra versão. A lista atualiza a cada 15 segundos quando visível e sem lote em edição.

Copie a pasta `data` para fazer backup. Favoritos, carga e planos continuam locais ao navegador.


## Minha ilha

A aba Minha ilha gerencia ciclos de cenouras em Lymhurst, separados entre Americas e Europe. Informe o canteiro/grupo, sementes plantadas, data de plantio e previsão de colheita indicada no jogo. Não calcula automaticamente o tempo de crescimento. Registre foco, quantidades colhidas e sementes recuperadas; custos e receita líquida são opcionais. O saldo inclui somente ciclos colhidos com ambos os valores preenchidos. Colher é uma ação manual reversível; não gera venda.

Os dados ficam em `albion-island-lymhurst-v1` no armazenamento deste navegador/origem, com exportação JSON de todos os servidores. Não há sincronização com o servidor ou importação automática. Dados inválidos são preservados e bloqueiam gravações. Conflitos entre abas pedem reabrir a edição. Até 1.000 ciclos.

O aviso visual aparece em qualquer aba da ferramenta. O som da colheita é independente dos alertas de flip e precisa ser ativado novamente após recarregar. Requer página aberta e computador acordado; abas suspensas podem atrasar o aviso. A contagem é recalculada ao retornar. Nenhum plantio é criado automaticamente.

Validação: `node --test tests/island-model.test.cjs`.

O painel de canteiros permite registro rápido por horas/minutos restantes, com datas exatas e valores opcionais recolhidos. O registro rápido usa o horário atual como início do acompanhamento; a barra mostra o tempo acompanhado, não uma medição do crescimento no jogo. Colher é habilitado ao atingir a previsão. O histórico permite desfazer ou preparar um novo ciclo, sem copiar receitas e custos. Validação adicional: `node --test tests/island-ui.test.cjs`.
