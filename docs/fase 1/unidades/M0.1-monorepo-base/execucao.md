> Unidade: `M0.1-monorepo-base` · Marco: `M0` · Trilha: `dividida`
> Estado: aguardando operador
> Executor · Data: `2026-09-12` · Rodada: `2`
> Contrato aprovado em: condutor `2026-09-12` · operador `2026-09-12`

O registro da rodada 2 está no fim deste documento. O que vem abaixo é a rodada 1,
preservada como foi escrita.

# Execução — `M0.1-monorepo-base`

## Veredito do executor

A execução **não fecha o DoD**. O contrato foi implementado ao pé da letra e, ao pé da
letra, ele não constrói. Três defeitos do contrato estão na seção de bloqueios. Dois deles
têm remendo de uma linha cada, já medido. O terceiro não tem remendo que caiba nos limites
que o próprio contrato impõe ao executor.

O repositório está no estado literal do contrato. Nenhum dos remendos foi aplicado.

## O que ficou pronto

O monorepo existe com os quatro pacotes, os nomes, as versões exatas e os scripts que o
contrato fixou. `@casa/shared` exporta `formatCents`, `@casa/api` imprime a linha da API e
sai com 0, `@casa/web` monta a página React e consome `formatCents`. Os três têm teste
passando. ESLint, Prettier, TypeScript em modo `strict` e Vitest estão ligados.

Medido num clone limpo, com os dois remendos da seção de bloqueios aplicados só dentro do
clone descartável:

```
build EXIT=0
lint EXIT=0
typecheck EXIT=0
test EXIT=0
format:check EXIT=1
api ok port=3000 sample=10,99
```

Ou seja: tudo que depende do código desta unidade funciona. O que não fecha é o contrato,
não o código.

## Ambiente medido

| Item | Valor |
| --- | --- |
| Node | `v26.8.2` |
| pnpm | `12.4.1`, instalado pelo script do README |
| `@types/react` e `@types/react-dom` | `19.3.0`, que é a versão que casa com React 19.3.0 |
| `jsdom` | `30.0.1`, a mais nova estável |

As três versões que o contrato deixou em aberto foram fixadas acima. Todas as versões da
tabela do contrato existem no registro e foram instaladas sem troca.

O `pnpm install` não pediu `allowBuilds`. Nenhuma dependência trouxe script de instalação,
então `allowBuilds: {}` ficou vazio como o contrato escreveu.

## Arquivos tocados

```
$ git diff --stat 6759816..HEAD
 .gitignore                          |    9 +
 .mcp.json.example                   |    8 +
 .prettierignore                     |    2 +
 README.md                           |   95 ++
 apps/api/.env.example               |    4 +
 apps/api/eslint.config.js           |    2 +
 apps/api/package.json               |   21 +
 apps/api/src/config.test.ts         |   20 +
 apps/api/src/config.ts              |   28 +
 apps/api/src/index.ts               |    6 +
 apps/api/tsconfig.build.json        |    7 +
 apps/api/tsconfig.json              |    9 +
 apps/web/.env.example               |    2 +
 apps/web/eslint.config.js           |    2 +
 apps/web/index.html                 |   12 +
 apps/web/package.json               |   27 +
 apps/web/src/App.test.tsx           |   10 +
 apps/web/src/App.tsx                |   13 +
 apps/web/src/main.tsx               |   15 +
 apps/web/tsconfig.json              |   12 +
 apps/web/vite.config.ts             |    7 +
 docs/fase 1/estado.md               |    2 +-
 package.json                        |   23 +
 packages/config/eslint.base.js      |    8 +
 packages/config/package.json        |   23 +
 packages/shared/eslint.config.js    |    2 +
 packages/shared/package.json        |   23 +
 packages/shared/src/index.test.ts   |   16 +
 packages/shared/src/index.ts        |   11 +
 packages/shared/tsconfig.build.json |    7 +
 packages/shared/tsconfig.json       |    9 +
 pnpm-lock.yaml                      | 2224 +++++++++++++++++++++++++++++++++++
 pnpm-workspace.yaml                 |    4 +
 prettier.config.js                  |   13 +
 tsconfig.base.json                  |   14 +
 35 files changed, 2689 insertions(+), 1 deletion(-)
```

A lista bate com os arquivos afetados do contrato. `docs/fase 1/estado.md` entra na faixa
por causa do commit `f06bd39`, que é do condutor, não desta execução. `pnpm-lock.yaml` é a
exceção que o próprio contrato previu.

Nenhum arquivo fora da lista foi criado. Em particular, `packages/config/tsconfig.json`,
`packages/config/tsconfig.build.json` e `packages/config/eslint.config.js` **não** foram
criados, porque não estão na lista. É o bloqueio B1.

## Definition of Done

### DoD 1 — Instalação reproduzível

Situação: `atendido`

```
$ pnpm install --frozen-lockfile
Scope: all 5 workspace projects
✓ Lockfile passes supply-chain policies (verified 4m ago)
Lockfile is up to date, resolution step is skipped
Done in 81ms using pnpm v12.4.1
EXIT=0
```

### DoD 2 — Build completo

Situação: `não atendido`

```
$ pnpm -r build
packages/config build$ tsc -p tsconfig.build.json
packages/config build: error TS5058: The specified path does not exist: 'tsconfig.build.json'.
packages/config build: Failed
[ELIFECYCLE] Command failed with exit code 1.
Error: ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL

  × "pnpm recursive run" failed in /home/markinkkkkj/Codes/Casa Automática/
  │ packages/config

EXIT=1
```

