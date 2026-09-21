> Unidade: `M1.2-ambientes-e-migracoes` · Marco: `M1 · Banco` · Trilha: `dividida`
> Estado: contrato em rascunho
> Explorador: o operador, com Claude Code · Ferramenta: `Claude Code, modelo claude-opus-5` · Data: `2026-09-21`

# Exploração — `M1.2-ambientes-e-migracoes`

## Resumo

1. P3 foi confirmada e piorou. No Supabase, o papel `postgres` tem `BYPASSRLS`. Por isso
   `FORCE ROW LEVEL SECURITY` não o prende. A API precisa de um papel próprio, sem
   `BYPASSRLS` e sem ser dono das tabelas. Uma migração cria esse papel. A senha dele não
   pode ir para o repositório. Isso vira a pergunta PO1.
2. O `drizzle-kit migrate` 0.31.10 sai com código 1 sem imprimir o erro da migração. Sem
   pasta `drizzle`, ele também falha em silêncio. O comando único precisa mostrar o erro.
3. O `pg` 8.23.0 recusa o certificado do pooler do Supabase com `sslmode=require`. O
   `postgres` 3.4.9 aceita o mesmo certificado sem verificar nada.
4. O pooler do `dev` é o `aws-0-us-west-2`. Ele responde por IPv4 de um container sem
   IPv6. A conexão direta dá `Network unreachable`.
5. A documentação oficial do Drizzle já descreve a 1.0, que ainda é `rc`. O `latest` no
   registro é 0.45.2. PO2 pede a escolha.
6. Pelo MCP somente leitura: o `dev` roda Postgres 17.6, e o `postgres` tem `BYPASSRLS`
   na nuvem, igual à imagem. Com a chave publicável, `/rest/v1/<tabela>` devolve
   `503 PGRST002` estável.
7. `select 1` e `pg_dump` passaram pelo pooler do `dev` em modo sessão, de um container
   sem IPv6. Senha com `%` quebra a URL de conexão.
8. Precisam do operador: PO1 a PO5.

## Respostas

### P1 — Versões de `drizzle-orm`, `drizzle-kit` e do driver, e qual driver

**Resposta:** as versões estáveis de hoje são estas.

| Pacote | `latest` | Publicado em | `engines.node` | Tipos |
|---|---|---|---|---|
| `drizzle-orm` | `0.45.2` | 2026-03-27 | não declara | próprios, `./index.d.ts` |
| `drizzle-kit` | `0.31.10` | 2026-03-17 | não declara | próprios |
| `postgres` | `3.4.9` | — | `>=12` | próprios, `types/index.d.ts` |
| `pg` | `8.23.0` | — | `>= 16.0.0` | `@types/pg` `8.23.1` |

Nenhum dos quatro declara versão de TypeScript. O `drizzle-kit` traz TypeScript `^5.6.3` só
como `devDependency`. O repositório usa Node 26 e TypeScript 6.0.3.

Testei os quatro em diretório temporário, com o `tsconfig.base.json` do repositório. O
`tsc` 6.0.3 passa com `skipLibCheck: true`, que é o valor do repositório. Com
`skipLibCheck: false`, as declarações do `drizzle-orm` dão 71 erros. Parte deles fica em
`pg-core` e em `postgres-js`. Então o `typecheck` depende de `skipLibCheck` continuar
ligado.

Existe uma linha 1.0 em `rc` e `beta`. A documentação oficial já fala dela, e isso está
nos achados não previstos.

Comparação dos drivers, só no que muda aqui:

| Ponto | `postgres` 3.4.9 | `pg` 8.23.0 |
|---|---|---|
| Prepared statement | ligado por padrão. `prepare: false` desliga | só quando a consulta tem nome. O Drizzle dá nome só em `.prepare("nome")` |
| Modo transação do pooler | exige `prepare: false` | funciona sem configuração, se ninguém usar `.prepare("nome")` |
| TLS com `sslmode=require` | conecta **sem verificar** o certificado | trata como `verify-full` e **recusa** o certificado do Supabase |
| Qual o `drizzle-kit migrate` usa | o segundo da lista | o primeiro da lista. Com os dois instalados, usa `pg` |
| Página do Drizzle sobre Supabase | usa este driver, com `prepare: false` | não aparece |
| Erro de migração pelo `migrate()` do código | aparece a mensagem do Postgres | não testado |

**Evidência:**
```
$ pnpm view drizzle-orm version dist-tags.latest   # 2026-09-21T00:03:30-03:00
"version": "0.45.2"
$ pnpm view drizzle-kit version  → "0.31.10"
$ pnpm view postgres version engines → "3.4.9", {"node": ">=12"}
$ pnpm view pg version engines → "8.23.0", {"node": ">= 16.0.0"}
$ pnpm view @types/pg version → "8.23.1"
$ pnpm view drizzle-kit@latest devDependencies.typescript → "^5.6.3"
$ pnpm view drizzle-orm time  → "0.45.2": "2026-03-27T17:06:27.140Z"
$ pnpm view drizzle-kit time  → "0.31.10": "2026-03-17T09:31:40.190Z"

$ ./node_modules/.bin/tsc -p tsconfig.json   # probe.ts com pg-core, node-postgres, postgres-js e migrator
tsc exit 0
$ ./node_modules/.bin/tsc -p tsconfig.json --skipLibCheck false | grep -c "error TS"
71
.../drizzle-orm/pg-core/roles.d.ts(7,22): error TS2559 ...
.../drizzle-orm/postgres-js/session.d.ts(55,32): error TS2344 ...
```

