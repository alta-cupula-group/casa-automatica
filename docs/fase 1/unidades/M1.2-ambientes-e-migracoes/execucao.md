> Unidade: `M1.2-ambientes-e-migracoes` · Marco: `M1 · Banco` · Trilha: `dividida`
> Estado: em revisão
> Executor · Ferramenta: `Claude Code, modelo claude-opus-5` · Data: `2026-09-21` · Rodada: `1`
> Contrato aprovado em: condutor `2026-09-21` · operador `2026-09-21`

# Execução — `M1.2-ambientes-e-migracoes`

## O que ficou pronto

- `pnpm --filter @casa/api db:migrate` aplica as migrações de `apps/api/drizzle` com o
  `migrate()` do `drizzle-orm`. Ele roda direto do `src`, num clone sem build. O alvo sai do
  host da URL. URL com senha, host desconhecido e porta diferente de `5432` no `dev` ou no
  `prod` são recusados. Ele imprime alvo, host e usuário, e nunca a senha. Falha vai para
  `stderr` com a mensagem do Postgres e sai com 1.
- No `dev` e no `prod`, o driver verifica o certificado contra `apps/api/certs/supabase-ca.crt`.
  O arquivo é o `dev-ca-2021.crt` entregue pelo operador. O `sha256` dele é igual ao do
  `prod-ca-2021.crt`.
- No `prod`, a trava de `prod-guard.ts` recusa sem terminal, sem o texto
  `casa-automatica-prod`, e com `PROD_DUMP_DIR` inválida. Depois ela confere a versão do
  `pg_dump`, exporta com `pg_dump --format=custom` e só migra com código 0 e arquivo não vazio.
  O `pg_dump` também conecta com `sslmode=verify-full` contra a mesma CA.
- A migração `0000_api_role` cria `api_app` só se ele não existe, e tolera dois bancos
  criando o papel ao mesmo tempo.
- `pnpm --filter @casa/api db:generate -- --name=<nome>` chama o `drizzle-kit generate`.
- A CI sobe `supabase/postgres:17.6.1.173` como serviço. O workflow `Migrar o dev` existe e
  só roda na `main` ou à mão.
- O `README.md` ganhou a seção "Banco de dados", e `apps/api/.env.example` as cinco variáveis.

## Testes antes da implementação

Rodado com os quatro arquivos de teste escritos e nenhum módulo de `src/db` criado. Os
testes antigos passam. Os quatro arquivos novos falham.

```
$ pnpm --filter @casa/api test
 FAIL  src/db/api-role.test.ts [ src/db/api-role.test.ts ]
Error: Cannot find module './migrate.js' imported from .../apps/api/src/db/api-role.test.ts
 FAIL  src/db/migrate.test.ts [ src/db/migrate.test.ts ]
Error: Cannot find module './migrate.js' imported from .../apps/api/src/db/migrate.test.ts
 FAIL  src/db/prod-guard.test.ts [ src/db/prod-guard.test.ts ]
Error: Cannot find module './prod-guard.js' imported from .../apps/api/src/db/prod-guard.test.ts
 FAIL  src/db/target.test.ts [ src/db/target.test.ts ]
Error: Cannot find module './target.js' imported from .../apps/api/src/db/target.test.ts
 Test Files  4 failed | 2 passed (6)
      Tests  6 passed (6)
[ELIFECYCLE] Test failed. See above for more details.
código de saída: 1
```

Depois da falha, mudei um teste meu: o caminho feliz de `prod-guard.test.ts` passou a
esperar a versão do `pg_dump` antes da versão do servidor. Assim, sem `pg_dump`, nem se abre
conexão com o `prod`. O contrato não fixa essa ordem.

## Arquivos tocados

