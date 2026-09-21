# Casa Automática

Software da casa de três moradores. Este repositório é um monorepo pnpm com três pacotes de
produto e um de configuração.

| Pacote         | Caminho           | O que é                                  |
| -------------- | ----------------- | ---------------------------------------- |
| `@casa/api`    | `apps/api`        | processo Node da API                     |
| `@casa/web`    | `apps/web`        | aplicação React servida pelo Vite        |
| `@casa/shared` | `packages/shared` | código compartilhado entre `api` e `web` |
| `@casa/config` | `packages/config` | configuração de ESLint compartilhada     |

O processo de trabalho está em `AGENTS.md` e em `docs/processo/`, e vale para qualquer ferramenta de IA. O escopo do produto está
em `docs/scope-brief.md`.

## Requisitos

| Ferramenta | Versão                                                         |
| ---------- | -------------------------------------------------------------- |
| Node       | 26 ou mais nova                                                |
| pnpm       | 12.4.1                                                         |
| Docker     | com o subcomando `compose`, para a pilha e o Postgres de teste |
| `pg_dump`  | 17 ou mais nova, só para quem migra o `prod`                   |

O Corepack não existe mais no Node 26. Quem resolve a versão do pnpm é o campo
`packageManager` do `package.json` da raiz.

## Como rodar em cinco minutos

```bash
curl -fsSL https://deb.nodesource.com/setup_26.x | sudo -E bash -   # uma vez por máquina
sudo apt-get install -y nodejs                                     # uma vez por máquina
curl -fsSL https://get.pnpm.io/install.sh | sh -                   # uma vez por máquina
source ~/.bashrc
git clone https://github.com/alta-cupula-group/casa-automatica.git
cd casa-automatica
pnpm install --frozen-lockfile
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
docker run -d --name casa-postgres-teste -e POSTGRES_PASSWORD=teste-local \
  -p 127.0.0.1:54322:5432 supabase/postgres:17.6.1.173
export TEST_DATABASE_URL=postgres://postgres@localhost:54322/postgres
export TEST_DATABASE_PASSWORD=teste-local
pnpm -r build && pnpm -r lint && pnpm -r typecheck && pnpm -r test && pnpm format:check
```

Os testes de banco precisam do Postgres de teste. A seção "Banco de dados" explica o
`docker run` e as duas variáveis. Sem elas, os testes de banco falham, e nunca são pulados.

As duas primeiras linhas instalam o Node 26 no Debian e no Ubuntu. Em outro sistema, instale o
Node 26 pelo pacote oficial de https://nodejs.org e siga da terceira linha em diante.

O `pnpm install` também ativa o hook de pré-commit, descrito na seção "CI, hook e entrega".

## Comandos de verificação

`pnpm -r build` roda antes de `pnpm -r typecheck` e de `pnpm -r test`. A razão é o
`@casa/shared`: `apps/api` e `apps/web` o consomem pelo `dist`, que não existe num clone
recém-instalado.

| Comando             | O que faz                                         |
| ------------------- | ------------------------------------------------- |
| `pnpm -r build`     | compila todos os pacotes                          |
| `pnpm -r lint`      | roda o ESLint em todos os pacotes                 |
| `pnpm -r typecheck` | roda o TypeScript sem emitir, incluindo os testes |
| `pnpm -r test`      | roda o Vitest em todos os pacotes                 |
| `pnpm format:check` | confere a formatação com o Prettier               |
| `pnpm format`       | aplica a formatação com o Prettier                |

Para rodar a API depois do build:

```bash
pnpm --filter @casa/api start
```

A API imprime uma linha e fica escutando até você interrompê-la com `Ctrl+C`. Ela responde
`200` com o corpo `ok` em qualquer rota. A porta vem de `PORT`, e vale `3000` sem ela.

```
api ok port=3000 sample=10,99
```

## Subir a casa inteira com Docker

```bash
cp .env.example .env   # opcional; sem ele, o domínio é localhost
docker compose up --build --wait
```