`node_modules/postgres/types/index.d.ts`, linhas 65 a 69:
```
   * Enables prepare mode.
   * @default true
   */
  prepare: boolean;
```

`node_modules/drizzle-kit/bin.cjs`, linhas 78876 e 78945: `checkPackage("pg")` vem antes de
`checkPackage("postgres")`. A saída do comando confirma: `Using 'pg' driver for database
querying`.

TLS contra o pooler do `dev`, sem senha. O script está no material bruto.
```
Warning: SECURITY WARNING: The SSL modes 'prefer', 'require', and 'verify-ca' are treated as aliases for 'verify-full'.
pg require -> self-signed certificate in certificate chain
pg verify-full -> self-signed certificate in certificate chain
pg no-verify -> SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string
postgres-js ssl=require -> password authentication failed for user "postgres"

$ openssl s_client -starttls postgres -connect aws-0-us-west-2.pooler.supabase.com:5432
depth=2 ... CN=Supabase Root 2021 CA
Verify return code: 19 (self-signed certificate in certificate chain)
```

A cadeia termina numa CA própria do Supabase, que não está no repositório de confiança do
Node. `https://supabase.com/docs/guides/platform/ssl-enforcement` diz: "To use
`verify-full` you will need to download the Supabase CA certificate for your database".
O certificado sai do painel.

**Confiança:** fato verificado para versões, precedência de driver, TLS e `typecheck`.
Hipótese: o comportamento de prepared statement do `pg` no modo transação. Li o código do
Drizzle, mas não rodei contra o pooler.

### P2 — Endereço e modo do pooler de cada uso

**Resposta:** o achado 3 da `M1.1` continua valendo. A tabela oficial não mudou. O que
mudou desde 2026-09-12 é o projeto: o `dev` agora é outro, em `us-west-2`, e o host do
pooler dele é o `aws-0`.

| Uso | Host e porta | Modo | Por quê |
|---|---|---|---|
| Migração pela CI | `aws-0-us-west-2.pooler.supabase.com:5432` para o `dev` | sessão | runner sem IPv6. DDL e `CREATE ROLE` pedem sessão |
| Migração da máquina de um morador | o mesmo host, porta `5432` | sessão | funciona com ou sem IPv6. A direta só com IPv6 |
| Migração do `prod` | `aws-0-sa-east-1.pooler.supabase.com:5432` | sessão | o mesmo motivo do `dev` |
| API no servidor da casa | `aws-0-sa-east-1.pooler.supabase.com`, porta `5432` ou `6543` | ver PO3 | depende de o guest `casa-automatica` ter IPv6 |

O host do pooler do `prod` veio do operador, lido no diálogo **Connect** do painel do
`prod` em 2026-09-21: `aws-0-sa-east-1.pooler.supabase.com:5432`. Nenhuma ferramenta de
IA conectou ao `prod`. O host não foi sondado daqui.

Para a API, a documentação oficial recomenda o modo sessão num servidor que fica ligado e
não tem IPv6. Com IPv6, recomenda a conexão direta.

**Evidência:** sondagem sem senha, de um container `postgres:17-alpine` na rede padrão do
Docker, que não tem IPv6.
```
$ docker run --rm postgres:17-alpine sh -c 'ip -6 addr show scope global | grep -c inet6; ip -6 route | grep -c default'
0
0
=== aws-0-us-west-2 :5432
psql: error: ... "aws-0-us-west-2.pooler.supabase.com" (54.70.143.232), port 5432 failed: fe_sendauth: no password supplied
=== aws-0-us-west-2 :6543
psql: error: ... port 6543 failed: fe_sendauth: no password supplied
=== aws-1-us-west-2 :5432
psql: error: ... FATAL:  (ENOTFOUND) tenant/user postgres.<ref> not found
=== direct from container
psql: error: connection to server at "db.<ref>.supabase.co" (2600:1f14:...), port 5432 failed: Network unreachable
```

`fe_sendauth: no password supplied` mostra que o pooler achou o projeto e pediu senha. No
`aws-1`, o projeto não existe. O `db.<ref>.supabase.co` só tem registro `AAAA`.

`https://supabase.com/docs/guides/database/connecting-to-postgres` devolveu a mesma tabela
da `M1.1`, com a porta `5432` para sessão e `6543` para transação, os dois por IPv4. Ela
também diz:
```
Shared pooler connections: username is postgres.[PROJECT-REF]
Custom roles through shared pooler: username is [ROLE].[PROJECT-REF]
```

Com a senha, passada por variável de ambiente e não pela URL, o mesmo container
autenticou:
```
ipv6 global: 0
== select 1 (aws-0-us-west-2.pooler.supabase.com:5432)
 ok | current_user | inet_server_port
  1 | postgres     |             5432
exit 0
```

**Confiança:** fato verificado.

### P3 — Papel da migração e papel da API

**Resposta:** a hipótese do condutor está certa. No Supabase ela não basta.

1. A documentação do Postgres diz que superusuário e papel com `BYPASSRLS` sempre ignoram
   o RLS. O dono da tabela também ignora, a não ser que ela tenha `FORCE ROW LEVEL
   SECURITY`.
2. Na imagem oficial do Supabase, `supabase/postgres:17.6.1.173`, o papel `postgres` não
   é superusuário. Ele tem `BYPASSRLS`. Então `FORCE` não o prende. Testei: com `FORCE`,
   `postgres` vê as duas casas.
3. `postgres` tem `CREATEROLE`. Ele cria um papel com `LOGIN` e `NOBYPASSRLS` por SQL.
   Conectado como esse papel, a política vale.
4. `postgres` também cria papel **com** `BYPASSRLS`. Nada no banco impede uma migração
   de dar esse atributo ao papel da API.
