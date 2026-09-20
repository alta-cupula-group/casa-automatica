> Unidade: `M1.5-compose-e-caddy` · Marco: `M1 · CI`
> Estado: `fechada`
> Revisor: `condutor` · Ferramenta: `Claude Code, modelo claude-sonnet-5` · Data: `2026-09-20`

# Revisão — `M1.5-compose-e-caddy`

## Veredito

`aprovado`

Todo o DoD do contrato e o DoD geral aplicável estão atendidos e verificados, com evidência
própria do revisor (local e via CI). O item 6 ficou `não verificável` nesta rodada por falta
de Docker funcional na máquina da revisão. Depois de escrita esta seção, o Docker passou a
funcionar nesta mesma máquina (o WSL foi instalado), e o condutor rodou a verificação manual
que faltava — ver a atualização no item 6 abaixo. Todos os itens do DoD estão `atendido`.

## Rodada 1

### DoD do contrato

| # | Item | Veredito | Evidência |
|---|---|---|---|
| 1 | `docker-compose.yml` só declara `api` e `caddy` | atendido | `docker compose config --services` rodado nesta máquina, sem daemon: `api` / `caddy`. Confirmado também no log do passo `smoke-compose` da CI (run `35536651720`, job `106146775993`): `== DoD 1 — o compose só declara api e caddy ==` seguido de `api caddy`. |
| 2 | O stub HTTP responde `200` em qualquer rota, na porta de `PORT` | atendido | `pnpm --filter @casa/api test` rodado por mim: `Test Files 2 passed (2)`, `Tests 6 passed (6)`, incluindo os dois casos de `apps/api/src/index.test.ts`. Testes falharam antes da implementação (ver seção "Testes de comportamento"). |
| 3 | `docker compose up --wait` sobe `api` e `caddy` a `healthy`, sem `DOMAIN`, sem rede externa | atendido | Log da CI, run `35536651720`: `Container casa-automatica-api-1 Healthy` e `Container casa-automatica-caddy-1 Healthy`, sem `DOMAIN` definida no ambiente do job. Não roda localmente: Docker Desktop sem WSL nesta máquina (`docker version` devolve erro 500; `wsl -l -v` diz WSL não instalado). |
| 4 | O web estático responde na raiz do domínio padrão | atendido | Log da CI: `curl -f -s http://localhost/` devolve o `index.html` do build de `apps/web` (`<title>Casa Automática</title>`, script `index-BTj6aNul.js`, mesmo hash do `pnpm -r build` que rodei localmente). |
| 5 | A API responde no subdomínio do mesmo domínio | atendido | Log da CI: o passo `== DoD 5 —...==` roda `test "$(curl ... Host: api.localhost)" = "ok"` sem imprimir erro nem sair; o `set -euo pipefail` do script garante que uma falha ali interromperia o job antes do DoD 9, que rodou até o fim com sucesso. |
| 6 | Trocar o domínio não exige editar `Caddyfile` nem `docker-compose.yml` | atendido | **Atualizado em 2026-09-20, depois que o Docker passou a funcionar nesta máquina (WSL instalado).** O condutor rodou `docker compose up -d --build --wait` sem `DOMAIN` (padrão): os dois containers ficaram `Healthy`, `curl http://localhost/` devolveu o `index.html` do `apps/web`, `curl -H "Host: api.localhost" http://localhost/` devolveu `ok`. Depois, `docker compose down`, e `DOMAIN=casaautomatica.app docker compose up -d --wait`: os dois containers ficaram `Healthy` de novo, sem tocar em nenhum arquivo. `curl -H "Host: casaautomatica.app" http://localhost/` devolveu o mesmo `index.html`, e `curl -H "Host: api.casaautomatica.app" http://localhost/` devolveu `ok`. `docker compose down` seguido de `docker compose ps -a --format '{{.Name}}'` saiu vazio. Confirma que a correção do healthcheck (`${DOMAIN:-localhost}` no `Host`) funciona de ponta a ponta, não só no `docker compose config`. |
| 7 | Soma de `mem_limit` dos dois serviços cabe em `1g` | atendido | `docker compose config` local: `mem_limit: "536870912"` e `mem_limit: "268435456"`, soma `805306368` < `1073741824`. Bate com o log da CI (`servicos_com_mem_limit=2 total_bytes=805306368`). |
| 8 | Nenhum segredo do `.env` real entra na imagem | atendido | Rodei `grep -nE '(COPY\|ADD)[^#]*\.env' apps/api/Dockerfile infra/caddy/Dockerfile` e `grep -nE 'ARG[[:space:]]' apps/api/Dockerfile infra/caddy/Dockerfile`: nenhuma ocorrência nos dois. `.dockerignore` exclui `**/.env` e `**/.env.*`. |
| 9 | `docker compose down` não deixa nada residual | atendido | Log da CI: `Container casa-automatica-caddy-1 Removed`, `Container casa-automatica-api-1 Removed`, `Network casa-automatica_default Removed`, seguido de `docker compose ps -a vazio para o projeto`, e o job terminou com sucesso. |

