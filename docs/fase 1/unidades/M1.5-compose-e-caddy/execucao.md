> Unidade: `M1.5-compose-e-caddy` · Marco: `M1 · CI` · Trilha: `dividida`
> Estado: em revisão
> Executor · Ferramenta: `Claude Code, modelo claude-opus-5` · Data: `2026-09-20` · Rodada: `1`
> Contrato aprovado em: condutor `2026-09-20` · operador `2026-09-20`

# Execução — `M1.5-compose-e-caddy`

## O que ficou pronto

`apps/api` deixou de ser um processo que imprime e sai. Ele abre um servidor HTTP com
`node:http`, escuta na porta de `PORT` e responde `200` com o corpo `ok` em qualquer rota.
Nenhuma dependência nova de pacote entrou.

A raiz do repositório ganhou `docker-compose.yml` com dois serviços, `api` e `caddy`, e mais
nada. O `caddy` é construído a partir de `infra/caddy/Dockerfile`, que builda o monorepo num
primeiro estágio, copia `apps/web/dist` para `/srv/web` no segundo e serve os estáticos. O
mesmo Caddy faz `reverse_proxy` para `api` no subdomínio. O `api` é construído a partir de
`apps/api/Dockerfile`, que builda o monorepo e roda `pnpm deploy --filter=@casa/api --prod`
para isolar `@casa/api` e `@casa/shared` sem `apps/web`.

O domínio sai de `DOMAIN`, lida pelo Caddyfile na forma `{$DOMAIN:localhost}`. Sem a variável,
o web responde em `localhost` e a API em `api.localhost`. Com `DOMAIN=casaautomatica.app`,
os dois trocam de domínio sem nenhuma edição de arquivo.

`.env.example` na raiz documenta `DOMAIN` e `PORT`. `.dockerignore` mantém `node_modules`,
`dist`, `.git` e qualquer `.env` fora do contexto de build. O `ci.yml` ganhou o passo
`smoke-compose`, que roda os itens 1, 3, 4, 5, 7, 8 e 9 do DoD deste contrato. O `README.md`
descreve o novo comportamento do `pnpm --filter @casa/api start`, a subida da pilha com
`docker compose` e as variáveis do `.env` da raiz.

## Testes antes da implementação

`apps/api/src/index.test.ts` foi escrito antes de qualquer mudança em `apps/api/src/index.ts`.
O binário em `apps/api/dist` era o da versão anterior, que imprime uma linha e sai.

```
$ pnpm --filter @casa/api test
$ vitest run

 RUN  v5.0.0 C:/casa_automatica/casa-automatica/apps/api

 ❯ src/index.test.ts (2 tests | 2 failed) 73ms
   ❯ servidor HTTP de @casa/api (2)
     × responde 200 com corpo "ok" na raiz, na porta de PORT 9ms
     × responde 200 com corpo "ok" em qualquer outra rota 2ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/index.test.ts > servidor HTTP de @casa/api > responde 200 com corpo "ok" na raiz, na porta de PORT
 FAIL  src/index.test.ts > servidor HTTP de @casa/api > responde 200 com corpo "ok" em qualquer outra rota
Error: connect ECONNREFUSED 127.0.0.1:49675

 Test Files  1 failed | 1 passed (2)
      Tests  2 failed | 4 passed (6)

[ELIFECYCLE] Test failed. See above for more details.
EXIT=1
```

## Arquivos tocados

```
$ git add -A && git diff --cached --stat d4534d9
 .dockerignore              |   6 +++
 .env.example               |   4 ++
 .github/workflows/ci.yml   |  50 +++++++++++++++++++
 README.md                  |  65 ++++++++++++++++++++-----
 apps/api/Dockerfile        |  18 +++++++
 apps/api/src/index.test.ts | 118 +++++++++++++++++++++++++++++++++++++++++++++
 apps/api/src/index.ts      |  10 +++-
 docker-compose.yml         |  51 ++++++++++++++++++++
 infra/caddy/Caddyfile      |  12 +++++
 infra/caddy/Dockerfile     |  15 ++++++
 10 files changed, 335 insertions(+), 14 deletions(-)
```

Os dez arquivos são exatamente os dez da tabela de arquivos afetados do contrato. Nada fora
dela foi tocado. `docs/fase 1/estado.md` não entrou no diff: ele é do condutor, e o contrato
não o lista.