5. `postgres` não consegue `SET ROLE` para o papel que criou. Um teste que troca de papel
   na mesma conexão precisa de outro caminho.
6. `CREATE ROLE` é do cluster, não do banco. Criei o papel numa migração e apliquei em dois
   bancos do mesmo Postgres. O segundo falhou com `role "api_app" already exists`.
7. Papel com `LOGIN` e sem senha existe, mas não entra pelo pooler. Senha em migração
   versionada fere o item E1 do DoD.
8. O Drizzle 0.45.2 tem `pgRole()`. A configuração dele aceita só `createDb`, `createRole`
   e `inherit`, sem `login`, senha nem `bypassrls`. O papel da API sai de SQL escrito à mão.

Esta unidade precisa deixar pronto para a `M1.3`:
- o papel da API, criado por migração, com `NOBYPASSRLS` e sem ser dono de nada;
- a forma de o teste local conectar como esse papel;
- a regra de quem é dono das tabelas: o papel que migra.

As opções estão em PO1.

**Evidência:** `https://www.postgresql.org/docs/17/ddl-rowsecurity.html`:
```
Superusers and roles with the BYPASSRLS attribute always bypass the row security system
when accessing a table. Table owners normally bypass row security as well, though a table
owner can choose to be subject to row security with ALTER TABLE ... FORCE ROW LEVEL SECURITY.
If no policy exists for the table, a default-deny policy is used [...]
```

Postgres 17.11 oficial, tabela `s.t` com duas casas e política
`house = current_setting('app.house', true)::int`, `app.house = 1`:
```
                sem FORCE        com FORCE
postgres        casa1,casa2      casa1,casa2    superusuário
owner_role      casa1,casa2      casa1          dono, NOBYPASSRLS
app_role        casa1            casa1          não é dono, NOBYPASSRLS
bypass_role     casa1,casa2      casa1,casa2    BYPASSRLS
app_role sem app.house: count = 0
```

Imagem do Supabase:
```
$ docker exec m12sb psql -U supabase_admin -c "select rolname, rolsuper, rolbypassrls, rolcreaterole, rolcanlogin from pg_roles ..."
    rolname     | rolsuper | rolbypassrls | rolcreaterole | rolcanlogin
 postgres       | f        | t            | t             | t
 service_role   | f        | t            | f             | f
 supabase_admin | t        | t            | t             | t
 authenticated  | f        | f            | f             | f

-- como postgres, tabela com ENABLE e FORCE
 postgres ve | casa1,casa2
ERROR:  permission denied to set role "api_app"
$ psql -U api_app -c "set app.house='1'; select current_user, string_agg(v, ',') ..."
 api_app      | casa1
$ psql -U api_app -c "create role y;"
ERROR:  permission denied to create role
$ psql -U postgres -c "create role x2 login bypassrls;"
CREATE ROLE
```

Migração com `CREATE ROLE api_app LOGIN NOBYPASSRLS NOINHERIT;` aplicada em dois bancos:
```
== m12c  [✓] migrations applied successfully!  exit 0
== m12d  exit 1
$ node mig.mjs   # migrate() do drizzle-orm, mesmo banco m12d
falhou: role "api_app" already exists
```

`https://supabase.com/docs/guides/database/postgres/roles` descreve o `postgres` só como
"The default Postgres role. This has admin privileges." O `BYPASSRLS` não aparece na
página. Ele saiu da imagem.

No `dev` da nuvem, pelo MCP somente leitura, os atributos são os mesmos da imagem:
```
execute_sql: select rolname, rolsuper, rolbypassrls, rolcreaterole, rolcanlogin from pg_roles ...
 postgres                | f | t | t | t
 service_role            | f | t | f | f
 supabase_admin          | t | t | t | t
 authenticated           | f | f | f | f
 authenticator           | f | f | f | t
 supabase_read_only_user | f | t | f | t
```

**Confiança:** fato verificado no Postgres oficial, na imagem do Supabase e no `dev`.

### P4 — Como o comando recebe o ambiente

**Resposta:** o `drizzle-kit migrate` aceita só `--config`. Não tem flag de URL nem de
ambiente. As duas formas funcionam.

- **Um `drizzle.config.ts` que lê a URL de uma variável.** Testado. Sem a variável, o
  arquivo lança erro e o comando sai com código 1.
- **Um arquivo por ambiente, com `--config`.** A documentação oficial mostra
  `drizzle-kit migrate --config=drizzle-dev.config.ts`. Cada arquivo repete `dialect`,
  `schema` e `out`, e a URL continua vindo de variável, porque não pode ir para o repositório.

Nenhum dos dois caminhos põe trava no `prod`. A trava fica em P5.

**Evidência:** binário instalado em diretório temporário:
```
$ ./node_modules/.bin/drizzle-kit --version
drizzle-kit: v0.31.10
drizzle-orm: v0.45.2
$ ./node_modules/.bin/drizzle-kit migrate --help
Usage:
  drizzle-kit migrate [flags]
Flags:
  --config string   Path to drizzle config file
Global flags:
  -h, --help      help for migrate
  -v, --version   version for drizzle-kit

$ DATABASE_URL= ./node_modules/.bin/drizzle-kit migrate
DATABASE_URL ausente
exit 1
```

O comportamento do `migrate`, em
`node_modules/drizzle-orm/pg-core/dialect.js`, linhas 44 a 71:
- cria `drizzle.__drizzle_migrations` se não existir;
- lê só a última linha, por `created_at`;
- aplica numa transação só todas as migrações com data maior;
- **não confere o hash** das migrações já aplicadas.