```
$ git diff --stat b2d712e..HEAD
 .github/workflows/ci.yml                 |  17 +
 .github/workflows/migrate-dev.yml        |  53 ++
 README.md                                | 202 ++++++-
 apps/api/.env.example                    |  11 +
 apps/api/certs/supabase-ca.crt           |  23 +
 apps/api/drizzle.config.ts               |   9 +
 apps/api/drizzle/0000_api_role.sql       |  16 +
 apps/api/drizzle/meta/0000_snapshot.json |  18 +
 apps/api/drizzle/meta/_journal.json      |  13 +
 apps/api/package.json                    |   9 +-
 apps/api/src/db/api-role.test.ts         |  87 +++
 apps/api/src/db/migrate-cli.ts           | 133 +++++
 apps/api/src/db/migrate.test.ts          | 207 +++++++
 apps/api/src/db/migrate.ts               |  89 +++
 apps/api/src/db/prod-guard.test.ts       | 225 +++++++
 apps/api/src/db/prod-guard.ts            | 145 +++++
 apps/api/src/db/schema.ts                |   3 +
 apps/api/src/db/target.test.ts           | 140 +++++
 apps/api/src/db/target.ts                | 116 ++++
 apps/api/src/db/test-database.ts         | 145 +++++
 docs/fase 1/estado.md                    |   2 +-
 pnpm-lock.yaml                           | 967 ++++++++++++++++++++++++++++++-
 pnpm-workspace.yaml                      |   3 +-
```

Todos estão na lista do contrato. `docs/fase 1/estado.md` veio do commit do condutor
`47f95fd`. `apps/api/tsconfig.json` e `apps/api/eslint.config.js` não mudaram: lint e tipos
passam sem cobrir `drizzle.config.ts` de outro jeito. `pnpm-workspace.yaml` mudou pelo risco
do `esbuild`, descrito no DoD geral B1 abaixo.

## Definition of Done

Os itens 1 a 7 rodaram contra `supabase/postgres:17.6.1.173` local, em
`localhost:54322`, com um container recém-criado.

```
$ export TEST_DATABASE_URL=postgres://postgres@localhost:54322/postgres TEST_DATABASE_PASSWORD=teste-local
$ pnpm --filter @casa/api exec vitest run --reporter=verbose src/db
 Test Files  4 passed (4)
      Tests  53 passed (53)
```

### DoD 1 — banco vazio, uma linha por migração, segunda execução não grava
Situação: `atendido`
```
 ✓ src/db/migrate.test.ts > DoD 1: banco vazio > runMigrations cria api_app e grava uma linha por migração, e a segunda execução não grava
```
Pelo comando, num banco novo, duas vezes seguidas:
```
$ MIGRATION_DATABASE_URL=postgres://postgres@localhost:54322/casa_cli_manual MIGRATION_DATABASE_PASSWORD=teste-local pnpm --filter @casa/api db:migrate
db:migrate alvo=local host=localhost usuário=postgres
db:migrate terminou: migrações aplicadas.
EXIT=0   (duas vezes)
$ psql ... -c "select id, hash, created_at from drizzle.__drizzle_migrations"
1|2cfa3d19aed2fc0c718df05456df51d96d8348cc0a4c5f1f95620708d550333c|1790020079405
```

### DoD 2 — dois bancos do mesmo cluster, em sequência e ao mesmo tempo
Situação: `atendido`
```
 ✓ src/db/migrate.test.ts > DoD 2: dois bancos do mesmo cluster > migra um banco depois do outro
 ✓ src/db/migrate.test.ts > DoD 2: dois bancos do mesmo cluster > migra dois bancos ao mesmo tempo, com api_app ainda inexistente no cluster
```
O segundo teste apaga `api_app` antes, para os dois bancos disputarem a criação do papel.
Ele segura um lock consultivo exclusivo, e quem usa `api_app` em outro arquivo segura o
compartilhado. A suíte rodou cinco vezes seguidas sem falha.

### DoD 3 — atributos de `api_app`, nenhum objeto, conexão como ele mesmo
Situação: `atendido`
```
 ✓ src/db/api-role.test.ts > DoD 3: papel api_app > tem os atributos da tabela do papel
 ✓ src/db/api-role.test.ts > DoD 3: papel api_app > não é dono de nenhum objeto, em nenhum banco do cluster
 ✓ src/db/api-role.test.ts > DoD 3: papel api_app > nenhuma migração define senha para api_app
 ✓ src/db/api-role.test.ts > DoD 3: papel api_app > conecta como ele mesmo com a senha definida no teste
```
O teste de "nenhum objeto" consulta `pg_shdepend` com `deptype = 'o'`, que cobre o cluster.
O de senha lê os `.sql`, porque `postgres` não é superusuário e não lê `pg_authid`.