Causa: bloqueio B1. Com B1 e B2 remendados, o comando sai com 0 e os três artefatos
existem:

```
$ ls -l apps/api/dist/index.js packages/shared/dist/index.js apps/web/dist/index.html
-rw-r--r-- 1 markinkkkkj markinkkkkj 230 Sep 12 22:23 apps/api/dist/index.js
-rw-r--r-- 1 markinkkkkj markinkkkkj 330 Sep 12 22:23 apps/web/dist/index.html
-rw-r--r-- 1 markinkkkkj markinkkkkj 442 Sep 12 22:23 packages/shared/dist/index.js
```

### DoD 3 — Lint

Situação: `não atendido`, por dependência do B1

Sem `packages/config/eslint.config.js`, o pacote não tem como rodar `eslint .`. Com o
remendo do B1 aplicado:

```
$ pnpm -r lint
packages/config lint$ eslint .
packages/config lint: Done
packages/shared lint$ eslint .
packages/shared lint: Done
apps/api lint$ eslint .
apps/web lint$ eslint .
apps/api lint: Done
apps/web lint: Done
LINT_EXIT=0
```

### DoD 4 — Tipos

Situação: `não atendido`, por dependência do B1 e do B2

Com os dois remendos:

```
$ pnpm -r typecheck
packages/config typecheck$ tsc -p tsconfig.json --noEmit
packages/config typecheck: Done
packages/shared typecheck$ tsc -p tsconfig.json --noEmit
packages/shared typecheck: Done
apps/api typecheck$ tsc -p tsconfig.json --noEmit
apps/web typecheck$ tsc -p tsconfig.json --noEmit
apps/api typecheck: Done
apps/web typecheck: Done
TC_EXIT=0
```

Sem o remendo do B2, `apps/api` reprova assim:

```
apps/api build: src/config.ts(14,33): error TS2503: Cannot find namespace 'NodeJS'.
apps/api build: src/index.ts(4,27): error TS2591: Cannot find name 'process'. Do you need to install type definitions for node? Try `npm i --save-dev @types/node` and then add 'node' to the types field in your tsconfig.
```

### DoD 5 — Testes

Situação: `atendido quanto aos testes`, `não atendido quanto ao comando`

Os três arquivos de teste existem e passam. O comando `pnpm -r test` só chega ao fim com o
remendo do B1, porque `packages/config` precisa do `vitest` e do `--passWithNoTests` que o
contrato fixou.

```
$ pnpm -r test
packages/config test: No test files found, exiting with code 0
packages/config test: Done
packages/shared test$ vitest run
packages/shared test:  RUN  v5.0.0 /home/markinkkkkj/Codes/Casa Automática/packages/shared
packages/shared test:  Test Files  1 passed (1)
packages/shared test:       Tests  3 passed (3)
packages/shared test: Done
apps/api test$ vitest run
apps/web test$ vitest run
apps/api test:  RUN  v5.0.0 /home/markinkkkkj/Codes/Casa Automática/apps/api
apps/web test:  RUN  v5.0.0 /home/markinkkkkj/Codes/Casa Automática/apps/web
apps/api test:  Test Files  1 passed (1)
apps/api test:       Tests  3 passed (3)
apps/api test: Done
apps/web test:  Test Files  1 passed (1)
apps/web test:       Tests  1 passed (1)
apps/web test: Done
TEST_EXIT=0
```

Um arquivo por pacote, como o contrato pede: `apps/api/src/config.test.ts`,
`apps/web/src/App.test.tsx` e `packages/shared/src/index.test.ts`.

### DoD 6 — Formatação

Situação: `não atendido`, sem remendo possível dentro do contrato

```
$ pnpm format:check
Checking formatting...
[warn] .claude/rules/01-papeis.md
[warn] .claude/rules/02-ciclo.md
[warn] .claude/rules/03-artefatos.md
[warn] .claude/rules/04-decisoes.md
[warn] .claude/rules/05-escrita.md
[warn] .claude/skills/conduzir-fase/SKILL.md
[warn] .claude/skills/revisar-entrega/SKILL.md
[warn] .claude/templates/contrato.md
[warn] .claude/templates/execucao.md
[warn] .claude/templates/exploracao.md
[warn] .claude/templates/revisao.md
[warn] CLAUDE.md
[warn] docs/fase 1/backlog.md
[warn] docs/fase 1/dod.md
[warn] docs/fase 1/estado.md
[warn] docs/fase 1/roadmap.md
[warn] docs/fase 1/unidades/M0.1-monorepo-base/contrato.md
[warn] docs/fase 1/unidades/M0.1-monorepo-base/exploracao.md
[warn] docs/fase 1/unidades/M1.1-validar-supabase/exploracao.md
[warn] docs/fase 1/unidades/README.md
[warn] docs/handoff.md
[warn] docs/scope-brief.md
[warn] Code style issues found in 22 files. Run Prettier with --write to fix.
FMT_EXIT=1
```

Nenhum dos 22 arquivos é desta unidade. Todos existiam antes dela. É o bloqueio B3.

Os arquivos que **são** desta unidade passam. A lista acima é o resultado depois de eu ter
formatado `README.md`, `apps/api/src/config.ts`, `pnpm-workspace.yaml` e
`prettier.config.js`, que são meus.

