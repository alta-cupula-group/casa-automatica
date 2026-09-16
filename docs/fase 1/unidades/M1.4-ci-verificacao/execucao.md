> Unidade: `M1.4-ci-verificacao` · Marco: `M1 · CI` · Trilha: `dividida`
> Estado: em revisão
> Executor · Ferramenta: `Claude Code · modelo claude-opus-5` · Data: `2026-09-15` · Rodada: `2`
> Contrato aprovado em: condutor `2026-09-15` · operador `2026-09-15`

# Execução — `M1.4-ci-verificacao`

## O que ficou pronto

O workflow `CI` roda a cada push em qualquer branch e a cada pull request com alvo na
`main`. O job se chama `verificar` e o check aparece como `CI / verificar`. O primeiro passo
compara os arquivos alterados contra a `main`. Quando todos casam com `docs/**` ou `*.md`, o
job termina verde sem instalar dependência. Em qualquer outro caso ele instala Node 26 e o
pnpm do campo `packageManager`, roda `pnpm install --frozen-lockfile` e depois `pnpm -r build`,
`pnpm -r lint`, `pnpm -r typecheck`, `pnpm -r test` e `pnpm format:check`, nessa ordem.

O `husky` 9.1.7 entrou como `devDependency` da raiz e o script `prepare` o ativa no
`pnpm install`. O hook `.husky/pre-commit` roda `pnpm -r lint && pnpm -r typecheck` e recusa o
commit quando um dos dois falha.

O ruleset `main protegida` está ativo na branch padrão, sem lista de bypass, com as três
regras: `pull_request`, `required_status_checks` com o contexto `verificar` e `non_fast_forward`.

O `README.md` instala o Node antes do pnpm e ganhou a seção "CI, hook e entrega".

Uma coisa do contrato não ficou pronta: a evidência do item 3 do DoD, o atalho de
documentação. Está em Bloqueios, B2. O merge automático do repositório era o bloqueio B1 da
rodada 1, e o condutor o resolveu em 2026-09-15.

## Rodada 2

A revisão reprovou a rodada 1 por causa do item 3 do DoD, marcado como `não verificado`. A
rodada 2 fez três correções:

1. Rodou a evidência do item 3 num pull request de verdade. O resultado divergiu do esperado.
   A explicação e o log estão no item 3 do DoD e no bloqueio B2.
2. Corrigiu a frase errada da rodada 1 sobre o evento `pull_request`. O revisor tem razão: o
   workflow roda em pull request do mesmo repositório mesmo sem o arquivo existir na `main`.
3. Atualizou o bloqueio B1, que deixou de existir.

A rodada 2 não mexeu em código, em configuração do GitHub nem no contrato. Ela só rodou uma
verificação e reescreveu três trechos deste documento.

## Testes antes da implementação

O contrato classifica os itens 1 a 5 e o 7 como verificação manual, e o item 6 como comando.
Não há item de comportamento com teste automatizado nesta unidade, então o que segue é a
verificação de cada item rodada antes de qualquer implementação, mostrando o estado que falha.

Item 1, item 3 e a base do item 2, antes da implementação:

```
$ ls .github/workflows
ls: cannot access '.github/workflows': No such file or directory
codigo de saida: 2

$ gh run list --branch unidade/M1.4-ci-verificacao
(nenhuma execução)

$ gh api repos/alta-cupula-group/casa-automatica/rulesets
[]

$ gh api repos/alta-cupula-group/casa-automatica/branches/main/protection
{"message":"Branch not protected","status":"404"}
codigo de saida: 1

$ gh api repos/alta-cupula-group/casa-automatica --jq .allow_auto_merge
false

$ ls .husky
ls: cannot access '.husky': No such file or directory
codigo de saida: 2

$ git config core.hooksPath
codigo de saida: 1
```

Item 4, antes da implementação. O commit com erro de tipo era aceito:

```
$ printf '\nexport const portaErrada: number = "isto nao e um numero";\n' >> apps/api/src/config.ts
$ git add apps/api/src/config.ts && git commit -m "teste: erro de tipo proposital"
[unidade/M1.4-ci-verificacao eeb3b29] teste: erro de tipo proposital
 1 file changed, 2 insertions(+)
codigo de saida do commit: 0

$ pnpm -r typecheck
apps/api typecheck: src/config.ts(36,14): error TS2322: Type 'string' is not assignable to type 'number'.
codigo de saida do typecheck: 1
```