O `docker compose` sobe dois serviços, e nada além deles:

| Serviço | O que faz                                                             |
| ------- | --------------------------------------------------------------------- |
| `api`   | processo Node de `apps/api`                                           |
| `caddy` | serve os estáticos de `apps/web` e faz proxy reverso para o `api`      |

Os dois respondem na porta `80` do host, sob o mesmo domínio:

```bash
curl -f http://localhost/                        # o app web
curl -f -H "Host: api.localhost" http://localhost/   # a API
```

Trocar de domínio não pede edição de `infra/caddy/Caddyfile` nem de `docker-compose.yml`.
Basta definir `DOMAIN` no `.env` da raiz. Com `DOMAIN=casaautomatica.app`, o web responde em
`casaautomatica.app` e a API em `api.casaautomatica.app`.

O Caddy roda com `auto_https off` e só escuta em `http`. Quem termina TLS público é a
Cloudflare, a partir do marco de deploy. O Caddy nunca é alcançável direto da internet.

Para derrubar tudo:

```bash
docker compose down
```

## CI, hook e entrega

O GitHub Actions roda o workflow `CI` a cada push e a cada pull request com alvo na `main`. O
job se chama `verificar`, e o check que aparece no pull request se chama `CI / verificar`. Ele
roda os cinco comandos da tabela acima, na mesma ordem.

Pull request que altera só arquivos dentro de `docs/` ou só arquivos `.md` fecha verde sem
rodar os cinco comandos. Qualquer outro caminho roda tudo.

A `main` não aceita push direto nem force push. Código entra por pull request com o check
`CI / verificar` verde.

O `pnpm install` ativa o husky num clone novo, sem passo manual. O hook de pré-commit roda:

```bash
pnpm -r lint && pnpm -r typecheck
```

Commit com erro de lint ou de tipo é recusado na sua máquina. `git commit --no-verify` pula o
hook, porque isso é comportamento do git. Quem garante a verificação é a CI, que roda os
mesmos comandos no pull request e barra o merge.

Entrega de uma mudança, em um comando por linha:

```bash
git switch -c <tipo>/<assunto>
git push -u origin HEAD
gh pr create --fill && gh pr merge --squash --auto
```

O merge automático entra sozinho assim que o check fica verde.

## Variáveis de ambiente

Cada app tem o seu `.env.example`. O arquivo `.env` real nunca é versionado.

| Arquivo         | Variável       | O que é                                           |
| --------------- | -------------- | ------------------------------------------------- |
| `.env`          | `DOMAIN`       | domínio público do sistema; vazio vale `localhost` |
| `.env`          | `PORT`         | porta HTTP do container da API; vazia vale `3000` |
| `apps/api/.env` | `PORT`         | porta HTTP da API rodando fora do container       |
| `apps/api/.env` | `NODE_ENV`     | modo de execução                                  |
| `apps/web/.env` | `VITE_API_URL` | endereço da API que o app consome                 |
| `apps/api/.env` | `MIGRATION_DATABASE_URL`      | URL sem senha do banco que o `db:migrate` migra |
| `apps/api/.env` | `MIGRATION_DATABASE_PASSWORD` | senha do usuário dessa URL, crua                |
| `apps/api/.env` | `PROD_DUMP_DIR`               | diretório da exportação do `prod`, fora do repositório |
| `apps/api/.env` | `TEST_DATABASE_URL`           | URL sem senha do Postgres de teste              |
| `apps/api/.env` | `TEST_DATABASE_PASSWORD`      | senha do Postgres de teste                      |

Fora do Docker, nenhum app lê arquivo `.env`. A API lê `process.env` e nada mais. O `.env`
da raiz é lido pelo `docker compose`, e ele é opcional: sem o arquivo, o compose usa os
valores padrão.

O Vite lê `apps/web/.env`, nunca o `.env` da raiz. O `apps/web` só enxerga variáveis com
prefixo `VITE_`, e nenhuma delas guarda segredo.

## Banco de dados