### DoD 7 — A API roda

Situação: `atendido`

```
$ node apps/api/dist/index.js
api ok port=3000 sample=10,99
EXIT=0

$ pnpm --filter @casa/api start
$ node dist/index.js
api ok port=3000 sample=10,99
EXIT=0
```

### DoD 8 — Nenhum pacote fica de fora do `pnpm -r`

Situação: `atendido`

```
$ for p in apps/api apps/web packages/shared packages/config; do node -e '...' "$p" || exit 1; done
os quatro pacotes têm os quatro scripts
EXIT=0
```

O bloco do contrato olha só o `package.json`. Os quatro pacotes declaram os quatro scripts.
O que falta em `packages/config` são os arquivos que os scripts invocam, e isso o bloco não
enxerga. Vale registrar: **este item passa verde num pacote que não constrói**.

### DoD 9 — Erro de tipo dentro de teste reprova

Situação: `atendido`

Com `const x: number = 'texto';` no fim de `packages/shared/src/index.test.ts`:

```
$ pnpm --filter @casa/shared typecheck
$ tsc -p tsconfig.json --noEmit
src/index.test.ts(18,7): error TS2322: Type 'string' is not assignable to type 'number'.
[ELIFECYCLE] Command failed with exit code 2.
EXIT=1
```

Depois de desfazer:

```
$ pnpm --filter @casa/shared typecheck
$ tsc -p tsconfig.json --noEmit
EXIT=0
```

O par de `tsconfig` por pacote faz o que o contrato previu.

### DoD 10 — Árvore limpa depois do build

Situação: `atendido`

Rodado depois de `pnpm install --frozen-lockfile` e do build de `@casa/shared` e
`@casa/web`, que são os que constroem sem remendo:

```
$ ls -d packages/shared/dist apps/web/dist
apps/web/dist
packages/shared/dist

$ git status --porcelain
(fim, 0 linhas)
```

O `.gitignore` cobre `node_modules/`, `dist/` e o `.mcp.json` real, que existe nesta
máquina e não aparece.

### DoD 11 — Nada de segredo nem de configuração local versionada

Situação: `atendido`

```
$ git ls-files | grep -E '(^|/)\.env(\.|$)|(^|/)\.mcp\.json$'
apps/api/.env.example
apps/web/.env.example

$ git ls-files | grep -E '\.env\.example$|\.mcp\.json\.example$'
.mcp.json.example
apps/api/.env.example
apps/web/.env.example
```

Nenhum `.env`, nenhum `.env.local`, nenhum `.mcp.json`. Os três exemplos estão versionados.

### DoD 12 — O exemplo de MCP não carrega o projeto

Situação: `atendido`

```
$ grep -c "omgheudterjqrjunpack" .mcp.json.example
0
$ grep -c "read_only=true" .mcp.json.example
1
```

### DoD 13 — O web não lê variável sem prefixo

Situação: `atendido`

```
$ grep -rn "import.meta.env" apps/web/src
apps/web/src/App.tsx:4:  const apiUrl = import.meta.env.VITE_API_URL ?? '';
```

Uma ocorrência, com prefixo `VITE_`.

### DoD 14 — O README funciona

Situação: `não atendido`

O clone é do repositório local, como manda a alteração de 2026-09-12 do contrato. Precisei
acrescentar `-b unidade/M0.1-monorepo-base` ao comando do DoD, porque `git clone .` sozinho
traz a `main`, e a `main` não tem o código desta unidade.

```
$ git clone -b unidade/M0.1-monorepo-base "$SRC" "$D"
clone em /tmp/tmp.S2dtNt6WXk/ca

$ pnpm install --frozen-lockfile
Done in 217ms using pnpm v12.4.1
real	0m0.286s

$ cp apps/api/.env.example apps/api/.env
$ cp apps/web/.env.example apps/web/.env

$ pnpm -r build && pnpm -r lint && pnpm -r typecheck && pnpm -r test && pnpm format:check
packages/config build$ tsc -p tsconfig.build.json
packages/config build: error TS5058: The specified path does not exist: 'tsconfig.build.json'.
packages/config build: Failed
[ELIFECYCLE] Command failed with exit code 1.
real	0m0.412s
```

No mesmo clone, com os remendos B1 e B2 aplicados só ali dentro:

```
build EXIT=0
lint EXIT=0
typecheck EXIT=0
test EXIT=0
format:check EXIT=1
$ node apps/api/dist/index.js
api ok port=3000 sample=10,99
EXIT=0
```

O passo do `curl` não foi repetido porque o pnpm 12.4.1 já tinha sido instalado por ele no
começo desta execução, e funcionou.

### DoD geral da fase

