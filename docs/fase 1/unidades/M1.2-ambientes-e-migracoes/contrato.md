> Unidade: `M1.2-ambientes-e-migracoes` · Marco: `M1 · Banco` · Trilha: `dividida`
> Estado: aguardando operador
> Condutor aprovou: 2026-09-21 · Operador aprovou: —
> Base: `ordem.md`, `exploracao.md` com o veredito do operador de 2026-09-21, `docs/scope-brief.md`, `docs/fase 1/dod.md`

# Contrato — `M1.2-ambientes-e-migracoes`

Este documento é auto-suficiente. Quem executa não leu a exploração e não vai lê-la.
Tudo que a execução precisa está aqui ou nos arquivos nomeados aqui.

## O que será construído

Um comando aplica as migrações de `apps/api/drizzle` num Postgres local, no `dev` ou no
`prod`. O ambiente sai do host da URL, não de uma flag. O `prod` só migra com confirmação
digitada e depois de uma exportação com `pg_dump` que terminou bem. A primeira migração
cria o papel `api_app`, com que a API vai conectar a partir do M2. Esse papel obedece ao
Row Level Security que a `M1.3` vai criar. Os testes rodam contra a imagem
`supabase/postgres` local. O `dev` migra por um workflow da CI. O `prod` migra da máquina
de um morador.

Os projetos `dev` e `prod` já existem. Esta unidade não cria projeto nem mexe no painel.
Nomes e regiões estão em `docs/scope-brief.md`, seção 4.

## Interfaces e formatos

### Comando

```
pnpm --filter @casa/api db:migrate
pnpm --filter @casa/api db:generate -- --name=<nome>
```

`db:migrate` funciona num clone recém-instalado, sem build anterior. Ele lê só
`process.env`. Ele aplica as migrações com a função `migrate()` do `drizzle-orm`, não com
`drizzle-kit migrate`. O `drizzle-kit migrate` 0.31.10 sai com código 1 sem mostrar o erro
do Postgres.

`db:generate` chama `drizzle-kit generate` com `apps/api/drizzle.config.ts`. O config não
lê URL de banco. A tabela de controle fica no padrão do Drizzle:
`drizzle.__drizzle_migrations`.

### Variáveis

Todas entram em `apps/api/.env.example`, sem valor, com comentário em pt-BR.

| Variável | Quem lê | Formato |
|---|---|---|
| `MIGRATION_DATABASE_URL` | `db:migrate` | `postgres://<usuário>@<host>:<porta>/<banco>`, **sem senha** |
| `MIGRATION_DATABASE_PASSWORD` | `db:migrate` | a senha, crua, sem codificação |
| `PROD_DUMP_DIR` | `db:migrate`, só no `prod` | diretório absoluto onde a exportação é gravada |
| `TEST_DATABASE_URL` | testes | URL sem senha do Postgres de teste, como `postgres` |
| `TEST_DATABASE_PASSWORD` | testes | senha do Postgres de teste |

A senha vai separada porque senha com `%` quebra a URL e o erro do driver imprime o trecho
da senha. URL com senha é recusada.

### Alvo pelo host

| Host da URL | Alvo | TLS |
|---|---|---|
| `localhost`, `127.0.0.1`, `::1` | `local` | desligado |
| `aws-0-us-west-2.pooler.supabase.com` | `dev` | ligado, verifica o certificado |
| `aws-0-sa-east-1.pooler.supabase.com` | `prod` | ligado, verifica o certificado |
| qualquer outro | recusa | — |

Nos alvos `dev` e `prod`, a porta tem que ser `5432`, o modo sessão do pooler. Outra porta
é recusada.

TLS verificado quer dizer: o driver confere a cadeia contra o certificado da CA do
Supabase versionado em `apps/api/certs/supabase-ca.crt`, e não aceita certificado que não
feche nessa cadeia. O arquivo é público e não é segredo. O operador entrega o arquivo antes
da execução, como diz a seção Pré-requisitos.

### Comportamento do `db:migrate`

