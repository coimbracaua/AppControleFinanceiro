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

Requisito: **Node.js 22.13 ou superior**, com suporte ao módulo `node:sqlite`. A versão da Vercel utiliza `@vercel/blob`. Instale as dependências com `npm install` antes de executar.

```sh
git clone https://github.com/coimbracaua/AppControleFinanceiro.git
cd AppControleFinanceiro
npm install
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

## Hospedagem na Vercel

A versão online usa Functions Node.js 24 e **Vercel Blob privado** para os documentos de credenciais e registros financeiros. O SDK fica exclusivamente no servidor; nenhuma credencial de armazenamento é enviada ao navegador. O projeto precisa estar conectado a um store privado com a variável `BLOB_READ_WRITE_TOKEN` ou `BLOB_STORE_ID` com OIDC.

- `npm run build:vercel` gera `public/index.html`.
- `vercel.json` define o build, diretório estático, Functions e cabeçalhos de segurança.
- `api/auth.js` oferece configuração inicial, login e logout.
- `api/state.js` usa sessão autenticada e validação financeira.
- `lib/vercel-core.js` contém autenticação e regras da API.
- `lib/vercel-storage.js` acessa o armazenamento privado com ETag e gravações condicionais.

O primeiro acesso em **https://appfinanceiro-coimbracaua.vercel.app** permite criar a senha pessoal (12 a 128 caracteres). **Mantenha a proteção de implantação da Vercel ativada**, especialmente até essa configuração inicial. A criação da senha só é aceita pelo hostname principal definido no servidor e o documento inicial não pode ser sobrescrito. Depois disso, é exigida uma sessão válida, inclusive em outras URLs da implantação.

A senha é derivada com scrypt e salt aleatório. O cookie de sessão usa HMAC, validade de 7 dias, `HttpOnly`, `Secure` e `SameSite=Strict`. A versão online é um espaço financeiro pessoal único: pessoas às quais você conceder a senha compartilham os mesmos dados. Não há recuperação automática de senha ou cadastro de múltiplos usuários. A proteção da Vercel pode exigir também sua conta Vercel antes do login do app.

O armazenamento contém `auth/owner.json` e `finance/owner.json`, ambos privados. As revisões e os ETags impedem sobrescritas concorrentes. Não altere a visibilidade do store para público. O SQLite local e o banco D1 do Sites são ambientes separados; para mover registros use exportar/restaurar backup.

### Alvo original do Sites

O build `npm run build` e o código `worker/index.js` continuam disponíveis para o alvo original Cloudflare Worker + D1, com autenticação fornecida pelo gateway Sites. A migração está em `drizzle/0000_finances.sql`. A publicação no Sites não foi concluída; a implantação atual tem como alvo a Vercel.

### Verificação

`npm test` verifica cálculos financeiros e a API, incluindo configuração de senha, login, sessão, logout, origem e concorrência. Build e sintaxe foram verificados localmente. Testes completos de interação em navegador ainda não foram realizados neste ambiente.

## Escopo atual

Cadastro financeiro manual. Não inclui conexão automática com bancos, Open Finance, cartões com fechamento de fatura, recorrências automáticas ou importação de extratos bancários.

Nenhuma credencial, dado financeiro real ou banco de desenvolvimento deve ser enviado ao repositório.
