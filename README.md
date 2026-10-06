# Albion Profit

Ferramenta open source para gerenciar flips, mercado e ilhas no Albion Online.

Projeto independente de fãs, em desenvolvimento, com interface em português.
Roda no seu computador e usa dados comunitários do Albion Online Data Project.

## O que você pode fazer

- Comparar preços de equipamentos nas cidades com ofertas do Black Market.
- Filtrar oportunidades por margem, idade dos preços e histórico de liquidez.
- Montar cargas com orçamento, peso e simulações de queda de preço.
- Receber alertas visuais e sonoros enquanto a página estiver aberta.
- Registrar compras, vendas e resultados em **Meus flips**.
- Comparar mercados de recursos na aba **Coleta** e consultar o **Arsenal**.
- Acompanhar plantios de cenouras em Lymhurst, com contagem regressiva e histórico.

**Americas e Europe** são suportados. Preços observados não garantem estoque,
execução ou lucro. A gestão da ilha é manual; não há integração com um coletor
local de plantações nesta versão.

## Executar localmente

Requer Python 3.10 ou superior e acesso à internet para os dados de mercado.
Na pasta do projeto, crie um ambiente virtual:

```sh
python -m venv .venv
```

Ative no Windows PowerShell com `.\.venv\Scripts\Activate.ps1`;
no Linux/macOS, use `source .venv/bin/activate`.

```sh
python -m pip install -r requirements.txt
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

Abra [Albion Profit](http://127.0.0.1:8000) no navegador. Para encerrar, pressione
Ctrl+C no terminal. No Windows, `./Iniciar-Flip.ps1` também permite iniciar em
segundo plano, verificando antes o acesso ao serviço de preços.

A aplicação foi feita para uso local e não possui autenticação. Publicar seu
código no GitHub não publica o servidor. Não exponha a porta do aplicativo à
internet sem implementar autenticação e controles de acesso.

## Seus dados

- Operações de **Meus flips** são gravadas em `data/trades.json` no computador
  que executa o servidor; faça backup da pasta `data`.
- Plantios, favoritos, cargas e outras preferências usam o armazenamento do
  navegador. Trocar de navegador, endereço ou porta pode mostrar dados diferentes.
- Os registros da ilha podem ser exportados pela interface.
- Dados locais, credenciais, logs e capturas pessoais ficam fora do Git.
- O navegador acessa serviços externos para preços, imagens e fontes.

## Desenvolvimento

Além de Python, os testes de interface e modelos usam Node.js 24.

```sh
python -m pytest -q
node --test --test-isolation=none tests/*.test.cjs
```

O GitHub Actions executa essas verificações em pushes e pull requests.
Veja [como contribuir](CONTRIBUTING.md) e o [guia de uso](docs/guia-de-uso.md).

## Licença e créditos

Código original sob a [licença MIT](LICENSE). Dados, marcas e recursos de terceiros
mantêm seus próprios direitos; consulte [fontes e créditos](THIRD_PARTY_NOTICES.md).
Albion Profit não é afiliado à Sandbox Interactive.