### DoD 4 — SQL inválido rejeita sem gravar; processo contra host recusado sai com 1
Situação: `atendido`
```
 ✓ src/db/migrate.test.ts > DoD 4: falha > migração com SQL inválido rejeita com a mensagem do Postgres e não grava linha
 ✓ src/db/migrate.test.ts > DoD 4: falha > db:migrate contra host recusado escreve em stderr e sai com 1
```
À mão:
```
$ MIGRATION_DATABASE_URL=postgres://postgres@localhost:54399/postgres MIGRATION_DATABASE_PASSWORD=x pnpm --silent --filter @casa/api db:migrate
db:migrate alvo=local host=localhost usuário=postgres
db:migrate falhou: Falha ao aplicar as migrações: connect ECONNREFUSED ::1:54399; connect ECONNREFUSED 127.0.0.1:54399
EXIT=1
$ MIGRATION_DATABASE_URL=postgres://postgres@localhost:54322/casa_cli_manual MIGRATION_DATABASE_PASSWORD=errada pnpm --filter @casa/api db:migrate
db:migrate falhou: Falha ao aplicar as migrações: password authentication failed for user "postgres"
EXIT=1
```

### DoD 5 — alvo pelo host e recusas
Situação: `atendido`. Os 16 testes de `target.test.ts > DoD 5: alvo pelo host` passam. Entre
eles: `recusa host desconhecido`, `recusa porta diferente de 5432` nos dois poolers, e
`recusa URL com senha, e a mensagem não contém a senha`.
```
$ MIGRATION_DATABASE_URL='postgres://postgres:abc%25def@localhost:54322/postgres' MIGRATION_DATABASE_PASSWORD=x pnpm --filter @casa/api db:migrate
db:migrate falhou: A URL de banco não pode conter senha. Tire a senha da URL e use a variável de senha separada.
EXIT=1
```

### DoD 6 — trava do prod
Situação: `atendido`. Os 23 testes de `prod-guard.test.ts > DoD 6: trava do prod` passam,
com terminal, confirmação, `pg_dump` e raiz do repositório passados por parâmetro. O caminho
feliz confere a ordem dos eventos: a exportação termina antes da migração começar.
```
$ MIGRATION_DATABASE_URL=postgres://postgres.ref@aws-0-sa-east-1.pooler.supabase.com:5432/postgres MIGRATION_DATABASE_PASSWORD=x pnpm --filter @casa/api db:migrate </dev/null
db:migrate alvo=prod host=aws-0-sa-east-1.pooler.supabase.com usuário=postgres.ref
db:migrate falhou: O prod só migra de um terminal interativo. A entrada padrão não é um terminal.
EXIT=1
```
A chamada real ao `pg_dump` em `migrate-cli.ts` não rodou. Não tenho `pg_dump` nem acesso ao
`prod`. Ela fica para o item 10.

### DoD 7 — TLS verificado no `dev` e no `prod`, sem TLS no `local`
Situação: `atendido`, pelas opções de conexão.
```
 ✓ src/db/target.test.ts > DoD 7: TLS pelas opções de conexão > em aws-0-us-west-2.pooler.supabase.com verifica o certificado contra a CA versionada
 ✓ src/db/target.test.ts > DoD 7: TLS pelas opções de conexão > em aws-0-sa-east-1.pooler.supabase.com verifica o certificado contra a CA versionada
 ✓ src/db/target.test.ts > DoD 7: TLS pelas opções de conexão > no local não usa TLS
 ✓ src/db/target.test.ts > DoD 7: TLS pelas opções de conexão > o parâmetro sslmode da URL não desliga a verificação
```
As opções são `ssl: { ca, rejectUnauthorized: true }`. O driver as copia para o
`tls.connect`, com `servername` igual ao host, em
`node_modules/postgres/src/connection.js`, função `secure()`. Não conectei ao pooler. O
executor não tem acesso ao `dev`.

### DoD 8 — CI roda os testes de banco contra a imagem e fica verde
Situação: `atendido`
```
$ gh run list --branch unidade/M1.2-ambientes-e-migracoes
completed	success	feat(M1.2): comando de migração, papel api_app e Postgres de teste	CI	unidade/M1.2-ambientes-e-migracoes	push	35647769596	2m16s	2026-09-21T19:54:47Z
$ gh run view 35647769596 --log
... docker create ... -p 54322:5432 --health-cmd "pg_isready -U postgres -h localhost" ... supabase/postgres:17.6.1.173
... postgres service is healthy.
... TEST_DATABASE_URL: postgres://postgres@localhost:54322/postgres
... apps/api test:  ✓ src/db/api-role.test.ts (4 tests)
... apps/api test:  ✓ src/db/migrate.test.ts (5 tests)
... apps/api test:  Test Files  6 passed (6)
```
Nenhum teste conecta fora de `localhost`. `test-database.ts` recusa `TEST_DATABASE_URL`
que não resolve para `local`. O teste do processo usa `db.example.com`, recusado antes de
qualquer conexão.