1. Resolve o alvo. Imprime o alvo, o host e o usuário. Nunca imprime a senha.
2. No `prod`, antes de abrir conexão:
   - recusa se a entrada padrão não é terminal;
   - pede que o morador digite `casa-automatica-prod` e recusa qualquer outro texto;
   - recusa se `PROD_DUMP_DIR` está vazia, não existe, ou fica dentro do repositório git.
3. No `prod`, depois da confirmação:
   - lê a versão maior do servidor e a do `pg_dump` do `PATH`. Recusa se a do `pg_dump` é
     menor;
   - roda `pg_dump --format=custom` do banco inteiro para
     `<PROD_DUMP_DIR>/casa-automatica-prod-<AAAAMMDDTHHMMSSZ>.dump`. A senha vai por
     `PGPASSWORD` no ambiente do processo filho, nunca na linha de comando;
   - só segue se o `pg_dump` saiu com código 0 e o arquivo tem mais de zero byte.
4. Aplica as migrações pendentes numa transação.
5. Sai com código 0 no sucesso. Em qualquer falha, escreve em `stderr` uma mensagem em
   pt-BR com a mensagem original do Postgres, quando houver, e sai com código 1.

### Módulos

Organização interna livre, desde que estas funções existam e os testes as usem. Os nomes
são a interface que a `M1.3` vai consumir.

```ts
// apps/api/src/db/target.ts
export type Target = 'local' | 'dev' | 'prod';
export function resolveTarget(url: string): Target; // lança erro nos casos de recusa

// apps/api/src/db/migrate.ts
export function runMigrations(options: {
  url: string;
  password: string;
  migrationsFolder: string;
}): Promise<void>; // não faz a trava do prod; só aplica

// apps/api/src/db/test-database.ts, só para testes
export function createTestDatabase(): Promise<{
  url: string;          // URL sem senha do banco novo, como postgres
  password: string;
  drop(): Promise<void>;
}>;
export function connectAsApiRole(testDatabaseUrl: string): Promise<{
  sql: import('postgres').Sql; // conexão como api_app
  close(): Promise<void>;
}>;
```

`createTestDatabase` cria um banco de nome aleatório no Postgres de `TEST_DATABASE_URL` e
aplica as migrações de `apps/api/drizzle`. `connectAsApiRole` define para `api_app` a
senha de `TEST_DATABASE_PASSWORD` e conecta com ela. A senha é fixa porque o papel é do
cluster, e os arquivos de teste rodam em paralelo: senha aleatória por arquivo faria um
arquivo trocar a senha do outro. Sem `TEST_DATABASE_URL`, os dois falham com uma mensagem
que aponta a seção do `README.md` que sobe o Postgres de teste. Teste de banco nunca é
pulado em silêncio.

A trava do `prod` recebe por parâmetro o que precisa de mundo externo: a leitura da
confirmação, a execução do `pg_dump`, a raiz do repositório. Assim o teste a exercita sem
terminal, sem `pg_dump` e sem `prod`.

### Papel `api_app`

A migração `api_role`, criada com `drizzle-kit generate --custom --name=api_role` e escrita
à mão, garante um papel `api_app` com estes atributos:

| Atributo | Valor |
|---|---|
| `LOGIN` | sim |
| `SUPERUSER`, `BYPASSRLS`, `CREATEROLE`, `CREATEDB` | não |
| `INHERIT` | não |
| senha | nenhuma na migração |
| dono de objeto | nenhum |

Papel é do cluster, não do banco. A migração cria o papel só se ele não existe, e roda sem
erro num segundo banco do mesmo cluster. Ela também roda sem erro quando dois bancos do
mesmo cluster migram ao mesmo tempo, o que acontece com os testes em paralelo. A migração não concede permissão em tabela nem em
schema. Isso é da `M1.3`.

Decisão que sustenta o papel: `docs/scope-brief.md`, seção 3.5, isolamento por casa no
banco, e o veredito PO1 em `exploracao.md`. No Supabase, o papel `postgres` tem `BYPASSRLS`.
A API nunca conecta como `postgres`.

### Postgres de teste