O banco é Postgres no Supabase, em dois ambientes na nuvem, `dev` e `prod`. Organização,
projeto e região de cada um estão em `docs/scope-brief.md`, seção 4. Além deles existe o
`local`, que é qualquer Postgres em `localhost`.

As migrações ficam em `apps/api/drizzle` e só mudam por arquivo versionado. Nada se altera
pelo painel. A ordem é sempre esta: `local`, depois `dev`, depois `prod`.

### Os dois comandos

```bash
pnpm --filter @casa/api db:generate -- --name=<nome>   # cria uma migração nova
pnpm --filter @casa/api db:migrate                      # aplica as migrações pendentes
```

Migração escrita à mão, como a do papel `api_app`, nasce com `--custom`:

```bash
pnpm --filter @casa/api db:generate -- --custom --name=<nome>
```

O `drizzle-kit generate` grava os arquivos de `apps/api/drizzle/meta` fora do padrão do
Prettier. Rode `pnpm format` depois de gerar uma migração.

O `db:migrate` roda direto do código, sem build. Ele lê só `process.env`, nunca um arquivo
`.env`. Exporte as variáveis no terminal antes de rodar.

O alvo sai do host da URL:

| Host da URL                           | Alvo    |
| ------------------------------------- | ------- |
| `localhost`, `127.0.0.1`, `::1`       | `local` |
| `aws-0-us-west-2.pooler.supabase.com` | `dev`   |
| `aws-0-sa-east-1.pooler.supabase.com` | `prod`  |

Qualquer outro host é recusado. No `dev` e no `prod`, a porta é `5432`, o modo sessão do
pooler, e a conexão verifica o certificado contra `apps/api/certs/supabase-ca.crt`.

A URL nunca leva a senha. A senha vai em `MIGRATION_DATABASE_PASSWORD`, crua, sem
codificação. URL com senha é recusada.

### Migrar o `local`

```bash
export MIGRATION_DATABASE_URL=postgres://postgres@localhost:54322/postgres
export MIGRATION_DATABASE_PASSWORD=teste-local
pnpm --filter @casa/api db:migrate
```

### Migrar o `dev`

O caminho normal do `dev` é a CI. O workflow `Migrar o dev`, em
`.github/workflows/migrate-dev.yml`, roda a cada push na `main` que altera
`apps/api/drizzle`. Ele também roda à mão, pela aba Actions do GitHub. Ele lê dois segredos
do repositório:

| Segredo                           | O que é                                                     |
| --------------------------------- | ----------------------------------------------------------- |
| `DEV_MIGRATION_DATABASE_URL`      | URL sem senha do pooler do `dev`, como `postgres.<project-ref>` |
| `DEV_MIGRATION_DATABASE_PASSWORD` | senha do `postgres` do `dev`                                |

O workflow não roda em pull request e não tem caminho para o `prod`.

Da sua máquina, o `dev` migra com as mesmas variáveis:

```bash
export MIGRATION_DATABASE_URL=postgres://postgres.<project-ref>@aws-0-us-west-2.pooler.supabase.com:5432/postgres
read -rs MIGRATION_DATABASE_PASSWORD && export MIGRATION_DATABASE_PASSWORD
pnpm --filter @casa/api db:migrate
```

O `read -rs` lê a senha sem mostrá-la e sem gravá-la no histórico do shell.

### Migrar o `prod`

O `prod` migra só da máquina de um morador, nunca da CI. O plano gratuito não faz backup, e
por isso o `db:migrate` exporta o banco inteiro com `pg_dump` antes de migrar.

Antes de migrar o `prod`, instale o `pg_dump` da versão maior 17 ou mais nova. Ele vem no
pacote cliente do PostgreSQL, em https://www.postgresql.org/download/. Confira a versão:

```bash
pg_dump --version
```

Depois:

```bash
export MIGRATION_DATABASE_URL=postgres://postgres.<project-ref>@aws-0-sa-east-1.pooler.supabase.com:5432/postgres
read -rs MIGRATION_DATABASE_PASSWORD && export MIGRATION_DATABASE_PASSWORD
export PROD_DUMP_DIR="$HOME/casa-automatica-exportacoes"
mkdir -p "$PROD_DUMP_DIR"
pnpm --filter @casa/api db:migrate
```

