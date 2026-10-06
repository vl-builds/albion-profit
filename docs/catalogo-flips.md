# Seleções de equipamentos para flip — 27/09/2026

O catálogo local já possui 6.375 variantes oficiais de 255 modelos, em T4–T8 e encantamentos .0–.4. O limite anterior estava no perfil padrão `bm_core`, com 198 variantes de 33 modelos básicos, e não na disponibilidade dos nomes dos itens.

A seleção padrão agora é `bm_expanded`: todos os modelos T4–T8 .0–.2, totalizando 3.825 variantes. `bm_advanced` reúne todos os modelos T6–T8 .0–.4, também 3.825 variantes. Ambos incluem equipamentos de artefato, armaduras, armas, cabeças, calçados, capas, bolsas e mãos secundárias. A seleção básica e o catálogo completo continuam disponíveis. As duas novas seleções se sobrepõem; suas contagens não devem ser somadas.

Exemplos cobertos: Armadura de Cavaleiro do Ancião, Cajado Amaldiçoado do Grão-mestre, Espada Entalhada do Grão-mestre, Punhos de Avalon do Ancião e Sandálias de Druida do Mestre. A seleção avançada permite variantes até .4, mas tier/encantamento não substituem o preço de compra observado.

Essas seleções ampliam candidatos, sem afirmar que todos possuem demanda ou lucro atual. Conforme a explicação oficial do [Black Market](https://albiononline.com/news/video-black-market-feature), o mercado não tem preços fixos nem demanda ilimitada. O [guia oficial de fabricação](https://albiononline.com/news/guide-crafting) descreve equipamentos, artefatos e os mercados de destino. A inclusão de todos os modelos é uma decisão de cobertura da ferramenta, não um ranking extraído dessas fontes.

Preços positivos nas duas pontas, mesma qualidade, taxas, idade dos dados e histórico continuam sendo avaliados. O filtro de liquidez permanece ativo por padrão. Não foram diminuídos seus critérios nem os limites dos alertas. Novos candidatos sem observação no BM não se transformam automaticamente em oportunidades. Consultas amplas demoram mais; seleção, família, tier e encantamento permitem reduzi-las.

Configuração: `flip_profiles.json`. O backend deriva os IDs de `item_details.json`; não há IDs de itens inventados. A API de catálogo publica as seleções, e os mesmos perfis são usados por preços, fluxo ao vivo, filtros visuais e planejamento de carga. A seleção original permanece compatível.