### DoD geral da fase

| # | Item | Veredito | Evidência |
|---|---|---|---|
| A1 | Commit do contrato aprovado antes do primeiro commit de código | atendido | `git log --oneline d4534d9..HEAD`: `d4534d9 docs(M1.5): contrato aprovado` é o commit-base; o primeiro commit de código depois dele é `3135daf feat(M1.5): ...`. |
| A2 | `execucao.md` traz cada item do DoD com saída real | atendido | Leitura de `execucao.md`: todos os nove itens do DoD do contrato e todos os itens do DoD geral aplicável trazem comando e saída, ou o motivo de `não verificado`. |
| A3 | Diff toca só os arquivos afetados, os documentos da unidade e `estado.md` | atendido | `git diff --stat d4534d9..HEAD` mostra 13 arquivos: os 10 da tabela do contrato, mais `docs/fase 1/estado.md`, `contrato.md` e `execucao.md` da própria unidade. Nenhum arquivo fora dessa lista. |
| A4 | Estado em `estado.md` bate com o cabeçalho de cada documento | atendido | `estado.md` diz `em revisão`; o documento mais recente da unidade, `execucao.md`, também diz `em revisão`. `contrato.md` continua com `Estado: aprovada`, mas isso é o padrão do repositório: conferi `M1.4-ci-verificacao`, unidade fechada, e o `contrato.md` dela também ficou congelado em `aprovada` depois de fechada. O cabeçalho de cada documento registra o estado do momento em que foi escrito, não é atualizado retroativamente. |
| A5 | Commits em pt-BR, com o prefixo da regra 03 | atendido | `git log --oneline d4534d9..HEAD`: `feat(M1.5): ...`, `docs(M1.5): ...`, `fix(M1.5): ...`, todos em pt-BR com prefixo válido. |
| B1 | Instalação e build passam num clone limpo | atendido | Rodei `pnpm install --frozen-lockfile` e `pnpm -r build` no checkout local da branch: `EXIT=0`, `apps/web build: Done`. A CI roda a mesma coisa num clone fresco do Actions e passou (step `Build`, `verificar` bem-sucedido). |
| B2 | Lint passa | atendido | Rodei `pnpm -r lint`: `EXIT=0`, `Done` nos quatro pacotes. |
| B3 | Checagem de tipos passa | atendido | Rodei `pnpm -r typecheck`: `EXIT=0`, `Done` nos três pacotes com `tsconfig` `strict`. |
| B4 | Formatação confere | atendido, com ressalva de máquina | `pnpm format:check` falha nesta máquina (30 arquivos com problema de quebra de linha CRLF/LF do Windows). Reproduzi o mesmo problema num clone limpo no commit `d4534d9`, anterior a qualquer código desta unidade (31 arquivos com o mesmo aviso): não é regressão desta unidade. O passo `Formatação` da CI, rodando em Ubuntu, terminou com sucesso nos dois runs do commit `b726418`. Uso a CI como evidência válida deste item, como o próprio `dod.md` prevê para B1–B4. |
| C1 | A suíte passa | atendido | Rodei `pnpm -r test`: `EXIT=0`, `Test Files 1/2/1 passed`, `Tests 3/6/1 passed` nos três pacotes. |
| C2 | Cada item de comportamento tem teste automatizado | atendido | Item 2 do DoD do contrato: `apps/api/src/index.test.ts`, dois casos, rodei e confirmei. Itens 1, 3, 4, 5, 7, 8, 9: passo `smoke-compose` de `.github/workflows/ci.yml`, lido e conferido linha a linha contra a tabela do DoD, e a saída do log da CI bate com cada `echo` de seção. Item 6: manual, ver DoD 6 acima. |
| C3 | Item não automatizável marcado como manual no contrato | atendido | Item 6 do DoD do contrato diz `verificação manual`. |
| C4 | Nenhum teste acessa rede externa | atendido | `apps/api/src/index.test.ts` só fala com `127.0.0.1` numa porta que o próprio teste descobre livre. Nenhum outro teste do repositório mudou. |
| C5 | Correção de rodada vem com teste que falhava antes | não se aplica | Rodada 1 desta revisão. As duas correções que o executor fez durante a execução (healthcheck do `caddy`) vieram por amendamento do contrato, com novo GATE 1, antes de qualquer rodada de revisão — não é o caso que C5 descreve. |
| D1 | Pipeline verde no último commit da unidade | atendido | `gh pr checks 21`: 2 passed, 0 failed. `gh run list --commit b726418...`: dois runs `CI`, ambos `success`. Job `verificar` dos dois runs (`35536651720` e `35536638090`) com todos os passos, incluindo `smoke-compose`, `success`. |
| D2 | Pipeline roda os mesmos comandos das seções B e C | atendido | Leitura de `.github/workflows/ci.yml`: `pnpm -r build`, `pnpm -r lint`, `pnpm -r typecheck`, `pnpm -r test`, `pnpm format:check`, depois `smoke-compose`. |
| E1 | Nenhum segredo entra no repositório | atendido | Rodei `git diff d4534d9..HEAD \| grep -nEi 'password\|secret\|token\|service_role\|private key\|postgres(ql)?://[^ ]*:[^ ]*@'`: nenhuma ocorrência. |
| E2 | Só `.env.example` é versionado | atendido | `git ls-files \| grep -E '\.env'`: `.env.example`, `apps/api/.env.example`, `apps/web/.env.example`. Nenhum `.env` real. |
| E3 | Toda variável lida aparece no `.env.example`, sem valor e com comentário em pt-BR | atendido | `apps/api/src/config.ts` lê `PORT` e `NODE_ENV`, os dois em `apps/api/.env.example`, sem valor, com comentário em pt-BR. `docker-compose.yml` lê `${DOMAIN:-localhost}` e `${PORT:-3000}`; os dois estão em `.env.example` da raiz, sem valor, com comentário em pt-BR. |
| E4 | `apps/web` só lê variáveis `VITE_` | atendido, por não mudança | `git diff --stat d4534d9..HEAD -- apps/web/src` não devolve nada; a unidade não tocou o código do `apps/web`. |
| F1 | Identificadores em inglês | atendido | Serviços `api`/`caddy`, variáveis `DOMAIN`/`API_PORT`/`PORT`, identificadores de `index.test.ts` em inglês. Nomes de variável do script `smoke-compose` em pt-BR seguem o padrão que os passos anteriores do próprio `ci.yml` já usavam (`base`, `alterados`, `so_documentacao`); não é uma inconsistência introduzida por esta unidade. |
| F2 | Documentos e comentários em pt-BR | atendido | Comentários dos Dockerfiles, `.dockerignore`, `.env.example`, `smoke-compose` e os documentos da unidade, todos em pt-BR. |
| F3 | Texto de interface no arquivo de i18n | não se aplica | Vale a partir do M8. |
| I1 | `README.md` muda no mesmo commit quando muda comando ou variável | atendido | `git diff d4534d9..HEAD -- README.md`: nova seção "Subir a casa inteira com Docker", tabela de variáveis atualizada com `DOMAIN` e `PORT` da raiz, e o novo comportamento do `pnpm --filter @casa/api start` descrito. |
| I2 | Passo manual de operação escrito no `README.md` | atendido | `cp .env.example .env`, `docker compose up --build --wait` e `docker compose down` estão documentados no `README.md`. |
| J1 | `docker-compose.yml` só tem os serviços que o roadmap nomeia | atendido | Ver DoD 1. |