**Confiança:** fato verificado.

### P5 — Trava do `prod` e exportação antes da migração

**Resposta:** o Drizzle Kit 0.31.10 não tem trava. A página de `migrate` não menciona
confirmação, `--force` nem proteção de ambiente. O `--help` só lista `--config`.

A trava tem que morar num script do repositório ou na CI. As opções estão em PO4.

Exportação: a documentação oficial de backup usa `supabase db dump --db-url` e recomenda a
URL do session pooler. Em "Use the Session pooler connection string by default", isso vale
para quem não tem IPv6. O `supabase db dump` pede Docker.

O `pg_dump` 17.11 da imagem `postgres:17-alpine` exportou o `dev`, que roda 17.6, pelo
pooler em modo sessão. Não precisou do Supabase CLI. O dump completo, sem filtro de schema,
tem 258 KB num banco sem tabela nossa. Isso vem dos schemas do Supabase, como `auth` e
`storage`. O contrato decide o que a exportação do `prod` inclui.

**Evidência:**
```
$ ./node_modules/.bin/drizzle-kit migrate --help   # só --config, ver P4
```
`https://orm.drizzle.team/docs/drizzle-kit-migrate`: a página lista `migrations.table`,
`migrations.schema`, `dbCredentials` e `--config`. Ela não menciona confirmação, `--force`
nem proteção de produção.

`https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore`:
```
supabase db dump --db-url [CONNECTION_STRING] -f roles.sql --role-only
supabase db dump --db-url [CONNECTION_STRING] -f schema.sql
supabase db dump --db-url [CONNECTION_STRING] -f data.sql --use-copy --data-only ...
"Use the Session pooler connection string by default."
```

```
== pg_dump --schema-only --schema=public
pg_dump (PostgreSQL) 17.11
exit 0
-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.11
== pg_dump completo
exit 0
258149 bytes
```

**Confiança:** fato verificado.

### P6 — Como sobe o Postgres local dos testes

**Resposta:**

| Forma | Roda na CI sem rede no teste | Memória ociosa medida | Versão |
|---|---|---|---|
| Imagem oficial `postgres:17-alpine` | sim. Baixa a imagem antes do teste, depois só `localhost` | 25 MiB | 17.11 |
| Serviço do GitHub Actions com a mesma imagem | sim. Serviço em runner Linux, acesso por `localhost` | igual à imagem | igual à imagem |
| Imagem `supabase/postgres:17.6.1.173` | sim, do mesmo jeito | 60 MiB | 17.6, com os papéis do Supabase |
| Supabase CLI, `supabase start` | depende de baixar a pilha antes | não medida | a do CLI |

A imagem oficial e o serviço do Actions são a mesma coisa, com dois jeitos de subir. O
serviço só existe na CI. Na máquina do morador, alguém roda `docker run`.

A imagem do Supabase é a única que reproduz o `postgres` com `BYPASSRLS` e os papéis
`anon`, `authenticated` e `service_role`. Na imagem oficial, `postgres` é superusuário.
Um teste de RLS passa nela pelo motivo errado se conectar como `postgres`. Ver PO5.

Não instalei o Supabase CLI e não medi a pilha dele. A página de início do CLI não fala
de memória nem da quantidade de containers.

O `dev` roda **Postgres 17.6**, em `aarch64`. As três formas chegam à versão maior 17. A
imagem `supabase/postgres:17.6.1.173` chega também à versão menor, 17.6. A
`postgres:17-alpine` está na 17.11.

```
execute_sql: select version(), current_setting('server_version_num') as num, current_user;
PostgreSQL 17.6 on aarch64-unknown-linux-gnu, compiled by gcc (GCC) 15.2.0, 64-bit | 170006 | supabase_read_only_user
```

**Evidência:**
```
$ docker run --rm postgres:17-alpine postgres --version
postgres (PostgreSQL) 17.11
$ docker run --rm postgres:18-alpine postgres --version
postgres (PostgreSQL) 18.6
$ docker stats --no-stream --format '{{.Name}} {{.MemUsage}}' m12pg m12sb
m12pg 25.04MiB / 15.25GiB
m12sb 59.69MiB / 15.25GiB
$ curl -s "https://hub.docker.com/v2/repositories/supabase/postgres/tags?page_size=25&ordering=last_updated"
17.6.1.173 2026-09-16 ...
15.14.1.173 2026-09-16 ...
```
`https://docs.github.com/en/actions/tutorials/use-containerized-services/create-postgresql-service-containers`:
"If your workflows use Docker container actions, job containers, or service containers,
then you must use a Linux runner". Para job direto no runner: "The hostname is
`localhost` or `127.0.0.1`". A CI atual usa `ubuntu-24.04`, em
`.github/workflows/ci.yml`, linha 11.

**Confiança:** fato verificado.

### P7 — Onde vivem as URLs e de onde o comando roda

**Resposta:**

`apps/api/.env.example` hoje tem só `PORT` e `NODE_ENV`. Pelo item E3, entra ali toda
variável que o código lê, sem valor. As candidatas são:
- a URL que a migração usa;
- a URL que a API usa;
- o caminho do certificado da CA do Supabase, se a verificação de TLS entrar;
- a variável de confirmação do `prod`, se a trava for por variável.

Os nomes ficam para o contrato. Segredo é a URL com senha, tanto a da migração quanto a da
API.

Onde a migração roda. As opções estão em PO4.
- **Da CI:** a URL do `dev` e a do `prod` viram segredo do GitHub. O GitHub Environments
  põe revisor obrigatório no job do `prod`. Em repositório público, isso existe no plano
  gratuito. O segredo do Environment só chega ao job depois da aprovação. Dá para impedir
  que quem disparou aprove a si mesmo. Isso conversa com a `M1.6`, que também vai ter job
  com segredo na `main`.