| # | Situação | Evidência |
| --- | --- | --- |
| A1 | `atendido` | `6759816 docs(M0.1): contrato aprovado` vem antes do commit de código desta unidade, que é o `HEAD` da branch |
| A2 | `atendido` | este documento |
| A3 | `atendido` | o `git diff --stat` acima bate com a lista do contrato |
| A4 | `não verificado` | não pude tocar `docs/fase 1/estado.md`; está fora dos arquivos afetados. Ver B4 |
| A5 | `atendido` | `feat(M0.1): monorepo pnpm com api, web, shared e config`, em pt-BR, com o prefixo da regra 03 |
| B1 | `não atendido` | DoD 2 acima |
| B2 | `não atendido` | DoD 3 acima |
| B3 | `não atendido` | DoD 4 acima. O `tsconfig.base.json` tem `"strict": true` |
| B4 | `não atendido` | DoD 6 acima |
| C1 | `não atendido` | DoD 5 acima. Os testes passam; o comando não fecha |
| C2 | `atendido` | `formatCents` tem três testes, um por exemplo do contrato. `loadConfig` tem três, um por comportamento descrito. `App` tem um, que é o que o contrato pede |
| C3 | `não se aplica` | o contrato não marcou nada como verificação manual |
| C4 | `atendido` | nenhum teste abre rede. Os três são de função pura ou de render em jsdom |
| C5 | `não se aplica` | rodada 1 |
| D1, D2 | `não se aplica` | valem a partir de `M1.4-ci-verificacao` |
| E1 | `atendido` | a varredura só acha nomes de pacote com `token` no `pnpm-lock.yaml`, como `js-tokens@4.0.0` e `@csstools/css-tokenizer`. Nenhum valor real |
| E2 | `atendido` | DoD 11 acima |
| E3 | `atendido` | `apps/api` lê `PORT` e `NODE_ENV`, e os dois estão em `apps/api/.env.example` sem valor e com comentário em pt-BR. `apps/web` lê `VITE_API_URL`, que está em `apps/web/.env.example` do mesmo jeito |
| E4 | `atendido` | DoD 13 acima |
| F1 | `atendido` | `formatCents`, `loadConfig`, `Config`, `App` |
| F2 | `atendido` | documentos e commit em pt-BR |
| F3 | `não se aplica` | vale a partir do M8 |
| G1 a G6 | `não se aplica` | valem a partir de `M1.2` ou depois |
| H1 a H4 | `não se aplica` | valem a partir do M2 |
| I1 | `atendido` | o `README.md` entra no mesmo commit do código, com instalação, variáveis de ambiente e comandos |
| I2 | `atendido` | a seção "Passo manual: o `.mcp.json`" do `README.md` |
| J1 | `não se aplica` | vale a partir de `M1.5` |

## Bloqueios e dúvidas

Quatro. Os três primeiros param o fechamento da unidade.

### B1 — `packages/config` não tem como rodar `build`, `typecheck` nem `lint`

O contrato manda, na tabela de scripts, que `packages/config` rode
`tsc -p tsconfig.build.json` no `build`, `tsc -p tsconfig.json --noEmit` no `typecheck` e
`eslint .` no `lint`. A lista de arquivos afetados dá a `packages/config` só dois arquivos:
`package.json` e `eslint.base.js`. Faltam `tsconfig.json`, `tsconfig.build.json` e
`eslint.config.js`.

Não criei os três porque estão fora da lista de arquivos afetados.

Há um segundo problema embutido, que não some só criando os arquivos: `packages/config` não
tem código TypeScript. O único fonte dele é `eslint.base.js`, que é JavaScript e mora na
raiz do pacote, não em `src/`. Copiar o par de `tsconfig` dos outros pacotes não resolve:

```
$ tsc -p packages/config/tsconfig.build.json
error TS18003: No inputs were found in config file 'tsconfig.build.json'. Specified 'include' paths were '["src/**/*"]' and 'exclude' paths were '["src/**/*.test.ts","src/**/*.test.tsx"]'.
```

O remendo que medi e que deixa `build`, `typecheck` e `lint` verdes sem inventar código:

```jsonc
// packages/config/tsconfig.json
{ "extends": "../../tsconfig.base.json", "files": [] }
```

```jsonc
// packages/config/tsconfig.build.json
{ "extends": "./tsconfig.json", "compilerOptions": { "noEmit": false } }
```

```js
// packages/config/eslint.config.js
import { base } from '@casa/config/eslint';
export default base;
```

Vale notar o que isso significa: o `build` e o `typecheck` de `packages/config` passam a ser
verdes vazios. Eles não checam nada. Se a intenção do contrato era que os quatro scripts em
todos os pacotes garantissem cobertura, aqui a garantia é só aparente. A alternativa
honesta é `packages/config` ter um `src/eslint.ts` de verdade, mas isso é decisão de escopo
e não é minha.

Junto disso, precisei declarar `"vitest": "5.0.0"` em `devDependencies` de
`packages/config`. A tabela de versões do contrato só põe o `vitest` em "cada pacote que tem
teste", e `packages/config` não tem teste. Mas o contrato fixa o script
`vitest run --passWithNoTests` para ele, e o pnpm não expõe o binário de um pacote irmão.
Sem a dependência, o script não roda. Registro como desvio forçado pelo próprio contrato.

### B2 — O `tsconfig.json` fixado pelo contrato não enxerga os tipos do Node

O contrato fixa o conteúdo de `<pacote>/tsconfig.json` e nele não há campo `types`. O
`tsconfig.base.json` também não tem. Com `typescript@6.0.3`, que o contrato fixa, isso
quebra:

```
src/config.ts(14,33): error TS2503: Cannot find namespace 'NodeJS'.
src/index.ts(4,27): error TS2591: Cannot find name 'process'.
```

O `@types/node@26.5.1` está instalado e resolvido. O que mudou é o TypeScript 6: ele parou
de incluir sozinho os pacotes de `node_modules/@types`. Prova:

```
$ tsc -p tsconfig.json --noEmit
src/index.ts(4,27): error TS2591: Cannot find name 'process'.

$ tsc -p tsconfig.json --noEmit --types node
EXIT=0
```

Não é armadilha nova para o contrato inteiro: a exceção de `apps/web` já traz
`"types": ["vite/client"]`, justamente porque o TypeScript 6 exige. A regra geral é que
ficou sem.

Remendo medido, só em `apps/api/tsconfig.json`:

```json
"types": ["node"]
```

`packages/shared` constrói sem isso, porque o código dele não usa nada do Node. O
`@types/node` que o contrato mandou pôr lá continua sem uso.

### B3 — O DoD 6 é inatingível dentro dos limites do contrato

`pnpm format:check` roda `prettier --check .` na raiz. Isso alcança os 22 documentos de
`.claude/`, de `docs/` e o `CLAUDE.md`, todos escritos antes desta unidade e nenhum deles
formatado pelo Prettier. O Prettier reescreve tabela de markdown, e todas essas tabelas usam
`|---|---|` em vez da forma alinhada.

Os dois caminhos que fechariam o item estão fechados para mim:

- Reformatar `docs/` e `.claude/` está na seção "Fora deste contrato".
- Acrescentar `docs/` e `.claude/` ao `.prettierignore` muda um arquivo cujo conteúdo o
  contrato fixa em bloco de código, o que é mudança do que será construído e exige novo
  GATE 1 pela regra 03.

Registro o item como não atendido e devolvo a escolha. As opções que enxergo, com o custo
de cada uma:

- **A** — `.prettierignore` ganha `docs/` e `.claude/`. Custo: uma linha no contrato e um
  GATE 1. Consequência: os documentos nunca entram na checagem de formatação, o que é
  coerente com eles serem escritos à mão por um humano e lidos por um agente.
- **B** — `pnpm format` roda uma vez em todo o repositório e os 22 arquivos entram
  reformatados nesta unidade. Custo: um commit que mexe em documento de outra unidade e no
  `CLAUDE.md`, o que colide com a regra 03 sobre documento aprovado. Consequência: a
  formatação passa a valer para os documentos daqui em diante.
- **C** — `format:check` deixa de ser `prettier --check .` e passa a apontar só para o
  código. Custo: muda a interface que o DoD geral da fase nomeia no item B4.

Recomendação: **A**. É a menor mudança e não toca documento aprovado. Mas a escolha é do
operador, porque muda o que foi aprovado.

### B4 — Não pude fechar o item A4 do DoD da fase

O item A4 pede que o estado em `docs/fase 1/estado.md` bata com o cabeçalho dos documentos
da unidade. `estado.md` não está na lista de arquivos afetados deste contrato, então não
escrevi nele.

Deixei o cabeçalho deste documento como `em revisão`, que é o do molde. Considerando os
bloqueios acima, o estado real é `bloqueada`. Quem ajusta os dois é o condutor.

## Encontrado e não tocado

- **`globals@16.5.0` entrou sem uso.** A tabela de versões do contrato manda pôr `globals`
  em `dependencies` de `packages/config`, e eu pus. O `eslint.base.js` que o contrato fixa
  não importa `globals`. A dependência está lá e não faz nada. Não removi porque o contrato
  fixa a tabela.
- **O DoD 8 dá verde num pacote que não constrói.** O bloco de verificação olha o
  `package.json` e nada mais. Ele confirmou que `packages/config` tem os quatro scripts no
  mesmo dia em que `packages/config` falhava no primeiro deles. Se a intenção era garantir
  que nenhum pacote escapa do `pnpm -r`, o bloco precisa rodar os scripts, não apenas
  contá-los.
- **Conflito de aspas entre dois blocos do contrato.** O contrato escreve
  `pnpm-workspace.yaml` com aspas duplas e os arquivos `.js` com aspas simples. O
  `prettier.config.js`, cujo conteúdo o contrato não fixa, teve que resolver os dois. Pus
  `singleQuote: true` com um `overrides` que devolve aspas duplas para `*.yaml` e `*.yml`.
  Assim os dois blocos do contrato ficam literais. Se o condutor preferir outra saída, o
  arquivo é de uma linha.
- **`apps/api` não usa `--env-file-if-exists` em lugar nenhum do código.** O contrato diz
  que a API lê o `.env` com esse recurso, e no parágrafo seguinte fixa
  `"start": "node dist/index.js"`, sem a flag. Segui a string literal, porque ela está entre
  aspas e porque o `M1.5` vai consumi-la. Documentei a flag no `README.md`, na seção de
  variáveis de ambiente. Se a intenção era a flag dentro do `start`, isso muda o script e
  precisa de GATE 1. Observo que a flag dentro do `start` quebraria o DoD 7 depois do
  `cp apps/api/.env.example apps/api/.env` que o README manda fazer, porque o
  `.env.example` vai sem valor, como manda o item E3 do DoD da fase, e `PORT=` vazio é erro
  em `loadConfig`.
- **`git clone .` do DoD 14 traz a `main`.** A alteração de 2026-09-12 resolveu o problema
  do GitHub, mas não o da branch. O comando precisa de `-b unidade/<id>`.

## Como reverter

```bash
git reset --hard 6759816
rm -rf node_modules apps/*/node_modules packages/*/node_modules
```