O commit `eeb3b29` foi desfeito com `git reset --hard 595fc29` logo depois da evidência.

Item 5, antes da implementação. O README da `main` não instalava o Node, e o container parou
no build:

```
$ docker run --rm --network host ubuntu:24.04 bash /readme-antes.sh
+ pnpm install --frozen-lockfile
Done in 2.5s using pnpm v12.4.1
codigo de saida de pnpm install: 0
+ pnpm -r build
packages/shared build: /casa-automatica/node_modules/.bin/tsc: 53: exec: node: not found
packages/shared build: Failed
[ELIFECYCLE] Command failed with exit code 127.
codigo de saida de pnpm -r build: 1
```

Item 7, antes da implementação. O `README.md` não citava CI, hook, `--no-verify` nem pull
request:

```
$ grep -nEi "CI|hook|no-verify|pull request" README.md
26:## Como rodar em cinco minutos
84:O `.mcp.json` real fica fora do repositório. Quem precisar do servidor MCP do Supabase
```

## Arquivos tocados

```
$ git diff --stat 595fc29..HEAD
 .github/workflows/ci.yml | 74 ++++++++++++++++++++++++++++++++++++++++++++++++
 .husky/pre-commit        |  1 +
 README.md                | 41 ++++++++++++++++++++++++++-
 package.json             |  2 ++
 pnpm-lock.yaml           | 10 +++++++
 5 files changed, 127 insertions(+), 1 deletion(-)
```

Mais este `execucao.md`. A lista bate com a do contrato. O `.husky/_` fica fora do
versionamento porque o próprio husky escreve `.husky/_/.gitignore` com `*`.

## Definition of Done

### DoD 1 — workflow roda os cinco comandos num push de branch, termina verde, check `CI / verificar`
Situação: `atendido`

```
$ git rev-parse HEAD
0ab7df09633614434d0dc8998feb8aa6403ab7a7

$ gh run list --branch unidade/M1.4-ci-verificacao
completed	success	feat(M1.4): CI de verificação, hook de pré-commit e README de máquina…	CI	unidade/M1.4-ci-verificacao	push	35034483920	29s	2026-09-15T23:10:51Z

$ gh api repos/alta-cupula-group/casa-automatica/commits/0ab7df09633614434d0dc8998feb8aa6403ab7a7/check-runs --jq '.check_runs[].name, .check_runs[].conclusion'
verificar
success
```

Os cinco comandos no log da execução `35034483920`:

```
$ gh run view 35034483920 --log
verificar	Detectar mudança só de documentação	Arquivos alterados contra a main:
verificar	Detectar mudança só de documentação	.github/workflows/ci.yml
verificar	Detectar mudança só de documentação	.husky/pre-commit
verificar	Detectar mudança só de documentação	README.md
verificar	Detectar mudança só de documentação	package.json
verificar	Detectar mudança só de documentação	pnpm-lock.yaml
verificar	Detectar mudança só de documentação	Mudança só de documentação: false
verificar	Instalar o Node	with:
verificar	Instalar o Node	  node-version: 26
verificar	Instalar as dependências	Run pnpm install --frozen-lockfile
verificar	Instalar as dependências	Done in 2.2s using pnpm v12.4.1
verificar	Build	Run pnpm -r build
verificar	Lint	Run pnpm -r lint
verificar	Checagem de tipos	Run pnpm -r typecheck
verificar	Testes	Run pnpm -r test
verificar	Formatação	Run pnpm format:check
```

### DoD 2 — a `main` recusa push direto e recusa merge com check vermelho
Situação: `atendido`

Push direto:

```
$ git push origin HEAD:main
remote: error: GH013: Repository rule violations found for refs/heads/main.
remote: - Changes must be made through a pull request.
 ! [remote rejected] HEAD -> main (push declined due to repository rule violations)
codigo de saida: 1
```

Ruleset em vigor:

```
$ gh api repos/alta-cupula-group/casa-automatica/rules/branches/main --jq '[.[] | .type]'
["pull_request","required_status_checks","non_fast_forward"]

$ gh api repos/alta-cupula-group/casa-automatica/rulesets/23507008 --jq '{name, enforcement, bypass_actors, current_user_can_bypass, checks: [.rules[] | select(.type=="required_status_checks") | .parameters.required_status_checks[]]}'
{"bypass_actors":[],"checks":[{"context":"verificar","integration_id":15368}],"current_user_can_bypass":"never","enforcement":"active","name":"main protegida"}
```

Pull request com teste quebrado. Branch descartável `teste/ci-vermelho`, com um arquivo
`packages/shared/src/quebrado.test.ts` que falha de propósito, e pull request `#2` com alvo na
`main`:

```
$ gh pr checks 2
verificar	fail	22s	https://github.com/alta-cupula-group/casa-automatica/actions/runs/35035235138/job/104602758241
verificar	fail	27s	https://github.com/alta-cupula-group/casa-automatica/actions/runs/35035239017/job/104602771384
codigo de saida: 1

$ gh pr view 2 --json mergeable,mergeStateStatus,statusCheckRollup
{"checks":[{"conclusion":"FAILURE","name":"verificar"},{"conclusion":"FAILURE","name":"verificar"}],"mergeStateStatus":"BLOCKED","mergeable":"MERGEABLE"}
```

O commit quebrado não ficou em lugar nenhum. O pull request `#2` foi fechado e a branch
apagada:

```
$ gh pr close 2 --delete-branch
✓ Closed pull request alta-cupula-group/casa-automatica#2 (teste: prova de que a main barra merge com check vermelho)
✓ Deleted branch teste/ci-vermelho

$ gh api repos/alta-cupula-group/casa-automatica/branches --jq '.[].name'
main
unidade/M0.1-monorepo-base
unidade/M1.4-ci-verificacao
```

### DoD 3 — pull request que toca só documentação fecha verde sem rodar os cinco comandos
Situação: `não verificado`

A rodada 1 justificou este item com uma frase errada. Ela dizia que o evento `pull_request`
só roda o workflow depois que ele existir na `main`. A revisão desmentiu isso, e os runs
`35035022211` e `35035619690` provam o contrário. Conferi os dois:

```
$ gh run view 35035022211 --json event,headBranch,conclusion,headSha
{"conclusion":"success","event":"pull_request","headBranch":"unidade/M1.4-ci-verificacao","headSha":"0ab7df09633614434d0dc8998feb8aa6403ab7a7"}

$ gh run view 35035619690 --json event,headBranch,conclusion,headSha
{"conclusion":"success","event":"pull_request","headBranch":"unidade/M1.4-ci-verificacao","headSha":"8b12fa5f2737b637d58293d9f878f48efdc8cafd"}

$ git ls-tree -r origin/main --name-only | grep -i workflow
codigo do grep: 1
```

Os dois rodaram pelo evento `pull_request`, no pull request `#1`, com a `main` ainda sem o
arquivo. Em pull request do mesmo repositório, o workflow vem do commit de merge, que já
contém o arquivo da branch. A frase errada foi retirada.

O motivo real é outro, e a rodada 2 o mediu. Está em Bloqueios, B2.

Evidência da rodada 2. Branch descartável `teste/ci-so-docs`, tirada de `8b12fa5`, que já tem
o `.github/workflows/ci.yml`, com um único arquivo novo em `docs/`, e pull request `#4` com
alvo na `main`:

```
$ git diff --name-only origin/main HEAD
.github/workflows/ci.yml
.husky/pre-commit
README.md
docs/fase 1/unidades/M1.4-ci-verificacao/execucao.md
docs/teste-ci-so-docs.md
package.json
pnpm-lock.yaml

$ gh pr create --base main --head teste/ci-so-docs
https://github.com/alta-cupula-group/casa-automatica/pull/4

$ gh run list --branch teste/ci-so-docs
completed	success	teste: prova do atalho de documentação da CI	CI	teste/ci-so-docs	pull_request	35040417139	31s	2026-09-16T00:32:16Z
completed	success	docs: arquivo descartável para provar o atalho de documentação	CI	teste/ci-so-docs	push	35040414486	27s	2026-09-16T00:32:14Z
```