## Limite desta máquina

O daemon do Docker não sobe aqui. O cliente existe, mas o Windows Subsystem for Linux não
está instalado e a VM do Docker Desktop não inicia.

```
$ docker version
Client:
 Version:           29.8.0
 API version:       1.56
 Context:           desktop-linux
request returned 500 Internal Server Error for API route and version http://%2F%2F.%2Fpipe%2FdockerDesktopLinuxEngine/v1.56/version

$ wsl -l -v
O Subsistema do Windows para Linux não está instalado.
```

Por isso os itens de DoD que exigem container em execução entram como `não verificado`.
Os comandos que rodam só no cliente, como `docker compose config`, foram rodados e estão
abaixo. O passo `smoke-compose` do `ci.yml` existe e roda esses itens no runner do GitHub
Actions, mas nenhum commit desta unidade foi criado nem empurrado, então ainda não há
resultado de CI para citar.

## Definition of Done

### DoD 1 — `docker-compose.yml` só declara os serviços `api` e `caddy`
Situação: `atendido`
```
$ docker compose config --services
api
caddy
EXIT=0
```

### DoD 2 — o stub HTTP responde `200` em qualquer rota, na porta de `PORT`
Situação: `atendido`
Teste: `apps/api/src/index.test.ts`, casos `responde 200 com corpo "ok" na raiz, na porta de PORT`
e `responde 200 com corpo "ok" em qualquer outra rota`. O teste sobe o processo com uma porta
livre em `PORT`, espera a linha `api ok port=<porta>` no stdout e faz duas requisições.
```
$ pnpm --filter @casa/api test
$ vitest run

 RUN  v5.0.0 C:/casa_automatica/casa-automatica/apps/api

 Test Files  2 passed (2)
      Tests  6 passed (6)
   Duration  287ms
EXIT=0
```

### DoD 3 — `docker compose up --wait` sobe `api` e `caddy` a `healthy`
Situação: `não verificado`
Motivo: sem daemon do Docker nesta máquina. O comando está no passo `smoke-compose` do
`ci.yml`, na forma `docker compose up -d --build --wait --wait-timeout 300`.

### DoD 4 — o web estático responde na raiz do domínio padrão
Situação: `não verificado`
Motivo: o mesmo do item 3. O `curl -f -s http://localhost/` está no passo `smoke-compose`.

### DoD 5 — a API responde no subdomínio do mesmo domínio
Situação: `não verificado`
Motivo: o mesmo do item 3. O passo `smoke-compose` compara a resposta de
`curl -f -s -H 'Host: api.localhost' http://localhost/` com a string `ok`.

### DoD 6 — trocar o domínio não exige editar `Caddyfile` nem `docker-compose.yml`
Situação: `não verificado`
Motivo: a verificação é manual e precisa dos dois `curl` contra containers em execução.
A evidência parcial que dá para produzir sem daemon é que nenhum dos dois arquivos tem o
domínio em texto fixo e que `DOMAIN` chega ao serviço `caddy` pela variável de ambiente.
```
$ grep -n "casaautomatica" docker-compose.yml infra/caddy/Caddyfile
0 matches for 'casaautomatica'

$ DOMAIN=casaautomatica.app docker compose config | grep -A2 'environment:'
    environment:
      API_PORT: "3000"
      DOMAIN: casaautomatica.app
```

### DoD 7 — o orçamento de memória dos dois serviços soma no máximo `1g`
Situação: `atendido`
```
$ docker compose config | grep -E '^[[:space:]]*mem_limit:'
    mem_limit: "536870912"
    mem_limit: "268435456"

$ docker compose config | awk '<soma dos mem_limit>'
servicos_com_mem_limit=2 total_bytes=805306368
EXIT=0
```
`805306368` bytes contra o teto de `1073741824` bytes.

### DoD 8 — nenhum segredo do `.env` real entra na imagem
Situação: `atendido`
```
$ grep -nE '^[[:space:]]*(COPY|ADD)[^#]*\.env' apps/api/Dockerfile infra/caddy/Dockerfile
grep_exit=1

$ grep -nE '^[[:space:]]*ARG[[:space:]]' apps/api/Dockerfile infra/caddy/Dockerfile
grep_exit=1
```
Código de saída `1` do `grep` quer dizer nenhuma ocorrência. Os dois Dockerfiles não copiam
`.env` nem declaram `ARG`. O `.dockerignore` da raiz também mantém `**/.env` e `**/.env.*`
fora do contexto de build.