O `HEAD` da branch é o único commit de código desta unidade. Nada fora dos arquivos afetados foi
alterado, então o reset devolve o repositório ao estado de antes da execução.

---

> Unidade: `M0.1-monorepo-base` · Marco: `M0` · Trilha: `dividida`
> Estado: em revisão
> Executor · Data: `2026-09-12` · Rodada: `2`
> Contrato aprovado em: condutor `2026-09-12` · operador `2026-09-12`
> Contrato reaberto e reaprovado em 2026-09-12. Base: seção `## Rodada 2` do contrato.

# Execução — `M0.1-monorepo-base`, rodada 2

## Veredito do executor

Os catorze itens do DoD do contrato estão atendidos. Os três defeitos do contrato que
travaram a rodada 1 foram corrigidos no próprio contrato e aplicados aqui. Nenhum remendo
fora do contrato foi usado. Nenhum bloqueio novo.

## O que ficou pronto

A rodada 2 aplicou os dez pontos da tabela `## Rodada 2` do contrato, e nada além deles.
Num clone limpo da branch da unidade, a sequência do `README.md` roda inteira e sai com 0:

```
build EXIT=0
lint EXIT=0
typecheck EXIT=0
test EXIT=0
format:check EXIT=0
api ok port=3000 sample=10,99
```

Mudanças de comportamento observável nesta rodada, duas:

1. `packages/config` roda só `lint`. Ele não constrói nem checa tipos, porque não tem
   TypeScript. O verde vazio da rodada 1 deixou de existir.
2. `loadConfig` aceita `PORT` e `NODE_ENV` vazias e cai nos padrões. É o que o
   `.env.example` produz depois do `cp` que o `README.md` manda fazer.

## Ambiente medido

| Item | Valor |
| --- | --- |
| Node | `v26.8.2` |
| pnpm | `12.4.1` |

O `pnpm install` não pediu `allowBuilds`. A chave continua vazia.

## Arquivos tocados

```
$ git diff --stat 64da99d..HEAD
 .prettierignore                  |  1 +
 README.md                        |  7 ++-----
 apps/api/src/config.test.ts      | 10 ++++++++--
 apps/api/src/config.ts           | 28 +++++++++++++++++-----------
 apps/api/tsconfig.json           |  3 ++-
 packages/config/eslint.config.js |  2 ++
 packages/config/package.json     |  9 +--------
 packages/shared/package.json     |  1 -
 pnpm-lock.yaml                   | 16 ----------------
 prettier.config.js               | 11 +----------
 10 files changed, 34 insertions(+), 54 deletions(-)
```

Dez arquivos, um por linha da tabela `## Rodada 2` do contrato, menos a linha 4, que diz
que `apps/api/package.json` não muda, mais o `pnpm-lock.yaml`, que o contrato manda
acompanhar a remoção das dependências. Nenhum arquivo fora da lista.

## Definition of Done

### DoD 1 — Instalação reproduzível

Situação: `atendido`

```
$ pnpm install --frozen-lockfile
Scope: all 5 workspace projects
✓ Lockfile passes supply-chain policies (verified 12s ago)
Lockfile is up to date, resolution step is skipped
Done in 63ms using pnpm v12.4.1
EXIT=0
```

### DoD 2 — Build completo

Situação: `atendido`

```
$ rm -rf apps/api/dist apps/web/dist packages/shared/dist
$ pnpm -r build
packages/shared build$ tsc -p tsconfig.build.json
packages/shared build: Done
apps/api build$ tsc -p tsconfig.build.json
apps/web build$ tsc -p tsconfig.json --noEmit && vite build
apps/api build: Done
apps/web build: vite v8.3.0 building client environment for production...
apps/web build: ✓ 16 modules transformed.
apps/web build: dist/index.html                  0.33 kB │ gzip:  0.24 kB
apps/web build: dist/assets/index-BTj6aNul.js  219.98 kB │ gzip: 68.79 kB
apps/web build: ✓ built in 170ms
apps/web build: Done
EXIT=0

$ ls -l apps/api/dist/index.js packages/shared/dist/index.js apps/web/dist/index.html
-rw-r--r-- 1 markinkkkkj markinkkkkj 230 Sep 12 22:39 apps/api/dist/index.js
-rw-r--r-- 1 markinkkkkj markinkkkkj 330 Sep 12 22:39 apps/web/dist/index.html
-rw-r--r-- 1 markinkkkkj markinkkkkj 442 Sep 12 22:39 packages/shared/dist/index.js
```

`packages/config` não aparece na saída porque deixou de ter o script `build`. É o ponto 1
da tabela `## Rodada 2`.

### DoD 3 — Lint

Situação: `atendido`

```
$ pnpm -r lint
packages/config lint$ eslint .
packages/config lint: Done
packages/shared lint$ eslint .
packages/shared lint: Done
apps/api lint$ eslint .
apps/web lint$ eslint .
apps/api lint: Done
apps/web lint: Done
EXIT=0
```

Os quatro pacotes rodam `lint`. `packages/config` agora tem o `eslint.config.js` que
faltava.

### DoD 4 — Tipos

Situação: `atendido`

```
$ pnpm -r typecheck
packages/shared typecheck$ tsc -p tsconfig.json --noEmit
packages/shared typecheck: Done
apps/api typecheck$ tsc -p tsconfig.json --noEmit
apps/web typecheck$ tsc -p tsconfig.json --noEmit
apps/api typecheck: Done
apps/web typecheck: Done
EXIT=0
```