O check fechou verde, mas pelo caminho errado. O passo de detecção viu os sete arquivos, não
um:

```
$ gh run view 35040417139 --log
verificar	Detectar mudança só de documentação	Arquivos alterados contra a main:
verificar	Detectar mudança só de documentação	.github/workflows/ci.yml
verificar	Detectar mudança só de documentação	.husky/pre-commit
verificar	Detectar mudança só de documentação	README.md
verificar	Detectar mudança só de documentação	docs/fase 1/unidades/M1.4-ci-verificacao/execucao.md
verificar	Detectar mudança só de documentação	docs/teste-ci-so-docs.md
verificar	Detectar mudança só de documentação	package.json
verificar	Detectar mudança só de documentação	pnpm-lock.yaml
verificar	Detectar mudança só de documentação	Mudança só de documentação: false
```

As cinco etapas rodaram, o oposto do que o item pede:

```
$ gh api repos/alta-cupula-group/casa-automatica/actions/runs/35040417139/jobs --jq '.jobs[] | {name, conclusion, steps: [.steps[] | {name, conclusion}]}'
{"conclusion":"success","name":"verificar","steps":[{"conclusion":"success","name":"Set up job"},{"conclusion":"success","name":"Clonar o repositório"},{"conclusion":"success","name":"Detectar mudança só de documentação"},{"conclusion":"success","name":"Instalar o Node"},{"conclusion":"success","name":"Instalar o pnpm"},{"conclusion":"success","name":"Instalar as dependências"},{"conclusion":"success","name":"Build"},{"conclusion":"success","name":"Lint"},{"conclusion":"success","name":"Checagem de tipos"},{"conclusion":"success","name":"Testes"},{"conclusion":"success","name":"Formatação"},{"conclusion":"success","name":"Post Instalar o pnpm"},{"conclusion":"success","name":"Post Instalar o Node"},{"conclusion":"success","name":"Post Clonar o repositório"},{"conclusion":"success","name":"Complete job"}]}
```

O pull request de teste foi fechado e a branch apagada:

```
$ gh pr close 4 --delete-branch
✓ Closed pull request alta-cupula-group/casa-automatica#4 (teste: prova do atalho de documentação da CI)
✓ Deleted branch teste/ci-so-docs

$ gh api repos/alta-cupula-group/casa-automatica/branches --jq '.[].name'
docs/estado-m1-4-em-revisao
main
unidade/M0.1-monorepo-base
unidade/M1.4-ci-verificacao
```

O workflow fez o que o contrato manda. O contrato diz que qualquer caminho fora de `docs/**`
e `*.md` roda tudo, e o `.github/workflows/ci.yml` é um desses caminhos. Enquanto a `main` não
tiver o arquivo, todo pull request que carrega o workflow também carrega uma mudança fora dos
dois padrões, e o atalho nunca dispara. O item 3 não é verificável antes do merge. Ver B2.

O que a rodada 1 já tinha verificado é a lógica do passo de detecção, rodada fora do GitHub
Actions com o mesmo corpo de script do workflow, contra commits reais deste repositório:

```
# caso A: commit só de documentação (595fc29, "docs(M1.4): contrato aprovado")
$ bash deteccao.sh 595fc29^ 595fc29
Arquivos alterados contra a main:
docs/fase 1/estado.md
docs/fase 1/unidades/M1.4-ci-verificacao/contrato.md
Mudança só de documentação: true

# caso B: o commit desta unidade, que mexe em código
$ bash deteccao.sh 595fc29 0ab7df0
Arquivos alterados contra a main:
.github/workflows/ci.yml
.husky/pre-commit
README.md
package.json
pnpm-lock.yaml
Mudança só de documentação: false

# caso C: base igual a HEAD, nenhum arquivo alterado
$ bash deteccao.sh 0ab7df0 0ab7df0
Arquivos alterados contra a main:

Nenhum arquivo alterado contra a main. Roda tudo.
so_documentacao=false
```

Isto não é a verificação que o DoD pede. O item continua `não verificado`. A verificação que o
DoD pede fica disponível no primeiro pull request só de documentação aberto depois que o
workflow chegar à `main`.