### DoD 9 — workflow do `dev` aplicou a migração
Situação: `não verificado`. Só roda depois do merge na `main` e com os segredos que o
operador cria.

### DoD 10 — operador migrou o `prod`
Situação: `não verificado`. Verificação manual do operador, depois do merge.

### DoD geral da fase

| Item | Situação | Evidência |
|---|---|---|
| A1 | atendido | `git log --oneline`: `b2d712e docs(M1.2): contrato aprovado` antes de `067eec4 feat(M1.2): ...` |
| A2 | atendido | este documento |
| A3 | atendido | `git diff --stat` acima, todos na lista |
| A4 | atendido | `estado.md` e este cabeçalho em `em revisão`, no commit deste documento |
| A5 | atendido | `feat(M1.2): comando de migração, papel api_app e Postgres de teste` |
| B1 | atendido | clone limpo da branch, abaixo |
| B2 | atendido | `pnpm -r lint`, código 0 |
| B3 | atendido | `pnpm -r typecheck`, código 0 |
| B4 | atendido | `pnpm format:check`: `All matched files use Prettier code style!` |
| C1 | atendido | `pnpm -r test`, código 0. `apps/api`: `Tests 59 passed (59)` |
| C2 | atendido | cada item 1 a 7 aponta arquivo e nome do teste acima |
| C3 | atendido | itens 9 e 10 são manuais no contrato |
| C4 | atendido por leitura | só `localhost`. Não rodei a suíte numa máquina sem internet |
| C5 | não se aplica | rodada 1 |
| D1 | atendido | `gh run list --commit 067eec412f57ae5a4d1ba57b02263807081902d3`: `completed success ... CI` |
| D2 | atendido | `ci.yml` roda os mesmos cinco comandos. O passo de testes recebe as duas variáveis |
| E1 | atendido | a busca acha 55 linhas. Todas são nome de variável, texto, a senha descartável `teste-ci-descartavel` da CI, `teste-local` do README e senhas falsas de teste. Nenhum valor real |
| E2 | atendido | `git ls-files` lista só `.env.example`, `apps/api/.env.example` e `apps/web/.env.example` |
| E3 | atendido | as cinco variáveis lidas em `apps/api/src/db` estão em `apps/api/.env.example` |
| E4 | não se aplica | `apps/web` intocado |
| F1, F2 | atendido | identificadores em inglês, textos e commits em pt-BR |
| G1 | atendido | `db:migrate` num Postgres local vazio, código 0, DoD 1 |
| G2 | atendido | `git diff --name-status b2d712e..HEAD -- 'apps/api/drizzle/*.sql'`: `A apps/api/drizzle/0000_api_role.sql` |
| G3 a G6 | não se aplica | valem a partir de `M1.3` ou de M4 |
| I1, I2 | atendido | `README.md` no mesmo commit, com o passo manual da senha do `api_app` |
| J1 | atendido | `docker-compose.yml` intocado |

B1, no clone limpo da branch:
```
$ git clone --branch unidade/M1.2-ambientes-e-migracoes https://github.com/alta-cupula-group/casa-automatica.git "$dir"
$ pnpm install --frozen-lockfile     → Done in 1.4s using pnpm v12.4.1 · INSTALL=0
$ pnpm -r build                      → BUILD=0
```
E `db:migrate` num segundo clone limpo, sem build, com `apps/api/dist` ausente:
```
$ ls apps/api/dist
ls: cannot access 'apps/api/dist': No such file or directory
$ MIGRATION_DATABASE_URL=postgres://postgres@localhost:54322/casa_sem_build MIGRATION_DATABASE_PASSWORD=teste-local pnpm --filter @casa/api db:migrate
db:migrate alvo=local host=localhost usuário=postgres
db:migrate terminou: migrações aplicadas.
MIGRATE=0
```