- **Da máquina de um morador:** a URL fica no `.env` local de quem roda. Não pede segredo
  no GitHub nem mudança na proteção da `main`. Não deixa rastro de quem migrou nem quando,
  a não ser o `created_at` da tabela do Drizzle.

A proteção atual da `main` exige PR e CI verde. Ela não muda em nenhum dos dois caminhos.
O que muda com a CI é criar Environments e segredos. Isso é configuração do repositório,
não da `main`.

**Evidência:** `apps/api/.env.example`:
```
# porta HTTP que a API vai usar a partir do M2
PORT=
# modo de execução
NODE_ENV=
```
`README.md`, linhas 153 a 155: "Fora do Docker, nenhum app lê arquivo `.env`. A API lê
`process.env` e nada mais."

`https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments`:
revisores obrigatórios "only available for public repositories" nos planos Free, Pro e
Team. "a job cannot access environment secrets until one of the required reviewers
approves it". "users who initiate a deployment cannot approve the deployment job", quando
a opção está ligada.

**Confiança:** fato verificado para arquivos e documentação. A escolha é do operador.

### P8 — Como o DoD prova a unidade sem o schema da `M1.3`

**Resposta:**

Comando num Postgres local vazio, sem tabela de domínio. Duas descobertas limitam a forma.
- Sem pasta `drizzle` e sem `_journal.json`, o `migrate` sai com código 1 e não diz nada.
  Então o item G1 precisa de pelo menos uma migração.
- `drizzle-kit generate` sem tabela no schema não cria migração: "No schema changes,
  nothing to migrate". `drizzle-kit generate --custom --name=<nome>` cria um `.sql` vazio
  com journal.

Caminhos de prova, para o condutor escolher no contrato:
- a migração que cria o papel da API, se PO1 for por migração. Ela já é entrega desta
  unidade e não é tabela de domínio;
- depois de aplicar, `drizzle.__drizzle_migrations` tem uma linha por migração;
- uma segunda execução sai com código 0 e não acrescenta linha;
- uma migração com erro faz o comando sair com código diferente de 0 e deixa a tabela sem
  a linha nova.

A última prova já rodou aqui: a transação voltou e a tabela ficou com zero linhas.

Data API desligada: sem chave, a resposta não distingue nada. `/rest/v1/` e
`/auth/v1/health` devolvem o mesmo `401 UNAUTHORIZED_MISSING_API_KEY`. O Auth não está
desligado, então a resposta vem do gateway, antes do serviço.

Com a chave publicável do `dev`, lida pelo MCP, a resposta muda. Não registrei a chave aqui.
- `/rest/v1/` responde `401 Secret API key required`, porque a raiz pede chave secreta.
- `/rest/v1/<qualquer tabela>` responde `503 PGRST002`, com `proxy-status: PostgREST`. O
  resultado foi o mesmo em três tentativas.
- `/auth/v1/health` responde `200`. Isso prova que a chave vale.

Ou seja, o PostgREST do `dev` está no ar e não consegue ler o schema. Isso é compatível com
a Data API desligada. A documentação diz só que "none of the auto-generated REST endpoints
respond", sem dar o código HTTP. Não há projeto com a Data API ligada para comparar. Que
o `503 PGRST002` é a assinatura do botão desligado é hipótese.

O painel do `dev` reforça a leitura. Em 2026-09-21, o diálogo **Connect**, aba
**Framework**, mostrava o aviso "Database access requires the Data API. Client library
database queries will not work until the Data API is enabled", com o botão "Enable Data
API". O operador viu o aviso e mandou a captura. O painel diz que a Data API está desligada
no mesmo dia em que o endpoint responde `503 PGRST002`. A prova completa ainda pede ligar o
botão uma vez e ver a resposta mudar.

**Evidência:**
```
$ drizzle-kit migrate            # banco vazio, sem pasta drizzle
[⣷] applying migrations...
exit 1
$ drizzle-kit generate
0 tables
No schema changes, nothing to migrate 😴
$ drizzle-kit generate --custom --name=baseline
[✓] Your SQL migration file ➜ drizzle/0000_baseline.sql 🚀
$ drizzle-kit migrate            # com a migração vazia
[✓] migrations applied successfully!  exit 0
 drizzle | __drizzle_migrations | table | postgres
 id 1 | hash b3cc75fa... | created_at 1789960067852
$ drizzle-kit migrate            # de novo
exit 0 ; count = 1

$ curl -D - https://<ref>.supabase.co/rest/v1/
HTTP/2 401
sb-error-code: UNAUTHORIZED_MISSING_API_KEY
{"message":"No API key found in request","hint":"No `apikey` request header or url param was found."}
$ curl -D - https://<ref>.supabase.co/auth/v1/health
HTTP/2 401
sb-error-code: UNAUTHORIZED_MISSING_API_KEY

$ curl -D - -H "apikey: <chave publicável>" https://<ref>.supabase.co/rest/v1/
HTTP/2 401
sb-error-code: UNAUTHORIZED_INVALID_API_KEY_TYPE
{"message":"Secret API key required","hint":"Only secret API keys can be used for this endpoint."}
$ curl -D - -H "apikey: <chave publicável>" https://<ref>.supabase.co/rest/v1/house
HTTP/2 503
proxy-status: PostgREST; error=PGRST002
{"code":"PGRST002","details":null,"hint":null,"message":"Could not query the database for the schema cache. Retrying."}
$ for i in 1 2 3; do curl ... /rest/v1/house; done
503 503 503
$ curl -D - -H "apikey: <chave publicável>" https://<ref>.supabase.co/auth/v1/health
HTTP/2 200
{"version":"v2.197.0","name":"GoTrue",...}
```