`apps/api` passa por causa do `"types": ["node"]`, que é o ponto 3 da tabela.

### DoD 5 — Testes

Situação: `atendido`

```
$ pnpm -r test
Scope: 4 of 5 workspace projects
packages/shared test$ vitest run
packages/shared test:  RUN  v5.0.0 /home/markinkkkkj/Codes/Casa Automática/packages/shared
packages/shared test:  Test Files  1 passed (1)
packages/shared test:       Tests  3 passed (3)
packages/shared test: Done
apps/api test$ vitest run
apps/web test$ vitest run
apps/api test:  RUN  v5.0.0 /home/markinkkkkj/Codes/Casa Automática/apps/api
apps/web test:  RUN  v5.0.0 /home/markinkkkkj/Codes/Casa Automática/apps/web
apps/api test:  Test Files  1 passed (1)
apps/api test:       Tests  4 passed (4)
apps/api test: Done
apps/web test:  Test Files  1 passed (1)
apps/web test:       Tests  1 passed (1)
apps/web test: Done
EXIT=0
```

Um arquivo de teste por pacote de produto: `apps/api/src/config.test.ts`,
`apps/web/src/App.test.tsx` e `packages/shared/src/index.test.ts`. O `Scope: 4 of 5` é
`packages/config` ficando de fora, porque não tem mais o script `test`.

### DoD 6 — Formatação

Situação: `atendido`

```
$ pnpm format:check
$ prettier --check .
Checking formatting...
All matched files use Prettier code style!
EXIT=0
```

O `*.md` no `.prettierignore` e o `prettier.config.js` do contrato fecham o item. Nenhum
documento foi reformatado.

### DoD 7 — A API roda

Situação: `atendido`

```
$ node apps/api/dist/index.js
api ok port=3000 sample=10,99
EXIT=0

$ pnpm --filter @casa/api start
$ node dist/index.js
api ok port=3000 sample=10,99
EXIT=0
```

### DoD 8 — Nenhum pacote fica de fora do `pnpm -r`

Situação: `atendido`

O bloco do contrato, rodado literal:

```
$ bash bloco-do-contrato.sh
build rodou em: apps/api apps/web packages/shared
lint rodou em: apps/api apps/web packages/shared packages/config
typecheck rodou em: apps/api apps/web packages/shared
test rodou em: apps/api apps/web packages/shared
EXIT=0
```

A versão nova executa os scripts. O verde aqui já não convive com um pacote que não
constrói, que era a falha apontada na rodada 1.

### DoD 9 — Erro de tipo dentro de teste reprova

Situação: `atendido`

Com `const x: number = 'texto';` no fim de `packages/shared/src/index.test.ts`:

```
$ pnpm --filter @casa/shared typecheck
$ tsc -p tsconfig.json --noEmit
src/index.test.ts(18,7): error TS2322: Type 'string' is not assignable to type 'number'.
[ELIFECYCLE] Command failed with exit code 2.
EXIT=1
```

Depois de desfazer:

```
$ pnpm --filter @casa/shared typecheck
$ tsc -p tsconfig.json --noEmit
EXIT=0

$ git status --porcelain packages/shared/src/index.test.ts
(fim, 0 linhas)
```

### DoD 10 — Árvore limpa depois do build

Situação: `atendido`

```
$ pnpm install --frozen-lockfile && pnpm -r build
$ ls -d apps/api/dist apps/web/dist packages/shared/dist
apps/api/dist
apps/web/dist
packages/shared/dist

$ git status --porcelain
(fim, 0 linhas)
```

### DoD 11 — Nada de segredo nem de configuração local versionada

Situação: `atendido`

```
$ git ls-files | grep -E '(^|/)\.env(\.|$)|(^|/)\.mcp\.json$'
apps/api/.env.example
apps/web/.env.example

$ git ls-files | grep -E '\.env\.example$|\.mcp\.json\.example$'
.mcp.json.example
apps/api/.env.example
apps/web/.env.example
```

### DoD 12 — O exemplo de MCP não carrega o projeto

Situação: `atendido`

```
$ grep -c "omgheudterjqrjunpack" .mcp.json.example
0
$ grep -c "read_only=true" .mcp.json.example
1
```

### DoD 13 — O web não lê variável sem prefixo

Situação: `atendido`

```
$ grep -rn "import.meta.env" apps/web/src
apps/web/src/App.tsx:4:  const apiUrl = import.meta.env.VITE_API_URL ?? '';
```

### DoD 14 — O README funciona

Situação: `atendido`

Clone do repositório local, na branch da unidade, como manda o item 14:

```
$ git clone -b unidade/M0.1-monorepo-base "$SRC" "$D"
clone em /tmp/tmp.Az0WnScKIH/ca

$ pnpm install --frozen-lockfile
+ eslint 10.10.0
+ prettier 3.9.6
+ typescript 6.0.3
Done in 160ms using pnpm v12.4.1
real	0m0.209s

$ cp apps/api/.env.example apps/api/.env
$ cp apps/web/.env.example apps/web/.env

$ pnpm -r build && pnpm -r lint && pnpm -r typecheck && pnpm -r test && pnpm format:check
apps/api test:  Test Files  1 passed (1)
apps/api test:       Tests  4 passed (4)
apps/web test:  Test Files  1 passed (1)
apps/web test:       Tests  1 passed (1)
$ prettier --check .
Checking formatting...
All matched files use Prettier code style!
real	0m13.084s
SEQ_EXIT=0

$ node apps/api/dist/index.js
api ok port=3000 sample=10,99
EXIT=0
```

