# Contribuindo com Albion Profit

Contribuições em português e inglês são bem-vindas. Para mudanças grandes,
abra uma issue antes de implementar para combinar o escopo.

1. Crie um fork e uma branch para sua alteração.
2. Instale as dependências seguindo o README.
3. Use dados fictícios ao desenvolver e testar.
4. Execute `python -m pytest -q` e `node --test --test-isolation=none tests/*.test.cjs` (Node.js 24).
5. Abra um pull request explicando o problema, a solução e a validação.

Não inclua tokens, arquivos `.env`, registros pessoais, capturas com dados de
jogadores ou conteúdo da pasta `data`. Preserve a distinção entre preços
observados, estimativas e operações efetivamente realizadas.

Alterações de interface devem funcionar em telas pequenas e com teclado.
Adicione testes quando houver nova lógica de cálculo, persistência ou alertas.
Informe as fontes e condições de uso de novos dados ou recursos de terceiros.