**Confiança:** fato verificado para as respostas. A leitura da resposta como Data API
desligada é hipótese.

## Superfície

| Arquivo ou recurso | Existe hoje | O que muda |
|---|---|---|
| `apps/api/package.json` | sim | ganha `drizzle-orm`, `drizzle-kit`, o driver e um script de migração |
| `apps/api/drizzle.config.ts` | não | nasce |
| `apps/api/drizzle/` | não | nasce com a primeira migração e `meta/_journal.json` |
| `apps/api/src` | sim | talvez um script de migração próprio, se PO4 ou o erro silencioso pedirem |
| `apps/api/.env.example` | sim, com `PORT` e `NODE_ENV` | ganha as variáveis de P7 |
| `pnpm-lock.yaml` | sim | muda com as dependências |
| `pnpm-workspace.yaml` | sim, com `allowBuilds: {}` | nada, se o `esbuild` rodar sem o script. Ver achado 4 |
| `.github/workflows/ci.yml` | sim | ganha o Postgres de teste. Ganha job de migração se PO4 for pela CI |
| `README.md` | sim | ambientes, comando de migração, exportação do `prod`, Supabase local opcional |
| `docker-compose.yml` | sim | nada. O item J1 do DoD proíbe o Postgres ali |
| Papel da API no `dev` e no `prod` | não | nasce por migração. A senha é passo manual, conforme PO1 |
| GitHub Environments e segredos | não | só se PO4 for pela CI |

## Achados não previstos

### 1. O `postgres` do Supabase tem `BYPASSRLS`

A ordem supôs que o risco era o dono das tabelas. No Supabase, o papel que migra ignora o
RLS por atributo, e `FORCE` não muda isso. A API nunca pode conectar como `postgres`.
Sem papel próprio, o critério do roadmap "consulta direta ao Postgres com outra `house`
não retorna linha" não se prova no `dev` nem no `prod`. Evidência em P3.

### 2. `drizzle-kit migrate` esconde o erro

A migração falha, a transação volta, e o comando sai com código 1 sem mostrar a mensagem
do Postgres. O `migrate()` do `drizzle-orm`, chamado por código, mostra a mensagem. Numa
migração do `prod`, isso significa descobrir a falha e não saber por quê. Evidência em P3
e P8.

### 3. `pg` e `postgres` divergem no TLS

Com o mesmo `sslmode=require`, o `pg` recusa a conexão e o `postgres` aceita sem verificar
o certificado. O `pg` avisa que a regra dele muda na versão 9. Três caminhos: baixar a CA
do Supabase e usar `verify-full`, aceitar sem verificar, ou escolher o driver por esse
critério. Isso entra no contrato, porque a URL de cada ambiente depende disso. Evidência
em P1.

### 4. O `pnpm` 12 recusa a instalação por causa do `esbuild`

O `drizzle-kit` puxa três versões do `esbuild`, e cada uma tem `postinstall`. Com a
configuração padrão do `pnpm` 12, o `pnpm add` imprime `ERR_PNPM_IGNORED_BUILDS` e sai com
código 1. Os pacotes ficam instalados e o `drizzle-kit` roda, porque o binário do `esbuild`
vem de um pacote opcional por plataforma.

O repositório tem `allowBuilds: {}` em `pnpm-workspace.yaml`. Não testei se isso muda o
código de saída do `pnpm install --frozen-lockfile` na CI. A `M1.10` trata de instalação
sem script de pacote, então as duas unidades se tocam aqui.
```
Error: ERR_PNPM_IGNORED_BUILDS
  ╰─▶ Ignored build scripts: esbuild@0.18.20, esbuild@0.25.12, esbuild@0.28.2
exit 1
$ ./node_modules/.bin/drizzle-kit --version
drizzle-kit: v0.31.10
```

### 5. A documentação do Drizzle descreve a 1.0, que ainda é `rc`

A página do Drizzle sobre Supabase manda instalar `drizzle-orm@rc` e `drizzle-kit@rc`. O
`latest` do registro é 0.45.2 e 0.31.10. A tag `rc` aponta para `1.0.0-rc.4`, de
2026-06-27.

A página de atualização diz que a 1.0 muda a pasta de migrações: some o `journal.json`, e
cada migração vira uma pasta. Pasta criada na 0.x precisa de `drizzle-kit up`.

A regra 05 exige documentação da versão instalada. Para a 0.x, não achei documentação
versionada. `https://orm.drizzle.team/docs/v0/drizzle-kit-migrate` devolve 404. Ver PO2.

### 6. O `migrate` não confere o hash

O Drizzle decide o que aplicar pela data da última migração, não pelo conteúdo. Uma
migração editada depois de aplicada não é detectada. Isso reforça o item G2 do DoD, que
confere pelo `git diff`, não pelo banco.

### 7. `set` de sessão e o modo transação

A política de teste usou `current_setting('app.house')`. No modo transação do pooler, um
`set` de sessão pode vazar para outra conexão ou sumir. A `M1.3` vai precisar de
`set_config(..., true)` dentro da transação, ou do modo sessão. Registro sem desenhar,
porque RLS é da `M1.3`. Isso é hipótese: não testei contra o pooler.

### 8. Uma tentativa de autenticação falhou no `dev`