Risco do `esbuild`, que aconteceu:
```
$ pnpm add --save-exact -D drizzle-kit@0.31.10
Error: ERR_PNPM_IGNORED_BUILDS
  × Ignored build scripts: esbuild@0.18.20, esbuild@0.25.12, esbuild@0.28.2
```
A documentação do pnpm 12.x, em https://pnpm.io/settings/build, seção `allowBuilds`, diz:
"A map of package matchers to explicitly allow (true) or disallow (false) script execution",
e que só pacote fora do mapa conta como não revisado e gera o erro. Marquei
`esbuild: false`. Depois disso `pnpm install --frozen-lockfile` sai com 0, e o
`drizzle-kit generate` carrega `drizzle.config.ts` com o `esbuild` sem o script.

### CI
```
$ gh run list --commit 067eec412f57ae5a4d1ba57b02263807081902d3
completed	success	feat(M1.2): comando de migração, papel api_app e Postgres de teste	CI	unidade/M1.2-ambientes-e-migracoes	push	35647769596	2m16s	2026-09-21T19:54:47Z
```

## Bloqueios e dúvidas

Nenhum bloqueio. Duas decisões de implementação que o condutor precisa conferir:

1. **O comando do contrato para o `db:generate` não funciona com um script simples.** O pnpm
   12.4.1 repassa o `--` ao script. `pnpm help run` diz: "Every later token reaches the
   script verbatim, including a `--` separator". O `drizzle-kit` recusa o `--` com
   `Unrecognized options for command 'generate': --`. O script `db:generate` virou um
   `sh -c` que descarta um `--` inicial e chama `drizzle-kit generate --config=drizzle.config.ts`.
   A forma do contrato funciona, e a forma sem `--` também. O `sh` não existe no Windows.
2. **O `db:migrate` roda o TypeScript direto com o Node 26, e os imports `.js` do projeto
   não existem no `src`.** Mudar o `tsconfig.json` para imports `.ts` estava fora do que o
   contrato libera. `migrate-cli.ts` registra um hook de `module.registerHooks` que tenta o
   `.ts` quando o `.js` relativo não existe. Depois carrega os módulos por import dinâmico.
   A documentação do Node 26 marca a API como "Stability: 1.2 - Release candidate", em
   https://nodejs.org/docs/latest-v26.x/api/module.html. Ela não imprime aviso.

## Encontrado e não tocado

- O `drizzle-kit generate` grava `apps/api/drizzle/meta/*.json` fora do padrão do Prettier,
  e o `pnpm format:check` falha logo depois. Rodei `pnpm format` e registrei o passo no
  `README.md`. Pôr `apps/api/drizzle/meta` no `.prettierignore` resolveria, mas o arquivo
  não está na lista do contrato.
- O `pnpm -r test` agora exige o Postgres de teste e as duas variáveis. Sem elas, os
  arquivos de banco falham com a mensagem que aponta o `README.md`. O hook de pré-commit
  não roda testes e não muda.
- O driver `postgres` 3.4.9 quebra host IPv6 passado como texto: ele separa a porta por `:`.
  `migrate.ts` passa host e porta em lista, o que o código do driver aceita, mas os tipos
  não declaram. Há um `as unknown as` comentado ali.
- O `Dockerfile` da API usa `pnpm deploy`. Ele não foi conferido para levar
  `apps/api/certs` e `apps/api/drizzle` à imagem. Isso importa quando a API conectar, no M2.
- `migrate-dev.yml` confere, antes de migrar, que a URL do segredo aponta para o pooler do
  `dev` na porta `5432`. Sem terminal, a trava do `prod` recusaria de qualquer jeito.
- A migração cria `api_app` com `NOSUPERUSER NOBYPASSRLS NOCREATEROLE NOCREATEDB NOINHERIT`,
  mas não altera um `api_app` que já exista com outros atributos. O contrato pede criar só
  se não existe. No `dev` e no `prod` o papel não existe antes desta unidade.
- `dev-ca-2021.crt` e `prod-ca-2021.crt` continuam na raiz, fora do controle de versão.
- O container `casa-postgres-teste` segue rodando nesta máquina, em `127.0.0.1:54322`.

## Como reverter

```bash
git revert 067eec412f57ae5a4d1ba57b02263807081902d3
```

A migração ainda não rodou no `dev` nem no `prod`. Depois que rodar, o revert do código não
apaga `api_app` nem `drizzle.__drizzle_migrations`. Isso exige `drop role api_app` e
`drop schema drizzle cascade` como `postgres`, em cada ambiente.