Imagem `supabase/postgres:17.6.1.173`, a versão do `dev`. Ela sobe só com a variável
`POSTGRES_PASSWORD`. Nela, `postgres` tem `CREATEDB`, `CREATEROLE` e `BYPASSRLS`, e não é
superusuário, igual à nuvem. O condutor conferiu em 2026-09-21 que `postgres` cria banco,
cria `api_app` e define a senha dele, e que `api_app` conecta com essa senha. A imagem
local não tem TLS.

Na CI, o job `verificar` de `.github/workflows/ci.yml` sobe a imagem como serviço, exposto
em `localhost`, e passa `TEST_DATABASE_URL` e `TEST_DATABASE_PASSWORD` ao passo de
testes. A senha da CI é um valor descartável escrito no workflow. Ela não é segredo.

Na máquina do morador, o `README.md` dá o `docker run` equivalente. O Postgres de teste
nunca entra no `docker-compose.yml`, pelo item J1 do DoD da fase.

### Workflow do `dev`

`.github/workflows/migrate-dev.yml` roda `db:migrate` contra o `dev`:

- dispara em push na `main` que altera `apps/api/drizzle/**`, e por `workflow_dispatch`;
- lê `DEV_MIGRATION_DATABASE_URL` e `DEV_MIGRATION_DATABASE_PASSWORD` dos segredos do
  repositório;
- nunca roda em pull request;
- não tem nenhum caminho para o `prod`. O `prod` não tem segredo no GitHub.

### `README.md`

Uma seção de banco com:
- os dois ambientes, apontando `docs/scope-brief.md` sem copiar a tabela;
- como migrar o `local`, o `dev` e o `prod`, e que o caminho normal do `dev` é a CI;
- que a ordem é sempre local, depois `dev`, depois `prod`;
- como instalar o `pg_dump` da versão maior 17 ou mais nova, e onde fica a exportação;
- o passo manual da senha do `api_app` em cada ambiente, rodado uma vez como `postgres`,
  e que o usuário no pooler é `api_app.<project-ref>`;
- que a API conecta pelo pooler em modo sessão, porta `5432`, como `api_app`;
- os dois segredos do repositório, por nome;
- como subir o Postgres de teste com `docker run`;
- como verificar no painel que a Data API está desligada;
- que o Supabase local pelo CLI é opcional e não é usado pelos testes.

## Dependências novas

| Pacote | Versão | Onde | De onde saiu a versão |
|---|---|---|---|
| `drizzle-orm` | `0.45.2` | `dependencies` de `apps/api` | `pnpm view drizzle-orm version` em 2026-09-21T00:03, veredito PO2 |
| `postgres` | `3.4.9` | `dependencies` de `apps/api` | `pnpm view postgres version` em 2026-09-21, reconferido às 15:41 |
| `drizzle-kit` | `0.31.10` | `devDependencies` de `apps/api` | `pnpm view drizzle-kit version` em 2026-09-21T00:03, veredito PO2 |

Versão exata, sem `^`. O `pg` não entra. Com os dois drivers instalados, o `drizzle-kit`
escolhe o `pg`. Imagem de container nova: `supabase/postgres:17.6.1.173`, só em teste.

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `apps/api/package.json` | alterar |
| `pnpm-lock.yaml` | alterar |
| `pnpm-workspace.yaml` | alterar, só no caso do risco do `esbuild` |
| `apps/api/tsconfig.json` e `apps/api/eslint.config.js` | alterar, só se o lint ou os tipos exigirem para cobrir `drizzle.config.ts` |
| `apps/api/drizzle.config.ts` | criar |
| `apps/api/drizzle/` | criar, com a migração `api_role` e a pasta `meta` que o `drizzle-kit` gera |
| `apps/api/certs/supabase-ca.crt` | criar, com o arquivo entregue pelo operador |
| `apps/api/src/db/schema.ts` | criar, sem tabela |
| `apps/api/src/db/target.ts` e `target.test.ts` | criar |
| `apps/api/src/db/migrate.ts` e `migrate.test.ts` | criar |
| `apps/api/src/db/migrate-cli.ts` | criar |
| `apps/api/src/db/prod-guard.ts` e `prod-guard.test.ts` | criar |
| `apps/api/src/db/test-database.ts` | criar |
| `apps/api/src/db/api-role.test.ts` | criar |
| `apps/api/.env.example` | alterar |
| `.github/workflows/ci.yml` | alterar |
| `.github/workflows/migrate-dev.yml` | criar |
| `README.md` | alterar |