No teste de TLS da P1, o driver `postgres` enviou uma senha vazia ao pooler do `dev`. O
Supabase registrou `password authentication failed`. Uma nova sondagem logo depois ainda
recebeu `fe_sendauth: no password supplied`, então o IP não foi bloqueado. Registro porque
a ordem pedia só leitura. Não achei na documentação o limite de tentativas que bloqueia um
IP.

### 9. O relatório bruto de 2026-09-15 não está nesta máquina

Procurei fora do repositório e não achei. Nada deste relatório veio dele.

### 10. O MCP somente leitura ignora o RLS

O MCP conecta como `supabase_read_only_user`, e esse papel tem `BYPASSRLS`. Depois da
`M1.3`, uma ferramenta de IA com o MCP lê as linhas de todas as casas do `dev`. Hoje o
`dev` só vai ter a casa de teste, então nada vaza. Registro porque o `read_only=true`
limita a escrita, não o alcance da leitura. Evidência na P3 e na P6.

### 11. Senha com caractere especial quebra a URL de conexão

A senha do `dev` tem `%`. Colada crua na URL do painel, o `psql` recusa com
`invalid percent-encoded token`, e a mensagem de erro imprime o trecho da senha. Passando
host, porta, usuário e senha em variáveis separadas, a conexão funciona. O contrato
precisa escolher uma das duas regras: a URL de cada ambiente vai com a senha codificada,
ou a senha vai numa variável separada. O `.env.example` e o `README.md` precisam dizer
qual. Nesta exploração, a senha do `dev` apareceu na saída de um comando. O operador troca
a senha.

## Opções

As opções de cada decisão estão nas perguntas ao operador, com custo e consequência.

## Não descoberto

1. **Se `503 PGRST002` é a assinatura da Data API desligada.** Só se prova ligando o botão
   uma vez no `dev` e comparando a resposta.
2. **Se o guest `casa-automatica` tem IPv6.** Decide entre conexão direta e pooler para a
   API. A seção 4 do `docs/scope-brief.md` fala de PPPoE e MTU, não de IPv6.
3. **Memória da pilha do Supabase CLI.** Não instalei.
4. **Limite de tentativas de senha do pooler antes de bloquear o IP.** Não achei na
   documentação.

## Riscos vistos daqui

| Risco | Sinal de que aconteceu |
|---|---|
| A API conecta como `postgres` e o RLS não protege nada | teste de RLS passa local e, no `dev`, uma consulta sem filtro devolve linhas de outra casa |
| Teste de RLS roda como superusuário na imagem oficial | teste verde com política vazia ou errada |
| Migração com `CREATE ROLE` falha no segundo banco de teste do mesmo cluster | `role "..." already exists`, que o `drizzle-kit migrate` esconde |
| Migração falha no `prod` sem mensagem | `exit 1` depois de `applying migrations...` e nada mais |
| `pg` recusa o certificado do Supabase | `self-signed certificate in certificate chain` |
| Prepared statement no modo transação com `postgres` | `prepared statement "..." already exists` |
| `pnpm install` falha na CI por script ignorado | `ERR_PNPM_IGNORED_BUILDS` |
| `pg_dump` mais velho que o servidor | `server version mismatch` |
| Senha com caractere especial crua na URL | `invalid percent-encoded token`, com o trecho da senha na mensagem |
| Migração do `prod` sem exportação | nenhum arquivo de dump com data anterior à linha nova de `__drizzle_migrations` |

## Perguntas ao operador

### PO1 — Como nasce e como entra o papel da API?

Por que importa: sem ele, o RLS da `M1.3` não protege nada, porque o `postgres` tem
`BYPASSRLS`. O contrato precisa dizer quem cria o papel, onde fica a senha, e com qual
papel o teste da `M1.3` conecta.

Opções:
- **A** — migração cria o papel com `LOGIN` e sem senha, e com `IF NOT EXISTS` em bloco
  `DO`. A senha de cada ambiente é passo manual escrito no `README.md`, um
  `ALTER ROLE ... PASSWORD` rodado uma vez por quem tem a senha do `postgres` · custo: um
  passo manual por ambiente, e o `dev` e o `prod` precisam dele antes da API subir ·
  consequência: nenhum segredo no repositório, papel versionado. O teste local define a
  senha no próprio setup.
- **B** — o papel nasce pelo painel ou por SQL manual, fora das migrações · custo: dois
  ambientes que podem divergir sem ninguém ver · consequência: fere o item G1, "nada se
  altera pelo painel". Precisa de exceção escrita.
- **C** — migração cria um papel `NOLOGIN` com as permissões, e um papel de login separado,
  criado à mão, herda dele · custo: dois papéis e um passo manual · consequência: a senha
  roda sem tocar nas permissões. É mais peça do que três moradores precisam hoje.

Recomendação do explorador: A. É a única que versiona o papel e deixa a senha fora do
repositório com um passo só.

### PO2 — Drizzle 0.45 estável ou 1.0 `rc`?

Por que importa: a documentação oficial já descreve a 1.0, e a pasta de migrações muda de
formato entre as duas. Escolher depois custa um `drizzle-kit up` e uma revisão das
migrações.

Opções:
- **A** — `drizzle-orm` 0.45.2 e `drizzle-kit` 0.31.10 · custo: documentação oficial
  escrita para a 1.0, então a regra 05 obriga a conferir tudo nos tipos instalados ·
  consequência: versão marcada como `latest`. Migração para a 1.0 fica para depois.
- **B** — `1.0.0-rc.4` · custo: versão sem tag `latest`, parada desde 2026-06-27 ·
  consequência: documentação e versão batem. Pasta de migrações já no formato novo.

Recomendação do explorador: A, porque a regra de dependência do repositório prefere
versão estável. A troca para a 1.0 vira linha do backlog.

