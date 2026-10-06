# Seleção para flips no Black Market — 23/09/2026

## Conclusão

Usar equipamentos básicos T4–T6, .0 e .1 como universo inicial e exigir histórico
por servidor, item e qualidade antes de recomendar qualquer compra. A seleção não
é um ranking universal: concorrência, preço, estoque e demanda variam.

## Fontes e limites

- [Albion Online: Introducing the Black Market](https://albiononline.com/news/video-black-market-feature), fonte oficial de 2017: explica demanda limitada e reposição ligada ao PvE, com incentivo a itens de tiers baixos. É referência da mecânica original, não uma cotação atual.
- [Albion Codex: Black Market Flipping](https://www.albioncodex.com/guides/albion-online-black-market-flipping), guia consultado em 23/09/2026: indica começar por armas e armaduras T4–T5 e investigar T4–T6. Orientação editorial, não evidência de rentabilidade no Americas.
- [Relatos de transporte](https://www.reddit.com/r/albiononline/comments/16mv4u5/), setembro/2023: preferência relatada por equipamentos básicos 4.1–6.1, mas há opiniões divergentes sobre margens de tiers baixos. Evidência anedótica.
- [Discussão sobre bolsas e capas](https://www.reddit.com/r/albiononline/comments/1r9is07/crafting_of_general_itens/), fevereiro/2026: jogadores citam procura do BM por bolsas e capas comuns. Isso motivou a consulta de volume; não comprova o giro sozinho.

Não foram adotadas promessas de renda fixa, isenção de taxas ou listas para revenda
entre jogadores. Mantivemos as taxas e os controles de risco existentes.

## Universo implementado

33 modelos, cada um em T4/T5/T6 e .0/.1 = 198 variantes:

- Bolsa e capa comuns.
- Peito, cabeça e pés das linhas Erudito, Clérigo, Mago, Mercenário, Caçador,
  Assassino, Soldado, Cavaleiro e Guardião (27 modelos).
- Espada Larga, Machado de Guerra, Lança e Arco (4 modelos básicos escolhidos
  como amostra operacional; as fontes não estabelecem um ranking entre eles).

Artefatos, capas especiais, .2–.4 e T7–T8 ficam fora desta seleção, mas seguem
acessíveis pelo Catálogo completo. A seleção se combina com filtros existentes.
Todas as qualidades são consultadas e avaliadas separadamente.

## Validação observada no Americas

Consulta: 2026-09-23T06:23:07.968172+00:00. Janela histórica: últimos sete dias completos da consulta.

| Item | Qualidade | Unidades/dia informado | Dias com dados |
|---|---|---:|---:|
| Bolsa do Perito (T5_BAG) | 2 | 6784.0 | 7/7 |
| Capa do Adepto (T4_CAPE) | 2 | 5206.43 | 7/7 |
| Capa do Perito (T5_CAPE) | 2 | 4684.29 | 7/7 |
| Bolsa do Adepto (T4_BAG) | 2 | 3919.57 | 7/7 |
| Bolsa do Mestre (T6_BAG) | 2 | 3678.29 | 7/7 |
| Capa do Mestre (T6_CAPE) | 2 | 3008.29 | 7/7 |

376 combinações item/qualidade passaram no filtro de liquidez. Em Thetford, 36 pares tinham margem positiva nas referências de até 24 horas consultadas. Não são ofertas executáveis confirmadas; os maiores lucros encontrados tinham preços antigos.

O histórico veio da API pública AODP, não dos guias. Volume histórico não é estoque disponível, quantidade de uma ordem nem prazo previsto de venda. Os arquivos temporários de pesquisa não são distribuídos com o projeto.

Os alertas permanecem em 20.000 prata/un. e 40% de ROI, com liquidez, idade e simulação exigidas. A seleção de baixo custo pode ter giro alto e não atingir esses limites. Não alteramos os limites aceitos pelo usuário.