### Escopo

```
$ git diff --stat d4534d9..HEAD
.dockerignore                                      |   6 +
.env.example                                       |   4 +
.github/workflows/ci.yml                           |  50 ++
README.md                                          |  65 ++-
apps/api/Dockerfile                                |  18 +
apps/api/src/index.test.ts                         | 118 +++++
apps/api/src/index.ts                              |  10 +-
docker-compose.yml                                 |  47 ++
docs/fase 1/estado.md                              |   2 +-
.../unidades/M1.5-compose-e-caddy/contrato.md      |  19 +-
.../unidades/M1.5-compose-e-caddy/execucao.md      | 511 +++++++++++++++++++++
infra/caddy/Caddyfile                              |  12 +
infra/caddy/Dockerfile                             |  15 +
13 files changed, 861 insertions(+), 16 deletions(-)
```

Bate com a lista de arquivos afetados do contrato: os dez arquivos da tabela mais
`docs/fase 1/estado.md` (do condutor), `contrato.md` (a própria mudança de `## Alterações`,
com novo GATE 1) e `execucao.md` (o registro do executor). Nenhum arquivo fora dessas três
categorias.

### Regras do repositório

- Código e banco em inglês: `ok`
- Nada assumido fora do brief: `ok` — o domínio, o stub HTTP e a opção de servir `apps/web`
  sem container próprio vêm de decisões já registradas em `exploracao.md` e no próprio
  contrato, com data do operador.