### DoD 4 — o hook recusa commit com erro de lint ou de tipo, e funciona num clone novo
Situação: `atendido`

Erro de tipo proposital no mesmo arquivo do teste anterior:

```
$ git add apps/api/src/config.ts && git commit -m "teste: erro de tipo proposital"
apps/api typecheck: src/config.ts(36,14): error TS2322: Type 'string' is not assignable to type 'number'.
apps/api typecheck: Failed
[ELIFECYCLE] Command failed with exit code 2.
husky - pre-commit script failed (code 1)
codigo de saida do commit: 1

$ git log --oneline -1
595fc29 docs(M1.4): contrato aprovado
```

O erro foi desfeito com `git checkout -- apps/api/src/config.ts`.

Clone novo, dentro do container `ubuntu:24.04` do item 5, depois de `pnpm install --frozen-lockfile`:

```
$ git config core.hooksPath
.husky/_
codigo de saida de git config core.hooksPath: 0
```

### DoD 5 — uma máquina vazia completa o README
Situação: `atendido`

Container `ubuntu:24.04`, sem Node e sem pnpm, seguindo o README na ordem. O clone usa a
branch da unidade, porque a `main` ainda não tem a mudança do README:

```
$ docker run --rm --network host ubuntu:24.04 bash /readme-depois.sh
+ curl -fsSL https://deb.nodesource.com/setup_26.x | sudo -E bash -
+ sudo apt-get install -y nodejs
+ curl -fsSL https://get.pnpm.io/install.sh | sh -
+ git clone --branch unidade/M1.4-ci-verificacao https://github.com/alta-cupula-group/casa-automatica.git
+ pnpm install --frozen-lockfile
codigo de saida de pnpm install: 0
+ pnpm -r build
packages/shared build: Done
apps/api build: Done
apps/web build: ✓ built in 126ms
apps/web build: Done
codigo de saida de pnpm -r build: 0
+ node --version
v26.8.2
```

Duas ressalvas honestas sobre este container, as duas registradas também em "Encontrado e não
tocado":

1. `curl`, `git`, `ca-certificates` e `sudo` foram instalados antes, como pré-requisitos do
   container. Eles não são passos do README e a imagem `ubuntu:24.04` não os traz.
2. O script de instalação do pnpm precisa da variável `SHELL`. Num `docker run` não
   interativo ela vem vazia e o instalador para com `ERR_PNPM_UNKNOWN_SHELL`. O container roda
   com `SHELL=/bin/bash`. Num terminal de verdade a variável já existe.

### DoD 6 — os cinco comandos passam localmente depois da mudança
Situação: `atendido`

```
$ pnpm -r build && pnpm -r lint && pnpm -r typecheck && pnpm -r test && pnpm format:check
packages/shared test:  Test Files  1 passed (1)
apps/api test:  Test Files  1 passed (1)
apps/web test:  Test Files  1 passed (1)
$ prettier --check .
Checking formatting...
All matched files use Prettier code style!
codigo de saida: 0
```

Na primeira rodada o `pnpm format:check` reprovou o `.github/workflows/ci.yml`. O arquivo foi
formatado com `prettier --write` antes do commit.

### DoD 7 — o `README.md` descreve a CI, o hook, o `--no-verify` e o fluxo de entrega
Situação: `atendido`

A seção "CI, hook e entrega" do `README.md` descreve os quatro pontos. O fluxo de entrega está
lá em três linhas, com `gh pr create --fill && gh pr merge --squash --auto`.

```
$ grep -nE "CI / verificar|--no-verify|pnpm -r lint && pnpm -r typecheck|gh pr merge --squash --auto" README.md
76:job se chama `verificar`, e o check que aparece no pull request se chama `CI / verificar`. Ele
83:`CI / verificar` verde.
88:pnpm -r lint && pnpm -r typecheck
91:Commit com erro de lint ou de tipo é recusado na sua máquina. `git commit --no-verify` pula o
100:gh pr create --fill && gh pr merge --squash --auto
```

A verificação do item é a leitura da seção "CI, hook e entrega" do `README.md`.

### DoD geral da fase