## Fora deste contrato

- Tabela de domínio, `house`, auditoria, política de RLS e `GRANT` para `api_app`. Tudo é
  `M1.3`.
- Código da API que conecta ao banco em execução, e a variável de conexão da API. É M2.
- Senha do `api_app` em qualquer arquivo do repositório ou segredo do GitHub.
- Segredo, Environment ou job do `prod` no GitHub.
- Postgres no `docker-compose.yml`.
- Drizzle 1.0 e os patches `0.45.3` e `0.31.11`, publicados em 2026-09-21 depois da
  exploração.
- Liberar script de instalação de qualquer pacote. É assunto da `M1.10`.
- Conexão direta por IPv6 e modo transação do pooler.
- Supabase CLI, `supabase start` e `supabase db dump`.
- Qualquer ação no painel do Supabase. O executor não tem acesso ao `dev` nem ao `prod`.

## Pré-requisitos do operador

Antes da execução:
1. baixar o certificado da CA no painel do `dev` e no do `prod`, conferir que os dois
   arquivos têm o mesmo `sha256sum`, e entregar o arquivo ao executor.

Antes dos itens 9 e 10 do DoD:
2. criar os segredos `DEV_MIGRATION_DATABASE_URL` e `DEV_MIGRATION_DATABASE_PASSWORD`.

## Definition of Done

Os itens 1 a 8 se provam na branch. Os itens 9 e 10 se provam depois do merge na `main`,
porque o workflow do `dev` só roda nela e o `prod` é migrado pelo operador. A unidade fica
`em revisão` até os dois terem evidência. Só então vem o GATE 2.

| # | Item | Como verificar | Teste |
|---|---|---|---|
| 1 | Num banco vazio, `runMigrations` termina, cria `api_app` e grava uma linha por migração em `drizzle.__drizzle_migrations`. Uma segunda execução termina e não grava linha | `pnpm --filter @casa/api test` | `migrate.test.ts` |
| 2 | A migração roda sem erro em dois bancos novos do mesmo cluster, um depois do outro e os dois ao mesmo tempo | idem | `migrate.test.ts` |
| 3 | `api_app` tem os atributos da tabela do papel, não é dono de nenhum objeto, e conecta como ele mesmo com a senha definida no teste | idem | `api-role.test.ts` |
| 4 | Uma migração com SQL inválido faz `runMigrations` rejeitar com a mensagem do Postgres, e não grava linha nova. O `db:migrate`, rodado como processo contra um host recusado, escreve a mensagem em `stderr` e sai com 1 | idem, com pasta de migração temporária | `migrate.test.ts` |
| 5 | O alvo sai do host como na tabela. Host desconhecido, porta diferente de `5432` no `dev` ou no `prod`, e URL com senha são recusados. A mensagem de recusa não contém a senha | idem | `target.test.ts` |
| 6 | A trava do `prod` recusa sem terminal, com texto errado, com `PROD_DUMP_DIR` inválido ou dentro do repositório, e com `pg_dump` de versão menor. Com `pg_dump` falhando, nada migra. No caminho feliz, a exportação termina antes da migração começar | idem | `prod-guard.test.ts` |
| 7 | No `dev` e no `prod`, a conexão verifica o certificado contra `apps/api/certs/supabase-ca.crt`. No `local`, não usa TLS | idem, pelas opções de conexão que o módulo monta | `target.test.ts` ou `migrate.test.ts` |
| 8 | A CI roda os testes de banco contra `supabase/postgres:17.6.1.173` e fica verde. Nenhum teste conecta fora de `localhost` | `gh run list --branch unidade/M1.2-ambientes-e-migracoes`, e leitura do `ci.yml` | CI |
| 9 | O workflow do `dev` aplicou a migração. No `dev`, `api_app` tem `rolbypassrls = f` e a tabela do Drizzle tem uma linha. Depois do passo manual da senha, `api_app.<ref>` conecta pelo pooler na porta `5432` | log do run de `migrate-dev.yml`. Consulta pelo MCP somente leitura. Saída de `select current_user` rodada pelo operador | verificação manual |
| 10 | O operador migrou o `prod` da própria máquina. A exportação existe, com horário anterior à linha nova de `__drizzle_migrations`. O painel dos dois projetos mostra a Data API desligada | saída do `db:migrate` e `ls -l` do arquivo, colados pelo operador. Captura do painel ou relato escrito do operador | verificação manual |