No `prod`, o `db:migrate`:

1. recusa se a entrada padrão não é um terminal;
2. pede que você digite `casa-automatica-prod`, e recusa qualquer outro texto;
3. recusa `PROD_DUMP_DIR` vazia, inexistente ou dentro do repositório;
4. recusa se o `pg_dump` do `PATH` é de versão maior menor que a do servidor;
5. grava a exportação em `$PROD_DUMP_DIR/casa-automatica-prod-<AAAAMMDDTHHMMSSZ>.dump`;
6. só migra se o `pg_dump` saiu com código 0 e o arquivo não está vazio.

Guarde a exportação fora do repositório. Ela tem os dados da casa.

### O papel `api_app`

A primeira migração cria o papel `api_app`, com que a API conecta a partir do M2. Ele
obedece ao Row Level Security e não é dono de nada. A migração não define senha.

A API conecta pelo pooler em modo sessão, na porta `5432`, como `api_app`. No pooler, o
usuário é `api_app.<project-ref>`. Ela nunca conecta como `postgres`.

Passo manual, uma vez em cada ambiente, depois que a migração rodou nele: defina a senha do
`api_app` conectado como `postgres`. Com o `psql`, no `dev`:

```bash
psql "host=aws-0-us-west-2.pooler.supabase.com port=5432 dbname=postgres user=postgres.<project-ref> sslmode=verify-full sslrootcert=apps/api/certs/supabase-ca.crt"
```

Dentro do `psql`:

```
\password api_app
```

O `\password` pede a senha duas vezes e não a grava no histórico. No `prod`, troque o host
por `aws-0-sa-east-1.pooler.supabase.com` e use o `project-ref` do `prod`. A senha do
`api_app` não entra no repositório nem nos segredos do GitHub.

Para conferir, conecte como `api_app.<project-ref>` pelo mesmo host e rode:

```sql
select current_user;
```

### Data API desligada

A API é o único caminho para os dados. A Data API do Supabase fica desligada nos dois
projetos. Para conferir, abra cada projeto no painel do Supabase, vá à página de
configuração da Data API, e veja que ela aparece desligada.

### Postgres de teste

Os testes rodam contra a imagem `supabase/postgres:17.6.1.173`, a mesma versão do `dev`, em
`localhost`. Nenhum teste conecta ao `dev` ou ao `prod`. Suba o container uma vez:

```bash
docker run -d --name casa-postgres-teste -e POSTGRES_PASSWORD=teste-local \
  -p 127.0.0.1:54322:5432 supabase/postgres:17.6.1.173
docker exec casa-postgres-teste pg_isready -U postgres -h localhost
```

O segundo comando responde `accepting connections` quando o banco está pronto. Depois,
exporte as duas variáveis e rode os testes:

```bash
export TEST_DATABASE_URL=postgres://postgres@localhost:54322/postgres
export TEST_DATABASE_PASSWORD=teste-local
pnpm --filter @casa/api test
```

Cada arquivo de teste cria um banco de nome aleatório e o apaga no fim. Para parar e remover
o container:

```bash
docker rm -f casa-postgres-teste
```

O Postgres de teste nunca entra no `docker-compose.yml`. Na CI, o job `verificar` sobe a
mesma imagem como serviço.

### Supabase local

O Supabase local pelo CLI é opcional, para quem quiser. Os testes não o usam, e nada neste
repositório depende dele.

## Passo manual: o `.mcp.json`

O `.mcp.json` real fica fora do repositório. Quem precisar do servidor MCP do Supabase
copia o exemplo e preenche o identificador do projeto:

```bash
cp .mcp.json.example .mcp.json
```

Depois troque `SEU_PROJECT_REF` pelo identificador do projeto no Supabase. O exemplo já vem
com `read_only=true` e sem a feature `branching`.
