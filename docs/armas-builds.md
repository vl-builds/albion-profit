# Armas, armaduras e builds

Primeira versão: 27/09/2026. Aba disponível na navegação principal e no menu Mais.

Referência inicial: [MELHORES ARMAS PARA 1V1 — M4ax](https://www.youtube.com/watch?v=WNk-cSYIT14), publicado em 26/05/2026, duração 43:46. Análise pela transcrição automática em português acessada no YouTube. Nomes identificados pelo catálogo local. Não foi feita uma revisão de balanceamento posterior ao vídeo.

O autor delimita o ranking a confrontos 1×1 com poder de item semelhante. Mobilidade, adversários enfrentados e domínio da arma influenciam sua avaliação. A implementação usa apenas uma seleção de dez classificações identificáveis, com links para os trechos; não importa a ordenação completa nem infere estatísticas de vitória. A mudança de opinião sobre Machado de Guerra foi respeitada: a classificação final verbalizada é Muito boa.

Conteúdos: PvE, gank, grupos, 2×2, Brumas, 1×1, Profundezas e Hellgates. Somente 1×1 possui notas desta fonte. Para os outros conteúdos e para armaduras, a interface declara ausência de ranking verificado. Não transferir notas entre modos automaticamente. Grupos e Hellgates precisam de fontes que também especifiquem função e tamanho do grupo.

O Arsenal foi redesenhado com a seguinte apresentação: pergaminho, molduras metálicas, lista lateral, equipamento em grade, habilidades, gaveta de detalhes, referências de criadores e métricas. A versão móvel usa abas. A altura da janela desconta a navegação do aplicativo para manter as duas colunas visíveis no desktop.

Os 253 modelos do catálogo existente continuam disponíveis, com nomes exatos e ícones oficiais. A composição aceita arma, secundário, cabeça, armadura, botas, capa, comida, poção, bolsa e montaria. Tier, encantamento e qualidade podem ser alterados. Armas de duas mãos removem e bloqueiam o secundário; mudanças de família/material revalidam as habilidades demonstrativas. Rascunhos ficam separados por build enquanto a página permanece aberta.

As dez composições do handoff são demonstrativas, não recomendações verificadas. Habilidades, efeitos e radar são DEMO; a prévia do radar começa desligada. Uso, taxa de vitória, preços, atributos e poder de item não têm fonte conectada nesta tela. Ordenações que dependem desses dados usam nome e explicam a indisponibilidade. A comparação exige a mesma atividade. Datas das composições demonstrativas não são datas de atualização de uma fonte estatística.

Builds pessoais são salvas em `arsenal.v2.builds`. A migração lê `albion-personal-builds-v1` sem alterar sua cópia original e preserva equipamentos, contexto e notas. Salvar uma build antiga importada cria uma nova cópia; salvar uma build própria v2 atualiza o registro. Exportação/importação JSON continua disponível, com validação, mesclagem por identificador e limite de 200 builds. Dados inválidos e falhas de armazenamento não apagam o conteúdo anterior.

Filtros ficam em `arsenal.v2.filters`; indicações pessoais de criadores em `arsenal.v2.mentors`. O link compartilha a seleção e os filtros, não o conteúdo de uma build pessoal: use a exportação para transferir essas builds para outro navegador.

Implementação em HTML/CSS/JavaScript nativos: `arsenal-data.js` contém referências e demonstrações, `arsenal-view.js` gera HTML escapado, e `build-ui.js` controla interações e persistência. Os estilos têm escopo `.arsenal-v2`. O runtime do protótipo não é carregado. Backend, catálogo de equipamentos e lógica dos flips não foram alterados pelo redesign.

Validação: testes de migração, persistência, filtros combinados, revalidação de equipamentos/habilidades, comparação, importação e falhas de armazenamento; conferência visual em desktop e celular.

Próxima etapa de conteúdo: obter fontes datadas por modalidade e função antes de preencher rankings de armaduras ou recomendar builds completas.