### DoD 9 — `docker compose down` não deixa nada residual
Situação: `não verificado`
Motivo: o mesmo do item 3. O passo `smoke-compose` roda `docker compose down` e exige que
`docker compose ps -a --format '{{.Name}}'` saia vazio.

### DoD geral da fase

#### A1 — o commit do contrato aprovado vem antes do primeiro commit de código
Situação: `não verificado`
Nenhum commit de código foi criado. `d4534d9 docs(M1.5): contrato aprovado` é o último commit
da unidade.
```
$ git log --oneline -3
d4534d9 docs(M1.5): contrato aprovado
e225767 docs(M1.5): contrato para aprovação
91a807f docs(M1.5): relatório de exploração
```

#### A2 — `execucao.md` traz cada item do DoD com a saída real do comando
Situação: `atendido`. Este documento.

#### A3 — o diff toca só os arquivos afetados do contrato
Situação: `atendido`. Ver a seção "Arquivos tocados". Dez arquivos, os dez do contrato.

#### A4 — o estado em `estado.md` bate com o cabeçalho dos documentos da unidade
Situação: `não atendido`
`docs/fase 1/estado.md` marca `M1.5-compose-e-caddy` como `aprovada`, e o cabeçalho deste
documento diz `em revisão`, como manda o molde. `estado.md` não está na lista de arquivos
afetados do contrato, então o executor não o alterou. O condutor precisa atualizá-lo.
```
$ grep -n "M1.5-compose-e-caddy" "docs/fase 1/estado.md"
89:| `M1.5-compose-e-caddy` | M1 · CI | dividida | `aprovada` | ...
```

#### A5 — commits em pt-BR com o prefixo da regra 03
Situação: `não verificado`. Nenhum commit foi criado nesta execução.

#### B1 — instalação e build passam
Situação: `atendido` na variante local. O clone limpo a partir do GitHub não foi rodado.
```
$ pnpm install --frozen-lockfile
Done in 9.1s using pnpm v12.4.1

$ pnpm -r build
apps/web build: dist/index.html                  0.34 kB │ gzip:  0.25 kB
apps/web build: dist/assets/index-BTj6aNul.js  219.98 kB │ gzip: 68.79 kB
apps/web build: Done
EXIT=0
```

#### B2 — lint passa
Situação: `atendido`
```
$ pnpm -r lint
packages/config lint: Done
packages/shared lint: Done
apps/web lint: Done
apps/api lint: Done
EXIT=0
```

#### B3 — checagem de tipos passa
Situação: `atendido`
```
$ pnpm -r typecheck
packages/shared typecheck: Done
apps/api typecheck: Done
apps/web typecheck: Done
EXIT=0
```

#### B4 — formatação confere
Situação: `não verificado nesta máquina`
`pnpm format:check` falha aqui por causa das quebras de linha. O git desta máquina está com
`core.autocrlf=true`, e o Prettier usa `endOfLine: "lf"`. A falha não vem desta unidade: um
clone limpo do repositório no commit `d4534d9`, que é o do contrato aprovado e anterior a
qualquer código desta unidade, falha do mesmo jeito.
```
$ git clone -q /c/casa_automatica/casa-automatica <tmp> && cd <tmp> && git log --oneline -1
d4534d9 docs(M1.5): contrato aprovado

$ prettier --check .
[warn] prettier.config.js
[warn] tsconfig.base.json
[warn] Code style issues found in 31 files.
EXIT=1
```
Os arquivos desta unidade, conferidos um a um, passam. O `ci.yml` foi conferido numa cópia
com quebras de linha `LF`, já que o arquivo original veio do repositório com `CRLF`.
```
$ prettier --check docker-compose.yml apps/api/src/index.ts apps/api/src/index.test.ts
Checking formatting...
All matched files use Prettier code style!
EXIT=0

$ prettier --check <copia de ci.yml com LF>
Checking formatting...
All matched files use Prettier code style!
EXIT=0
```