A sequência inteira leva treze segundos depois do clone. O passo do `curl` não foi
repetido, porque o pnpm 12.4.1 já está na máquina desde a rodada 1. O clone descartável foi
apagado no fim.

### DoD geral da fase

| # | Situação | Evidência |
| --- | --- | --- |
| A1 | `atendido` | `64da99d docs(M0.1): contrato aprovado, rodada 2` vem antes de `f41eb98 fix(M0.1): rodada 2 de correções` |
| A2 | `atendido` | este documento |
| A3 | `atendido` | o `git diff --stat 64da99d..HEAD` acima bate com a tabela `## Rodada 2` |
| A4 | `fora deste contrato` | a seção "Fora deste contrato" diz que manter `estado.md` é do condutor e que o item A4 não é do executor |
| A5 | `atendido` | `fix(M0.1): rodada 2 de correções`, em pt-BR, com o prefixo da regra 03 para rodada de correção |
| B1 | `atendido` | DoD 1, 2 e 14 acima |
| B2 | `atendido` | DoD 3 acima |
| B3 | `atendido` | DoD 4 acima. O `tsconfig.base.json` tem `"strict": true` |
| B4 | `atendido` | DoD 6 acima |
| C1 | `atendido` | DoD 5 acima |
| C2 | `atendido` | `formatCents` tem 3 testes, um por exemplo do contrato. `loadConfig` tem 4: padrões com ambiente vazio, variáveis presentes sem valor, valores vindos do ambiente, e `PORT` não numérica. `App` tem 1 |
| C3 | `não se aplica` | o contrato não marcou nada como verificação manual |
| C4 | `atendido` | nenhum teste abre rede. Os três são de função pura ou de render em jsdom |
| C5 | `atendido` | a correção do ponto 8 da rodada 2 vem com o teste `usa os padrões quando as variáveis vêm sem valor`, que falhava antes dela: `loadConfig({ PORT: '' })` lançava erro |
| D1, D2 | `não se aplica` | valem a partir de `M1.4-ci-verificacao` |
| E1 | `atendido` | a varredura no diff da rodada 2 não encontrou nada: `GREP_EXIT=1` |
| E2 | `atendido` | DoD 11 acima |
| E3 | `atendido` | `apps/api/src/config.ts` lê `PORT` e `NODE_ENV`, e as duas estão em `apps/api/.env.example` sem valor e com comentário em pt-BR. `apps/web` lê `VITE_API_URL`, que está em `apps/web/.env.example` do mesmo jeito |
| E4 | `atendido` | DoD 13 acima |
| F1 | `atendido` | `formatCents`, `loadConfig`, `Config`, `App` |
| F2 | `atendido` | documentos e commit em pt-BR |
| F3 | `não se aplica` | vale a partir do M8 |
| G1 a G6 | `não se aplica` | valem a partir de `M1.2` ou depois |
| H1 a H4 | `não se aplica` | valem a partir do M2 |
| I1 | `atendido` | o `README.md` muda no mesmo commit da mudança de comportamento de `loadConfig` |
| I2 | `atendido` | a seção "Passo manual: o `.mcp.json`" do `README.md`, intocada nesta rodada |
| J1 | `não se aplica` | vale a partir de `M1.5` |

## Bloqueios e dúvidas

`Nenhum`.

## Encontrado e não tocado

- **`PORT=0` e `PORT=3.5` passam.** O ponto 8 da tabela `## Rodada 2` diz "só valor não
  numérico em `PORT` é erro". Implementei ao pé da letra: a condição de erro é
  `!Number.isFinite(Number(rawPort))`. A rodada 1 rejeitava também `0`, negativo e
  fracionário, e o contrato não mandou manter isso. Consequência observável:
  `loadConfig({ PORT: '0' })` devolve `port: 0`. Se a intenção era manter a exigência de
  inteiro maior que zero, é uma linha e um GATE 1. Não decidi sozinho.
- **O `README.md` saiu da checagem de formatação.** O `*.md` no `.prettierignore` vale para
  todo o repositório, e o `README.md` é `.md`. Ele deixou de ser conferido pelo
  `format:check` junto com os documentos de processo. O contrato fixa o `.prettierignore`
  em bloco de código, então não abri exceção para ele.
- **As três versões que o contrato deixou em aberto continuam as da rodada 1.**
  `@types/react` e `@types/react-dom` em `19.3.0`, e `jsdom` em `30.0.1`. Nada mudou nelas,
  e o `pnpm-lock.yaml` da rodada 2 só perdeu as entradas de `globals`, de `vitest` em
  `packages/config` e de `@types/node` em `packages/shared`.
- **`packages/config` não tem teste nem checagem de tipo.** É consequência aceita da
  decisão do contrato, e está escrita nele. Registro para que ninguém leia o verde de
  `pnpm -r test` como cobertura dos quatro pacotes.

## Como reverter

```bash
git revert f41eb98      # desfaz só a rodada 2
git reset --hard 6759816 && rm -rf node_modules apps/*/node_modules packages/*/node_modules
```

A primeira linha volta ao estado da rodada 1. A segunda desfaz a unidade inteira.