### PO3 — A API no servidor da casa conecta por qual caminho?

Por que importa: define a porta, o modo e a configuração de prepared statement e de RLS
por conexão.

Opções:
- **A** — pooler em modo sessão, porta `5432` · custo: cada conexão aberta da API ocupa um
  cliente do pooler · consequência: `set` de sessão e prepared statement funcionam. É o que
  a documentação recomenda para servidor ligado sem IPv6.
- **B** — pooler em modo transação, porta `6543` · custo: `prepare: false` no `postgres`, e
  a `M1.3` usa `set_config(..., true)` dentro de cada transação · consequência: mais
  clientes por menos conexões, o que a casa não precisa.
- **C** — conexão direta por IPv6 · custo: depende do guest ter IPv6, o que não foi
  verificado · consequência: nenhum pooler no caminho.

Recomendação do explorador: A, até alguém provar IPv6 no guest.

### PO4 — Onde roda a migração do `dev` e do `prod`, e como o `prod` é travado e exportado?

Por que importa: o brief exige exportar o `prod` antes de cada migração, e o Drizzle não
tem trava.

Opções:
- **A** — da máquina de um morador, com um script do repositório. O script recusa o `prod`
  sem uma confirmação explícita, roda `pg_dump` pelo pooler em modo sessão, e só migra se o
  dump terminou · custo: Docker ou `pg_dump` na máquina de quem migra, e a URL do `prod` no
  `.env` local dele · consequência: nada muda no GitHub. Não há registro de quem migrou.
- **B** — pela CI, num job manual com GitHub Environment `prod` e revisor obrigatório. O
  job exporta e guarda o dump como artefato antes de migrar · custo: dois segredos, um
  Environment, e um artefato com dado real guardado no GitHub · consequência: registro de
  quem aprovou. O dump fica num repositório público, como artefato privado do Actions.
- **C** — `dev` pela CI e `prod` da máquina de um morador · custo: os dois caminhos acima,
  pela metade · consequência: o dado real nunca passa pelo GitHub.

Recomendação do explorador: C. O dado real fica fora do GitHub, e o `dev` ganha
automação sem risco.

### PO5 — O Postgres dos testes é a imagem oficial ou a do Supabase?

Por que importa: só a imagem do Supabase reproduz o `postgres` com `BYPASSRLS` e os
papéis do Supabase. A decisão muda o que um teste de RLS verde prova.

Opções:
- **A** — `postgres:17-alpine` · custo: o teste precisa conectar como o papel da API, nunca
  como `postgres`, que ali é superusuário · consequência: 25 MiB e imagem oficial. Não
  reproduz o Supabase.
- **B** — `supabase/postgres` com a versão do `dev` · custo: 60 MiB, imagem maior, e a tag
  acompanha a versão do `dev`, que ainda não foi lida · consequência: o teste vê os mesmos
  papéis e atributos da nuvem.

Recomendação do explorador: B, porque o risco desta unidade é justamente a diferença de
papéis. A tag fica para o contrato, depois de ler a versão do `dev`.

## Material bruto

Tudo em 2026-09-21, na máquina do operador: Arch Linux, Node 26.9.0, pnpm 12.4.1, Docker
29.8.0. Experimentos em diretório temporário fora do repositório, apagado depois.

Script de TLS usado em P1. O `<ref>` vem de `.mcp.json`, que não é versionado.
```js
import pg from "pg";
import postgres from "postgres";
for (const mode of ["require", "verify-full", "no-verify"]) {
  const c = new pg.Client({ connectionString:
    `postgres://postgres.${ref}@aws-0-us-west-2.pooler.supabase.com:5432/postgres?sslmode=${mode}` });
  try { await c.connect(); } catch (e) { console.log("pg", mode, "->", e.message); }
}
const sql = postgres(`postgres://postgres.${ref}@aws-0-us-west-2.pooler.supabase.com:5432/postgres`,
  { ssl: "require", max: 1 });
```

| Fonte | O que devolveu |
|---|---|
| `https://www.postgresql.org/docs/17/ddl-rowsecurity.html` | superusuário e `BYPASSRLS` sempre ignoram, dono ignora sem `FORCE`, sem política nega tudo |
| `https://supabase.com/docs/guides/database/postgres/roles` | `postgres` com "admin privileges", `create role` por SQL |
| `https://supabase.com/docs/guides/database/connecting-to-postgres` | tabela de modos, `[ROLE].[PROJECT-REF]` no pooler, sessão para servidor sem IPv6 |
| `https://supabase.com/docs/guides/platform/ssl-enforcement` | `verify-full` pede a CA do painel |
| `https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore` | `supabase db dump --db-url`, session pooler por padrão, Docker |
| `https://supabase.com/docs/guides/database/hardening-data-api` | endpoints não respondem, sem código HTTP |
| `https://orm.drizzle.team/docs/connect-supabase` | driver `postgres`, `prepare: false`, instala `@rc` |
| `https://orm.drizzle.team/docs/drizzle-kit-migrate` | `--config`, `migrations.table`, `migrations.schema`, nenhuma trava |
| `https://orm.drizzle.team/docs/upgrade-v1` | 1.0 tira o `journal.json` e pede `drizzle-kit up` |
| `https://docs.github.com/en/actions/tutorials/use-containerized-services/create-postgresql-service-containers` | runner Linux, `localhost` |
| `https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments` | revisor obrigatório em repositório público no plano gratuito |
| `https://hub.docker.com/v2/repositories/supabase/postgres/tags` | linhas `17.6.1` e `15.14.1` publicadas em 2026-09-16 |