| # | Situação | Evidência |
|---|---|---|
| A1 | `atendido` | `git log --oneline 595fc29~1..HEAD` mostra `595fc29 docs(M1.4): contrato aprovado` antes de `0ab7df0 feat(M1.4): ...` |
| A2 | `atendido` | este documento |
| A3 | `atendido` | o `git diff --stat` acima lista os cinco arquivos do contrato. `estado.md` não foi tocado, porque é do condutor |
| A4 | `não verificado` | o cabeçalho deste documento diz `em revisão`. Quem atualiza `estado.md` é o condutor |
| A5 | `atendido` | `git log --oneline` mostra `docs(M1.4)` e `feat(M1.4)`, em pt-BR |
| B1 | `atendido` | o container do DoD 5 fez clone, `pnpm install --frozen-lockfile` e `pnpm -r build` com código 0. O clone foi da branch da unidade, não da `main` |
| B2, B3, B4, C1 | `atendido` | DoD 6 |
| C2 | `não se aplica` | o contrato classifica todos os itens de comportamento como verificação manual. A unidade não cria código de produto |
| C3 | `atendido` | o contrato marca os itens 1 a 5 e o 7 como verificação manual, com a evidência esperada em cada linha |
| C4 | `atendido` | a unidade não cria nem altera teste. A suíte é a mesma de `M0.1` |
| D1 | `atendido` para o commit `0ab7df0` | `gh run list` acima mostra `completed success`. O commit deste `execucao.md` ainda não existia quando o registro foi escrito |
| D2 | `atendido` | leitura de `.github/workflows/ci.yml`: os passos Build, Lint, Checagem de tipos, Testes e Formatação são os comandos das seções B e C |
| E1 | `atendido` | `git diff 595fc29..HEAD \| grep -nEi 'password\|secret\|token\|service_role\|private key\|postgres(ql)?://[^ ]*:[^ ]*@'` não encontrou nada, código de saída 1 |
| E2 | `atendido` | `git ls-files \| grep -i env` lista só `apps/api/.env.example` e `apps/web/.env.example` |
| E3, E4 | `atendido` | a unidade não lê variável de ambiente nova. O workflow não usa segredo |
| F1 | `atendido` | os identificadores novos são nomes de passo e de job do workflow. `verificar` é nome de job, e nomes de passo são texto de processo, em pt-BR |
| F2 | `atendido` | documentos e commits em pt-BR |
| F3 | `não se aplica` | vale a partir de M8 |
| G, H, J | `não se aplica` | valem a partir de `M1.2`, M2 e `M1.5` |
| I1 | `atendido` | o `README.md` mudou no mesmo commit da instalação e do hook |
| I2 | `atendido, com ressalva` | o `README.md` diz que a `main` recusa push direto e força pull request com o check verde. O payload exato do ruleset está neste documento, no DoD 2. Se o condutor quiser o passo de recriação do ruleset escrito no `README.md`, isso é fora da lista de arquivos e do texto que o contrato pediu para o `README.md` |

### CI

```
$ gh run list --commit 0ab7df09633614434d0dc8998feb8aa6403ab7a7
completed	success	feat(M1.4): CI de verificação, hook de pré-commit e README de máquina…	CI	unidade/M1.4-ci-verificacao	push	35034483920	29s	2026-09-15T23:10:51Z
```

O commit que traz este `execucao.md` é posterior ao registro. A execução dele fica visível em
`gh run list --branch unidade/M1.4-ci-verificacao` e no pull request `#1`.

## Bloqueios e dúvidas

### B1 — o merge automático do repositório · `resolvido na rodada 2`

Na rodada 1 o merge automático continuou desligado. As duas formas de ligar foram recusadas
pelo sistema de permissão da ferramenta, não pelo GitHub:

```
$ gh api -X PATCH repos/alta-cupula-group/casa-automatica -F allow_auto_merge=true
Permission for this action was denied

$ gh repo edit alta-cupula-group/casa-automatica --enable-auto-merge
Permission for this action was denied
```

O condutor ligou a configuração em 2026-09-15. O bloqueio deixou de existir:

```
$ gh api repos/alta-cupula-group/casa-automatica --jq .allow_auto_merge
true
```

