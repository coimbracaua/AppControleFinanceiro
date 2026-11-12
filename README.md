# Bolso — Controle financeiro pessoal

Aplicativo em português para cadastrar contas, acompanhar receitas e despesas e separar dinheiro para objetivos diferentes. Os valores são registrados em reais, com armazenamento em centavos inteiros.

## Funcionalidades

- Visão geral com saldo total, saldo disponível, reservas e resultado mensal.
- Contas e carteiras com saldo inicial.
- Cadastro, edição e exclusão de lançamentos por data, conta e categoria.
- Extrato mensal com busca, filtro por tipo e exportação CSV.
- Reservas com nome, motivo, meta, prazo opcional, aportes e resgates.
- Evolução de receitas e despesas em seis meses.
- Exportação e restauração de backup JSON.
- Layout responsivo e identificação de usuário no servidor.
- Controle de revisão para evitar que duas abas sobrescrevam dados simultaneamente.

## Executar localmente

Requisito: **Node.js 22.13 ou superior**, com suporte ao módulo `node:sqlite`. Não há dependências externas para instalar.

```sh
git clone https://github.com/coimbracaua/AppControleFinanceiro.git
cd AppControleFinanceiro
npm run dev
```

Abra **http://127.0.0.1:3000**. O servidor local simula um usuário de desenvolvimento e salva os registros em `.local/finance.sqlite`, ignorado pelo Git. Ele escuta somente em loopback; não o exponha na internet. O SQLite do Node pode apresentar um aviso de recurso experimental em algumas versões.

Cadastre uma conta com seu saldo inicial, adicione receitas e despesas e crie suas reservas. Não registre o saldo inicial novamente como uma receita.

## Modelo financeiro

| Conceito | Cálculo ou comportamento |
| --- | --- |
| Saldo total | Saldos iniciais + receitas − despesas de todas as contas |
| Dinheiro reservado | Aportes − resgates de todos os objetivos |
| Disponível | Saldo total − dinheiro reservado |
| Resultado mensal | Receitas − despesas do mês selecionado |
| Aporte | Separa virtualmente um valor de uma conta para um objetivo |
| Resgate | Libera o valor reservado no objetivo e na mesma conta de origem |

Aportes e resgates não movimentam dinheiro no banco nem alteram o saldo total. Para gastar uma reserva, registre primeiro o resgate e depois a despesa. O servidor rejeita despesas que consumam o saldo reservado e resgates acima da alocação do objetivo na conta.

Os cartões de saldo mostram os valores acumulados de todos os lançamentos cadastrados, inclusive lançamentos com data futura. O mês selecionado filtra o extrato e o resultado mensal; não muda os saldos acumulados.

## Estrutura do código

```text
app.html                     Interface, estilos e lógica do navegador
worker/index.js              API, autorização e validações financeiras
scripts/build.mjs            Gera Worker com HTML incorporado
scripts/dev.mjs              Servidor local com SQLite e usuário de teste
scripts/check.test.mjs       Testes das regras financeiras e API
drizzle/0000_finances.sql    Esquema inicial do banco
.openai/hosting.json          Identidade e configuração do Site privado
dist/                        Artefatos gerados para hospedagem
```

## Banco e API

A tabela `finance_state` mantém um documento JSON por usuário e uma revisão de concorrência:

- `user_id`: chave primária do usuário autenticado.
- `data`: contas (`accounts`), objetivos (`goals`) e lançamentos (`transactions`).
- `revision`: versão incrementada a cada gravação.

`GET /api/state` consulta os dados do usuário. `PUT /api/state` recebe `{ data, revision }`, valida os registros e atualiza somente se a revisão coincidir. Conflitos retornam HTTP 409; ausência de identidade retorna HTTP 401. Gravações exigem `Origin` correspondente ao endereço do app.

## Build e testes

```sh
npm test
npm run build
node --check dist/server/index.js
```

Os testes cobrem operações financeiras válidas, proteção das reservas, limites de resgate, valores e referências inválidos, datas inválidas, identidade, origem e concorrência.

## Hospedagem

O alvo de produção é um **Cloudflare Worker com banco D1**, usando o fluxo de publicação do **Sites**. O build gera `dist/server/index.js`. A migração SQL deve ser aplicada ao D1 e o banco deve ser disponibilizado no binding `DB` antes de usar o app.

A produção depende do gateway de autenticação do Sites: ele autentica visitantes e injeta `oai-authenticated-user-id`. Não exponha o Worker diretamente aceitando esse cabeçalho de clientes sem um gateway confiável. Para outro provedor, implemente autenticação de servidor adequada e adapte a integração de banco. Não há integração de login independente neste projeto.

**Estado atual:** código implementado e testes locais disponíveis. A publicação do Site não foi concluída. Este repositório contém o código; não representa um app já hospedado. A configuração de publicação e as migrações ainda precisam ser verificadas na plataforma de destino. A interface ainda não passou por testes de navegador neste ambiente.

## Escopo atual

Cadastro financeiro manual. Não inclui conexão automática com bancos, Open Finance, cartões com fechamento de fatura, recorrências automáticas ou importação de extratos bancários.

Nenhuma credencial, dado financeiro real ou banco de desenvolvimento deve ser enviado ao repositório.