O DoD geral em `docs/fase 1/dod.md` vale por cima deste e não precisa ser repetido aqui. A
seção G passa a valer com esta unidade.

## Riscos

| Risco | Sinal de que aconteceu | O que fazer |
|---|---|---|
| `pnpm install` sai com código 1 por script de `esbuild` ignorado | `ERR_PNPM_IGNORED_BUILDS` | Marcar o `esbuild` como não liberado em `allowBuilds`, se a documentação do `pnpm` instalado mostrar que isso silencia o erro, com a evidência. Nunca liberar. Se não houver forma, parar e devolver ao condutor |
| O certificado do painel não fecha a cadeia do pooler | `self-signed certificate in certificate chain` com a CA configurada | Parar e devolver ao condutor. Não desligar a verificação |
| Os tipos do `drizzle-orm` quebram o `typecheck` | erros `TS` em `node_modules/drizzle-orm` | O repositório usa `skipLibCheck: true`. Não mudar isso. Se mesmo assim quebrar, parar e reportar |
| O serviço da imagem Supabase demora a aceitar conexão na CI | testes falham com `ECONNREFUSED` | Esperar a saúde do serviço antes dos testes, com o `pg_isready` da própria imagem |
| O host do pooler do `dev` ou do `prod` muda no painel | `db:migrate` recusa um host que o painel mostra | Parar. A tabela de alvos muda por alteração deste contrato |
| O `README.md` diz que nenhum app lê `.env` fora do Docker | contradição entre o texto e o comando | O `db:migrate` também lê só `process.env`. O `README.md` mostra como exportar as variáveis |

## Depende de

`M0.1-monorepo-base` e `M1.1-validar-supabase`, fechadas. `M1.4-ci-verificacao`, fechada,
pela proteção da `main` e pelo `ci.yml`.

## Teste de auto-suficiência

Aplicado pelo condutor antes do GATE 1.

> Um executor que leu só este contrato, as regras do repositório e os arquivos nomeados
> acima consegue entregar sem fazer nenhuma pergunta?

Resposta: `sim`, com a P1 respondida e o certificado entregue · Verificado em: `2026-09-21`

## Perguntas ao operador

### P1 — A conexão com o `dev` e o `prod` verifica o certificado do Supabase?
Por que importa: o driver `postgres` aceita o pooler sem verificar nada quando o TLS é só
`require`. Sem verificação, quem estiver no meio da rede lê a senha do `postgres` do
`prod`. O contrato está escrito na opção A.
Opções:
- **A** — verificar contra a CA baixada do painel, versionada em
  `apps/api/certs/supabase-ca.crt` · custo: um download por painel antes da execução, e
  trocar o arquivo se o Supabase trocar a CA · consequência: a conexão falha em vez de
  aceitar um servidor falso.
- **B** — TLS sem verificação · custo: nenhum agora · consequência: a senha do `prod`
  passa por uma conexão cifrada que não confere com quem fala.
Recomendação do condutor: A. O custo é um arquivo, e a senha em jogo é a do dono do `prod`.

## Alterações

Só para contrato já aprovado que mudou. Cada linha exige novo GATE 1.

| Data | O que mudou | Motivo | Reaprovado em |
|---|---|---|---|