O `gh pr merge --squash --auto` do fluxo de entrega que está no `README.md` agora tem a
configuração de que precisa.

### B2 — o item 3 do DoD não é verificável antes do merge · `aberto`

A tentativa de fechar o pull request da unidade foi recusada pelo sistema de permissão, e o
merge não é do executor:

```
$ gh pr merge 1 --squash
Permission for this action was denied. Reason: Merge Without Review
```

O pull request `#1` está aberto, com o check `CI / verificar` verde. O GATE 2 é do condutor e
do operador.

A rodada 2 mediu a consequência disso no item 3 do DoD, com o pull request `#4`. O resultado
divergiu do esperado: as cinco etapas rodaram. O motivo não é defeito do workflow. É que todo
pull request capaz de disparar este workflow hoje carrega o próprio
`.github/workflows/ci.yml`, um caminho que não casa com `docs/**` nem com `*.md`. O contrato
manda rodar tudo nesse caso, e foi o que aconteceu.

Não existe pull request contra a `main` que seja só de documentação e ao mesmo tempo traga o
workflow. Por isso paro aqui, como a rodada 2 mandou. O item 3 fica `não verificado` e a
unidade fica bloqueada até o condutor decidir entre, por exemplo:

- **A** — fechar o GATE 2 com o item 3 pendente, e verificá-lo no primeiro pull request só de
  documentação depois do merge · custo: a unidade fecha com um item verificado fora dela ·
  consequência: a evidência existe, com um dia de atraso.
- **B** — mudar o DoD ou o contrato para outra forma de verificação · custo: novo GATE 1 ·
  consequência: a unidade não fecha hoje.

Quem escolhe é o condutor com o operador. Eu não mudo o DoD.

### B3 — o contrato não fixa como instalar o Node no `README.md`

O contrato diz que a seção passa a instalar o Node antes do pnpm, e não diz por qual caminho.
Escolhi o repositório da NodeSource, `setup_26.x`, porque é o que funciona no container
`ubuntu:24.04` do DoD 5, e acrescentei uma linha dizendo que em outro sistema o Node 26 vem do
pacote oficial de `https://nodejs.org`. Se o condutor quiser outro caminho, é mudança de uma
linha do `README.md`.

## Encontrado e não tocado

1. O `curl -fsSL https://get.pnpm.io/install.sh | sh -` do `README.md` para com
   `ERR_PNPM_UNKNOWN_SHELL` quando a variável `SHELL` está vazia. Isso acontece em shell não
   interativo, como o de um container ou de um script de provisionamento. Num terminal normal
   não acontece. Não mexi no `README.md` por causa disso.
2. O mesmo instalador baixou o pnpm `12.4.2`, enquanto o `packageManager` fixa `12.4.1`. O
   pnpm respeitou o campo e rodou `12.4.1` no container. Não é um problema hoje, mas os dois
   números aparecem na mesma saída e podem confundir quem ler.
3. O ruleset nasceu com o parâmetro `require_extra_approval_for_unattributed_changes` em
   `true`, um padrão do GitHub que eu não pedi. Não testei o efeito dele, porque não cheguei a
   merge nenhum. Ele pode exigir uma aprovação extra em pull request com commit de autoria não
   atribuída, e o contrato diz que aprovação de revisor não é exigida.
4. O workflow não trata pull request vindo de fork, como o contrato mandou registrar. Fork de
   repositório público roda o workflow só depois que um mantenedor aprova, na configuração
   padrão do GitHub.
5. O passo de detecção compara sempre contra `origin/main`. Num push na própria `main` a lista
   de arquivos alterados fica vazia. O contrato não diz o que fazer nesse caso. Escolhi rodar
   os cinco comandos, que é o caminho conservador, e o caso C do DoD 3 mostra isso.

## Como reverter

```bash
gh api -X DELETE repos/alta-cupula-group/casa-automatica/rulesets/23507008
gh pr close 1
git push origin --delete unidade/M1.4-ci-verificacao
```

Se a unidade já tiver entrado na `main`, o mesmo `DELETE` do ruleset mais um
`git revert` do commit de merge desfazem o resto. O `git config --unset core.hooksPath` tira o
hook da máquina de quem já rodou `pnpm install` com o `prepare` novo.