#### C1 — a suíte passa
Situação: `atendido`
```
$ pnpm -r test
packages/shared test:  Test Files  1 passed (1)
packages/shared test:       Tests  3 passed (3)
apps/api test:  Test Files  2 passed (2)
apps/api test:       Tests  6 passed (6)
apps/web test:  Test Files  1 passed (1)
apps/web test:       Tests  1 passed (1)
EXIT=0
```

#### C2 — cada item de comportamento do DoD tem teste automatizado
Situação: `atendido` na escrita, `não verificado` na execução dos itens de container.
O item 2 tem os dois casos de `apps/api/src/index.test.ts`. Os itens 1, 3, 4, 5, 7, 8 e 9 têm
o passo `smoke-compose` de `.github/workflows/ci.yml`, como o contrato define. O item 6 é
verificação manual, declarada assim no próprio contrato.

#### C3 — item não automatizável está marcado como manual no contrato
Situação: `atendido`. O item 6 do DoD do contrato diz `verificação manual`.

#### C4 — nenhum teste acessa rede externa
Situação: `atendido`. `apps/api/src/index.test.ts` sobe um processo local e fala só com
`127.0.0.1`, numa porta que ele mesmo descobre livre. Nenhum outro teste mudou.

#### C5 — correção de rodada vem com teste que falhava antes
Situação: `não se aplica`. Rodada 1.

#### D1 — pipeline verde no último commit da unidade
Situação: `não verificado`. Nenhum commit de código foi criado nem empurrado.

#### D2 — o pipeline roda os mesmos comandos das seções B e C
Situação: `atendido`. O `ci.yml` continua rodando `pnpm -r build`, `pnpm -r lint`,
`pnpm -r typecheck`, `pnpm -r test` e `pnpm format:check`, na mesma ordem, e agora tem o
passo `smoke-compose` depois deles.

#### E1 — nenhum segredo entra no repositório
Situação: `atendido`
```
$ git diff --cached d4534d9 | grep -nEi 'password|secret|token|service_role|private key|postgres(ql)?://[^ ]*:[^ ]*@'
grep_exit=1
```

#### E2 — só `.env.example` é versionado
Situação: `atendido`
```
$ git ls-files --cached | grep -E '\.env'
.env.example
apps/api/.env.example
apps/web/.env.example
```
O `.gitignore` já tinha `.env`, `.env.*` e `!.env.example`, então o `.env.example` novo da
raiz entra e o `.env` real fica de fora.

#### E3 — toda variável lida aparece no `.env.example`, sem valor e com comentário em pt-BR
Situação: `atendido`. `apps/api/src/config.ts` lê `PORT` e `NODE_ENV`, e os dois estão em
`apps/api/.env.example`. O `docker-compose.yml` da raiz lê `DOMAIN` e `PORT`, e os dois estão
no `.env.example` da raiz, sem valor e com comentário em pt-BR.

#### E4 — `apps/web` só lê variáveis `VITE_`
Situação: `atendido` por não mudança. Esta unidade não tocou em `apps/web/src`.

#### F1 — identificadores de código em inglês
Situação: `atendido`. Os serviços são `api` e `caddy`, as variáveis são `DOMAIN`, `API_PORT`
e `PORT`, e os identificadores de `apps/api/src/index.test.ts` são ingleses. O script do passo
`smoke-compose` usa nomes de variável em pt-BR para seguir o que o próprio `ci.yml` já fazia
nos passos anteriores, com `base`, `alterados` e `so_documentacao`.

#### F2 — documentos e comentários em pt-BR
Situação: `atendido`. Comentários dos Dockerfiles, do `.dockerignore`, do `.env.example`, do
passo `smoke-compose` e deste documento estão em pt-BR.

#### F3 — texto de interface no arquivo de i18n
Situação: `não se aplica`. Vale a partir do M8.

#### I1 — o `README.md` muda no mesmo commit quando muda comando ou variável
Situação: `atendido`. O `README.md` descreve o novo comportamento do
`pnpm --filter @casa/api start`, a subida com `docker compose`, o `.env` da raiz e as duas
variáveis novas.

#### I2 — passo manual de operação escrito no `README.md`
Situação: `atendido`. O `cp .env.example .env` e o par `docker compose up --build --wait` e
`docker compose down` estão no `README.md`.

#### J1 — o `docker-compose.yml` só tem os serviços que o roadmap nomeia
Situação: `atendido`. Ver DoD 1.