- Nenhum `[A VALIDAR]` tratado como resolvido: `ok` — não há `[A VALIDAR]` aberto em
  `docs/scope-brief.md` que esta unidade toque.
- Cabeçalhos e `estado.md` coerentes: `ok` — ver DoD geral A4 acima.
- Testes de comportamento falharam antes da implementação: `ok` — `execucao.md` mostra
  `pnpm --filter @casa/api test` com `2 failed` em `src/index.test.ts` (`ECONNREFUSED`, o
  binário ainda era o stub antigo que imprime e sai) antes da mudança em `index.ts`.
- Nenhuma dependência ou versão fora do contrato: `ok` — `git diff d4534d9..HEAD` não toca
  nenhum `package.json` nem `pnpm-lock.yaml`. As três imagens de container (`ghcr.io/pnpm/pnpm:12`,
  `caddy:2`, `node 26` via `pnpm runtime set`) são exatamente as da tabela "Dependências novas"
  do contrato, confirmadas no log de build da CI (`ghcr.io/pnpm/pnpm:12@sha256:...`,
  `docker.io/library/caddy:2@sha256:...`, `node 26.9.0`).
- CI verde no último commit, depois de `M1.4-ci-verificacao`: `ok` — `gh pr checks 21`
  e `gh run list --commit b726418...` confirmam `success` nos dois runs do último commit.
- Em unidade de risco, ferramenta ou modelo diferente do executor: `ok` — a unidade não
  muda schema, contrato de API, dinheiro nem pipeline de deploy propriamente dito (o `ci.yml`
  ganha um passo de smoke test, não uma mudança de política de deploy); ainda assim, o
  executor usou `Claude Code, modelo claude-opus-5` e esta revisão usa
  `Claude Code, modelo claude-sonnet-5`, ferramentas iguais e modelos diferentes.

### Correções exigidas

Nenhuma.

### Observações

1. O commit `3135daf feat(M1.5): corrige healthcheck do caddy para variar com DOMAIN` carrega,
   além da correção que o nome descreve, toda a implementação inicial da unidade (os dez
   arquivos do contrato). A mensagem não menciona isso. Não é uma violação de nenhuma regra —
   A5 exige só prefixo e idioma corretos, e os dois estão certos — mas deixa o histórico
   confuso para quem olhar só o `git log` depois. Não é uma correção obrigatória; é um
   apontamento de estilo para o condutor considerar em unidades futuras.
2. Em `execucao.md`, a seção "Encontrado e não tocado" lista como item 4 a "Guarda de build
   nos dois Dockerfiles" (`RUN test -s ...`). Isso não foi "encontrado e não tocado": o
   executor implementou a guarda, motivado pela tabela de riscos do próprio contrato. O rótulo
   da seção está impreciso, mas o conteúdo é factual e a mudança está dentro do que o contrato
   previu na seção "Riscos". Não gera correção.

## GATE 2

- Aprovação técnica: `condutor` em `2026-09-20`
- Veredito do operador: `aprovado` em `2026-09-20`
- Ressalva e destino: nenhuma. O item 6 do DoD, que era verificação manual pendente, foi
  confirmado em 2026-09-20 pelo condutor, com Docker funcional nesta mesma máquina.
  DoD do contrato e DoD geral inteiramente atendidos.