### CI
Situação: `não verificado`. Nenhum commit desta unidade foi criado nem empurrado, então não
há `run` para citar.

## Correção pontual depois da rodada 1

Data: `2026-09-20`. Origem: a linha de `2026-09-20` da seção `## Alterações` do
`contrato.md`, reaprovada na mesma data. Ela nasceu do achado 1 da seção
"Encontrado e não tocado" abaixo, que fica no documento como registro do que a rodada 1
encontrou.

O que mudou: o healthcheck do serviço `caddy` no `docker-compose.yml`. Ele era
`["CMD", "wget", ..., "http://localhost/"]`, com `Host: localhost` fixo. Passou a ser
`CMD-SHELL` com `--header="Host: $DOMAIN"`, para o teste de saúde acompanhar o domínio em
vez de ficar preso a `localhost`. O resto do bloco não mudou: `interval`, `timeout`,
`retries` e `start_period` continuam iguais. O arquivo passa no Prettier.

```
$ prettier --check docker-compose.yml
Checking formatting...
All matched files use Prettier code style!
fmt_exit=0
```

O item 6 do DoD, a troca de domínio, só faz sentido verificar depois desta correção. Antes
dela, subir a pilha com `DOMAIN=casaautomatica.app` nunca levaria o `caddy` a `healthy`.
Ele continua `não verificado`, porque o daemon do Docker não sobe nesta máquina.

Conferir essa correção levantou uma segunda, também aprovada pelo condutor e registrada na
linha seguinte de `## Alterações`, na mesma data: o `$DOMAIN` do header ganhou valor padrão
e virou `${DOMAIN:-localhost}`. As duas estão no achado 6 de "Encontrado e não tocado", que
já está fechado.

## Bloqueios e dúvidas

Nenhum bloqueio parou a execução. Duas coisas precisam da decisão do condutor antes do
fechamento.

1. Sete itens do DoD dependem de container em execução e não foram verificados nesta máquina,
   porque o daemon do Docker não sobe aqui. São os itens 3, 4, 5, 6 e 9 do contrato, mais D1 e
   a parte de execução do C2 do DoD geral. O passo `smoke-compose` do `ci.yml` cobre 3, 4, 5 e
   9 assim que houver um commit empurrado. O item 6 continua sendo manual e precisa de alguém
   com Docker funcionando.
2. O `estado.md` diz `aprovada` e o cabeçalho deste documento diz `em revisão`. O arquivo é do
   condutor e não está na lista de arquivos afetados, então ficou como estava.

## Encontrado e não tocado

1. **O healthcheck do `caddy` quebra quando `DOMAIN` não é `localhost`.** O contrato fixa o
   teste do healthcheck como `wget --spider http://localhost/` e fixa o Caddyfile com os
   endereços `http://{$DOMAIN:localhost}` e `http://api.{$DOMAIN:localhost}`. Com
   `DOMAIN=casaautomatica.app`, a requisição do healthcheck chega com `Host: localhost`, que
   não casa com nenhum dos dois blocos de site. O Caddy responde `404`, o `wget` sai com código
   diferente de zero e o serviço nunca chega a `healthy`. Implementei os dois exatamente como o
   contrato escreveu e não remendei nada. A consequência prática é que a verificação do item 6
   do DoD tem que subir a pilha com `docker compose up -d`, sem `--wait`, e que `M1.6` vai
   encontrar o mesmo problema no deploy real, onde `DOMAIN` não é `localhost`. Hipótese sobre o
   `404`: ela vem do comportamento documentado do Caddy para requisição sem site correspondente,
   não de teste nesta máquina, porque não deu para rodar container aqui.
2. **O `.env.example` da raiz documenta `PORT` além de `DOMAIN`.** O contrato pediu o arquivo
   para documentar `DOMAIN`. O `docker-compose.yml` que o mesmo contrato fixa lê `${PORT:-3000}`
   para o `API_PORT` do `caddy` e usa `env_file: .env` no `api`, então `PORT` é uma variável que
   a raiz passa a ler. Documentei as duas para não deixar o item E3 do DoD geral com uma variável
   lida e não documentada. Se o condutor achar que isso passa do contrato, é uma linha para
   remover.
3. **Esta máquina não tinha a cadeia de ferramentas do repositório.** Não havia `pnpm` no
   `PATH`, o Node do sistema é `v24.11.0` e o `package.json` da raiz pede `>=26.0.0`, e o
   `corepack 0.34.0` não consegue rodar o `pnpm 12.4.1`, porque a versão 12 é binário nativo e
   o corepack procura um `pnpm.cjs` que não existe mais. Rodei tudo com o lançador
   `bin/pnpm.mjs` do pacote que o corepack baixou, que resolve e usa o binário nativo correto.
   `pnpm --version` respondeu `12.4.1`. Instalação, build, lint, typecheck e testes passaram
   com o Node 24. Nada disso mudou arquivo do repositório, mas o condutor precisa saber que a
   verificação local não rodou no Node 26.
4. **Guarda de build nos dois Dockerfiles.** A tabela de riscos do contrato manda conferir a
   saída do estágio de build antes do `COPY --from=build`. Cada Dockerfile tem uma linha `RUN
   test -s ...` que derruba o build ali mesmo se o artefato não existir: `apps/web/dist/index.html`
   no do Caddy e `/deploy/dist/index.js` no da API.
5. **`pnpm deploy --filter=@casa/api --prod` leva o `dist` junto.** Rodei o comando fora do
   Docker, para casa, e o diretório de destino saiu com `dist/`, `package.json` e um
   `node_modules` com `@casa/shared`. `PORT=3999 node dist/index.js` respondeu
   `api ok port=3999 sample=10,99`. Isso não prova o build da imagem, mas tira a dúvida sobre o
   `deploy` descartar o código compilado.

6. **Sem `DOMAIN` no ambiente, o healthcheck mandava `Host: ` vazio. Fechado.** Quem
   interpola `$DOMAIN` dentro do `docker-compose.yml` é o próprio Compose, no momento de
   resolver o arquivo, e não o shell dentro do container. `CMD-SHELL` não muda isso: a
   string chega ao container já interpolada. Com `DOMAIN` definida, o resultado era o
   esperado. Sem ela, a variável resolvia para string vazia, e o `wget` do healthcheck
   mandava um `Host` vazio, que não casa com o bloco `http://{$DOMAIN:localhost}` do
   Caddyfile. O caminho padrão, que é o do item 3 do DoD e o do passo `smoke-compose` na CI,
   roda justamente sem `DOMAIN`. Era assim que o arquivo resolvia:
   ```
   $ docker compose config
       test:
         - CMD-SHELL
         - 'wget --no-verbose --tries=1 --spider --header="Host: " http://localhost/
           || exit 1'
   ```
   O condutor aprovou a correção na segunda linha da seção `## Alterações` do `contrato.md`,
   de `2026-09-20`: o header passou a usar `${DOMAIN:-localhost}`, a mesma forma que o bloco
   `environment` do próprio serviço `caddy` já usava. Nada mais mudou no arquivo. Ele
   continua passando no Prettier.
   ```
   $ prettier --check docker-compose.yml
   Checking formatting...
   All matched files use Prettier code style!
   fmt_exit=0
   ```
   Os dois casos agora resolvem para um `Host` que casa com um bloco de site do Caddyfile:
   ```
   $ docker compose config
       test:
         - CMD-SHELL
         - 'wget --no-verbose --tries=1 --spider --header="Host: localhost" http://localhost/
           || exit 1'

   $ DOMAIN=casaautomatica.app docker compose config
       test:
         - CMD-SHELL
         - 'wget --no-verbose --tries=1 --spider --header="Host: casaautomatica.app"
           http://localhost/ || exit 1'
   ```
   Isso é resolução do arquivo pelo cliente do Docker, sem daemon. Que o `caddy` chegue mesmo
   a `healthy` continua dependendo de container em execução, e segue `não verificado` aqui.

## Como reverter

```bash
git rm -r --cached docker-compose.yml .dockerignore .env.example apps/api/Dockerfile \
  apps/api/src/index.test.ts infra/caddy
rm -rf infra/caddy docker-compose.yml .dockerignore .env.example apps/api/Dockerfile \
  apps/api/src/index.test.ts
git checkout d4534d9 -- apps/api/src/index.ts .github/workflows/ci.yml README.md
```

Nenhuma migração, nenhum estado externo, nenhum volume. A unidade some com o comando acima.
