> Unidade: `M1.4-ci-verificacao` · Marco: `M1 · CI` · Trilha: `dividida`
> Estado: contrato em rascunho
> Explorador · Ferramenta: `Claude Code, modelo claude-sonnet-5` · Data: `2026-09-15`

# Exploração — `M1.4-ci-verificacao`

## Resumo

Simulei o clone limpo num container Ubuntu 24.04 e achei duas falhas reais e atuais: o
`pnpm format:check` já falha hoje na `main` por causa de `.claude/settings.json`, e o
README nunca instala Node, então uma máquina realmente vazia não completa o próprio guia
de 5 minutos. `pnpm-workspace.yaml` já trava scripts de instalação de dependência
(`allowBuilds: {}`), o que bloqueia `lefthook` e `simple-git-hooks` até serem
liberados, mas não afeta `husky`. `markinkkkkj` tem `write`, não `admin`, confirmado
pela API; proteção de branch e ruleset exigem `admin`, então nenhuma das duas formas de
proteção pode ser configurada por ele hoje, e não existe organização GitHub ainda para a
opção de transferência. Os cinco comandos passam limpos com Node 26 instalado e sem
`.env`. As perguntas P3, P4 e P5 ficam com opções, sem escolha, como a ordem exige.

## Respostas

### P1 — Sequência de instalação de Node e pnpm no runner, e onde entra o cache

**Resposta:** A documentação oficial do pnpm para CI recomenda hoje a action
`pnpm/setup`, que instala pnpm e o runtime Node no mesmo passo, lendo a versão do pnpm
direto do campo `packageManager` do `package.json`, sem precisar de `actions/setup-node`
separado:

```yaml
name: pnpm Example Workflow
on:
  push:
jobs:
  build:
    runs-on: ubuntu-24.04
    strategy:
      matrix:
        node-version: [24]
    steps:
      - uses: actions/checkout@v6
      - name: Install pnpm and Node.js
        uses: pnpm/setup@c9883cc79df532ad1a7b81bf9ab944ceb090d65c # v2.0.0
        with:
          runtime: node@${{ matrix.node-version }}
          cache: true
```

Este repositório fixa `engines.node: >=26.0.0` (`package.json:8`) e
`packageManager: pnpm@12.4.1` (`package.json:6`), então o `runtime` do passo acima seria
`node@26`, sem matrix (só uma versão é suportada).

Alternativa tradicional, ainda mantida: `actions/setup-node` mais uma action que instala
o pnpm antes dela. A doc oficial do `actions/setup-node` avisa que o cache de pnpm
**exige o pnpm já instalado**: "Package manager should be pre-installed" (README do
`actions/setup-node`, linha 80 do arquivo bruto buscado). Ou seja, a ordem dos passos
tem que ser: instalar pnpm primeiro (via `corepack enable` + `corepack use
pnpm@12.4.1`, ou via `pnpm/action-setup`), depois `actions/setup-node@v7` com
`cache: 'pnpm'`, depois `pnpm install --frozen-lockfile`.

O runner hospedado `ubuntu-24.04` **não** traz Node 26 pré-instalado: o README oficial
das imagens do runner lista só `Node.js 22.23.2` e `24.20.0` na toolcache
(`actions/runner-images/images/ubuntu/Ubuntu2404-Readme.md`, seção Node.js). Qualquer
caminho escolhido baixa o Node 26 na hora, o que consome tempo de execução até o cache
funcionar.

**Evidência:**
```
$ curl -s https://pnpm.io/continuous-integration | grep -A2 "GitHub Actions"
(trecho .github/workflows/NAME.yml da página, reproduzido acima)

$ gh api repos/pnpm/setup --jq '{full_name, created_at, pushed_at}'
{"full_name":"pnpm/setup","created_at":"2026-05-11T15:06:21Z","pushed_at":"2026-09-14T09:44:01Z"}

$ gh api repos/pnpm/setup/releases --jq '.[0:3] | .[] | {tag_name, published_at}'
{"tag_name":"v2.1.0","published_at":"2026-08-28T23:58:37Z"}
{"tag_name":"v2.0.2","published_at":"2026-08-09T22:08:50Z"}
{"tag_name":"v2.0.1","published_at":"2026-08-07T10:45:34Z"}

$ curl -s https://raw.githubusercontent.com/actions/runner-images/main/images/ubuntu/Ubuntu2404-Readme.md | grep -A2 "Node.js"
#### Node.js
- 22.23.2
- 24.20.0

$ gh api repos/actions/checkout/releases/latest --jq '.tag_name'
v7.0.1
$ gh api repos/actions/setup-node/releases/latest --jq '.tag_name'
v7.0.0
```

**Confiança:** fato verificado. A doc do pnpm cita `pnpm/setup@...` com o comentário
`# v2.0.0`, mas o registro do pacote no GitHub já está em `v2.1.0` desde 2026-08-28; a
doc não está na última tag. Isso é um achado, não uma opinião: quem escrever o workflow
deve conferir a tag atual em vez de copiar literalmente o exemplo da doc.

### P2 — O que falha num clone limpo, sem `.env`, num Ubuntu sem nada instalado

**Resposta:** Simulei em `ubuntu:24.04` via Docker (`--network host`, já que o sandbox
bloqueia a rede padrão do Docker). Três falhas reais, nesta ordem:

1. O instalador oficial do pnpm (`curl -fsSL https://get.pnpm.io/install.sh | sh -`, o
   mesmo comando do `README.md:29`) falha sozinho num container limpo com
   `Error: ERR_PNPM_UNKNOWN_SHELL` porque a variável `SHELL` não está definida. Isso não
   é hipotético: reproduzi de novo com `export SHELL=/bin/bash` e o instalador funcionou.
2. Mesmo com `SHELL` definida, `source ~/.bashrc` (`README.md:30`) não aplica o `PATH`
   novo num shell não interativo, porque o `.bashrc` padrão do Ubuntu tem
   `[ -z "$PS1" ] && return` na linha 6, que aborta o script antes de chegar no trecho
   que o instalador do pnpm anexou. Um terminal interativo de verdade não sofre disso
   (nova aba, novo login), mas qualquer automação que rode `bash -c` ou `sh -c` sofre.
3. O `README.md` nunca instala Node, e o binário standalone do pnpm não expõe um
   executável `node` no `PATH`. Sem Node no sistema, `pnpm install --frozen-lockfile`
   funciona (o pnpm baixa os pacotes sozinho), mas `pnpm -r build` falha com código 127:
   `node_modules/.bin/tsc: 53: exec: node: not found`. O guia de 5 minutos pressupõe uma
   máquina que já tem Node, mas não diz isso em nenhum lugar.

Depois de instalar Node 26 via NodeSource (`setup_26.x`) e clonar de verdade o
repositório do GitHub, os cinco comandos passam **sem copiar nenhum `.env`**:
`pnpm -r build`, `pnpm -r lint`, `pnpm -r typecheck` e `pnpm -r test` saem com código 0.
`pnpm format:check` **falha** com código 1, hoje, na `main`, porque
`.claude/settings.json` não está formatado como o Prettier espera. Reproduzi o mesmo
erro rodando localmente, no checkout já existente (`git status` limpo, HEAD `4e3a7ec`),
então não fui eu quem quebrou.

Os testes **não precisam** de `apps/api/.env`: `apps/api/src/config.test.ts` chama
`loadConfig` com objetos literais (`{}`, `{ PORT: '8080', ... }`), nunca lê
`process.env` diretamente. Só `apps/api/src/index.ts:4` lê `process.env` de verdade, e
esse arquivo não roda nos testes, só em `pnpm --filter @casa/api start`.

**Evidência:**
```
# Passo 1, sem SHELL definida
+ curl -fsSL https://get.pnpm.io/install.sh
+ sh -
Error: ERR_PNPM_UNKNOWN_SHELL
  × Could not infer shell type.

# Passo 2, com SHELL definida, mas source em shell não interativo
+ grep -n return /root/.bashrc | head -5
6:[ -z "$PS1" ] && return
+ source /root/.bashrc
+ pnpm --version
bash: line 9: pnpm: command not found

# Passo 3, sem Node instalado
+ pnpm -r build
packages/shared build$ tsc -p tsconfig.build.json
packages/shared build: /root/casa-automatica/node_modules/.bin/tsc: 53: exec: node: not found
packages/shared build: Failed
EXIT=1

# Com Node 26 instalado, clone real, sem .env: os 4 primeiros comandos passam
build exit=0
lint exit=0
typecheck exit=0
test exit=0

# format:check falha
$ prettier --check .
Checking formatting...
[warn] .claude/settings.json
[warn] Code style issues found in the above file. Run Prettier with --write to fix.
[ELIFECYCLE] Command failed with exit code 1.
format exit=1

# Reproduzido localmente, fora do container, checkout limpo
$ git status --short   # (sem saída)
$ pnpm format:check
[warn] .claude/settings.json
[ELIFECYCLE] Command failed with exit code 1.

$ git log -1 --format='%H %ci' -- .claude/settings.json
374fdb6f1ede2cae2ab71cdbc58a98966b599530 2026-09-15 15:51:17 -0300
```

**Confiança:** fato verificado, com comando e código de saída reais em cada etapa.

### P3 — Mecanismo de git hook: `core.hooksPath`, `simple-git-hooks`, `husky`, `lefthook`

**Resposta:** Testei os quatro num diretório fora do repositório, com o mesmo
`pnpm-workspace.yaml` que este repositório já usa
(`pnpm-workspace.yaml:3`, `allowBuilds: {}`). Esse detalhe muda o custo de cada opção
**neste repositório especificamente**, porque `allowBuilds: {}` é o modo estrito do pnpm
que bloqueia por padrão qualquer script de instalação (`postinstall`/`preinstall`) de
uma dependência, com erro (`ERR_PNPM_IGNORED_BUILDS`), não aviso.

| Mecanismo | O que instala | Como ativa após o clone | Onde escreve o hook | Precisa de `allowBuilds` |
|---|---|---|---|---|
| `core.hooksPath` com script versionado | nada (zero dependência) | cada pessoa roda `git config core.hooksPath .githooks` uma vez, ou um `"prepare": "git config core.hooksPath .githooks"` no `package.json` raiz | um diretório versionado, ex. `.githooks/pre-commit` | não |
| `simple-git-hooks` 2.14.0 | pacote de 13 kB, zero dependência | precisa de **duas coisas** no `package.json`: a chave `"simple-git-hooks"` com os comandos, e `"scripts": { "prepare": "simple-git-hooks" }` | escreve direto em `.git/hooks/<hook>` | **sim.** O próprio pacote tem `"postinstall": "node ./postinstall.js"` (`node_modules/simple-git-hooks/package.json`), bloqueado por padrão |
| `husky` 9.1.7 | pacote de 4 kB, zero dependência | só `"scripts": { "prepare": "husky" }` no `package.json` raiz. `pnpm exec husky init` faz isso e já cria `.husky/pre-commit` | usa `git config core.hooksPath .husky/_`, confirmado no teste | **não.** `prepare` é script do projeto raiz, não de uma dependência; `allowBuilds` não olha para ele |
| `lefthook` 2.1.14 | pacote de 28 kB mais um binário Go nativo por plataforma (5,42 MB baixado para `linux-x64` no teste) | `postinstall` do próprio pacote roda `lefthook install` sozinho, mas só depois de liberado em `allowBuilds` | escreve direto em `.git/hooks/<hook>`, sincronizado a partir de `lefthook.yml` | **sim**, pela mesma razão do `simple-git-hooks` |

Medição do que o hook de pré-commit vai rodar, nesta máquina (Node 26.8.2, pnpm 12.4.1,
`node_modules` já instalado, três execuções seguidas):

```
$ time (pnpm -r lint && pnpm -r typecheck)
real 0m7.280s   # primeira execução
real 0m6.486s   # segunda
real 0m6.183s   # terceira
```

Isso é o tempo nesta máquina, não nas máquinas dos moradores; sirva como referência de
ordem de grandeza (poucos segundos), não como número final.

**Evidência:**
```
$ npm view simple-git-hooks version; npm view husky version; npm view lefthook version
2.14.0
9.1.7
2.1.14

$ cat node_modules/simple-git-hooks/package.json | grep -A3 '"scripts"'
"scripts": { "postinstall": "node ./postinstall.js", "uninstall": "node ./uninstall.js" }

$ pnpm add -D lefthook   # com allowBuilds: {} no pnpm-workspace.yaml
Error: ERR_PNPM_IGNORED_BUILDS
  × adding a new package
  ╰─▶ Ignored build scripts: lefthook@2.1.14

$ pnpm add -D husky      # mesmo pnpm-workspace.yaml, sem erro
devDependencies:
+ husky 9.1.7

$ pnpm exec husky init; git config core.hooksPath
.husky/_

$ cat /tmp (teste lefthook) .git/hooks/pre-commit | head -1
#!/bin/sh   # escrito direto em .git/hooks, não via core.hooksPath

# tabela de tamanho, do próprio README de simple-git-hooks (raw.githubusercontent.com)
| husky 9.1.7 | 4.0 kB |
| simple-git-hooks 2.13.1 | 13.0 kB |
| lefthook 2.1.10 | 28.4 kB |
```

**Confiança:** fato verificado para o comportamento de cada ferramenta nesta versão,
testado fora do repositório. A tabela de tamanho vem do README do próprio
`simple-git-hooks` (fonte parcial, mas é a única comparação de tamanho publicada que
achei; os números de versão da tabela são de uma versão anterior à instalada agora,
diferença de patch).

### P4 — Proteção da `main`: clássica ou ruleset

**Resposta:** As duas formas de proteção existem no plano gratuito para repositório
público. As duas exigem permissão de `admin` (ou dono) do repositório para serem
criadas ou editadas; não existe caminho de `write` para configurar nenhuma delas.

- Proteção clássica: a doc oficial do endpoint da REST API diz, sobre
  `PUT /repos/{owner}/{repo}/branches/{branch}/protection`: **"Protecting a branch
  requires admin or owner permissions to the repository."** Ela tem a opção "Require
  status checks to pass before merging" (com "strict" opcional: branch tem que estar
  atualizada com a base antes do merge), bloqueia force-push por padrão, e tem uma opção
  chamada **"Do not allow bypassing the above settings"** que estende as regras a quem
  tem permissão de admin.
- Ruleset: mais novo, mais granular (pode ter várias regras por repositório, com
  precedência). A doc de "Creating rulesets for a repository" e páginas relacionadas
  dizem: **"People with admin access to a repository, or a custom role with the 'edit
  repository rules' permission, can create, edit, and delete rulesets."** Papel
  customizado de repositório é recurso de organização; não existe em conta pessoal, que
  é o caso de `casa-automatica` hoje (`gh api users/casa-automatica --jq '.type'` →
  `User`). Então, em conta pessoal, ruleset também exige `admin` puro e simples, sem
  atalho.
- As duas formas suportam: exigir checks específicos passando, bloquear push direto
  (`Restrict who can push to matching branches`, na clássica; regra de restrição
  equivalente no ruleset) e bloquear force-push (padrão em ambas).
- Nenhuma das duas está configurada hoje: `gh api repos/.../branches/main/protection`
  devolve `404`, e `gh api repos/.../rulesets` devolve `[]`.

**Evidência:**
```
$ gh api repos/casa-automatica/casa-automatica/branches/main/protection
{"message":"Not Found", ...} (404)

$ gh api repos/casa-automatica/casa-automatica/rulesets
[]

$ curl (via WebFetch) docs.github.com/.../rest/branches/branch-protection#update-branch-protection
"Protecting a branch requires admin or owner permissions to the repository."

$ WebSearch docs.github.com rulesets permissão
"People with admin access to a repository, or a custom role with the 'edit repository
rules' permission, can create, edit, and delete rulesets for a repository."
```

**Confiança:** fato verificado para a exigência de `admin`, citada com a frase exata da
documentação oficial. O detalhe fino de "quais opções bloqueiam push direto no plano
gratuito de conta pessoal versus organização" veio de uma busca com resumo por IA, não
de uma citação literal que eu tenha conseguido reproduzir; recomendo reconferir na hora
de configurar, direto na tela do GitHub, antes de fechar o contrato nesse detalhe fino.

### P5 — Quem configura a proteção: conta dona ou organização

**Resposta:** Confirmado com `gh api` em 2026-09-15: `markinkkkkj` tem `role_name:
"write"`, `permissions.admin: false` no repositório
`casa-automatica/casa-automatica`, cujo dono é a conta pessoal `casa-automatica`
(`owner.type: "User"`). Isso bate exatamente com o que a ordem já afirmava.

Duas opções, sem organização GitHub existente hoje para nenhum morador
(`gh api user/orgs` para `markinkkkkj` devolve `[]`):

- **Configurar logado na conta dona (`casa-automatica`):** exige a senha/2FA dessa
  conta. Sem mudança de URL, sem novo clone, sem nada para os outros moradores fazerem.
  Continua com uma pessoa só podendo mexer em proteção, hooks de organização e settings
  de Actions (`gh api .../actions/permissions` devolveu `403` até para `markinkkkkj`,
  que tem `write`: "You must have repository read permissions or have the repository
  Actions policies fine-grained permission", ou seja, mesmo settings de Actions exigem
  mais que `write`).
- **Transferir para uma organização nova, gratuita:** a doc oficial de transferência de
  repositório confirma que **"All links to the previous repository location are
  automatically redirected to the new location"** e que "issues, pull requests, wiki,
  stars, and watchers are also transferred", e que "Webhooks, services, secrets, or
  deploy keys will remain associated after the transfer is complete." Clones existentes
  continuam funcionando pelo redirecionamento automático do Git, embora seja
  recomendado atualizar o remote. Quem inicia a transferência precisa ter `admin` no
  repositório de origem (ou seja, de novo, só a conta `casa-automatica` pode iniciar) e
  "permission to create a repository in the target organization" no destino. Depois da
  transferência, um morador pode receber papel de `admin` **no repositório**, sem ser
  dono (`Owner`) da organização: **"Repository-level roles give organization members...
  varying levels of access to repositories,"** o mesmo padrão que o brief já usa para as
  organizações do Supabase (moradores como Developer).

**Evidência:**
```
$ gh api repos/casa-automatica/casa-automatica/collaborators/markinkkkkj/permission
{"permission":"write", ..., "role_name":"write"}

$ gh api repos/casa-automatica/casa-automatica --jq '.owner.type, .private'
User
false

$ gh api user/orgs
[]

$ gh api repos/casa-automatica/casa-automatica/actions/permissions
{"message":"You must have repository read permissions or have the repository Actions
policies fine-grained permission.", "status":"403"}
```

**Confiança:** fato verificado para as permissões atuais. As citações de transferência
vêm da doc oficial de "Transferring a repository", resumida por busca de IA mas com
trechos entre aspas reproduzidos da página; recomendo conferir a página inteira antes de
executar a transferência, é uma operação sensível e sem volta fácil.

### P6 — Nome do check, job, e diferença entre `push` e `pull_request`

**Resposta:** O nome do check que a proteção de branch exige é o campo `name:` do job
(ou o id do job, se `name:` não for definido), do jeito que aparece na lista de checks
do PR, geralmente como `<nome do workflow> / <nome do job>`. Se o job usar `strategy.matrix`,
cada combinação vira um check com nome diferente (ex.: `CI / build (20.x)`), e a
proteção tem que ser configurada para cada nome ou vai ficar "esperando para sempre" um
check que nunca é reportado com aquele nome exato. Como este repositório fixa uma única
versão de Node (`>=26.0.0`), a recomendação natural é não usar matrix e ter um nome de
job estável, para a proteção não precisar mudar quando a versão mudar.

Sobre `push` vs `pull_request`: um workflow com gatilho só `push` nunca roda para PR
vindo de fork, porque push num fork não aciona workflow do repositório base. Para um PR
de fork gerar o check exigido, o workflow também precisa do gatilho `pull_request`. Duas
diferenças de segurança confirmadas na documentação oficial:

- **"The `GITHUB_TOKEN` has read-only permissions in pull requests from forked
  repositories."**
- **"With the exception of `GITHUB_TOKEN`, secrets are not passed to the runner when a
  workflow is triggered from a forked repository."**

Isso não atrapalha esta unidade: lint, checagem de tipos, teste e build não precisam de
nenhum segredo nem de escrita no repositório. Mas, como o repositório é público, qualquer
pessoa pode abrir um fork e um PR; a primeira execução de workflow de um contribuidor
externo pode cair em **aprovação manual obrigatória de um mantenedor com `write`**, o que
pode parecer "CI travada" para quem não sabe desse comportamento.

**Evidência:**
```
$ WebFetch docs.github.com/.../events-that-trigger-workflows (seção pull_request)
"The GITHUB_TOKEN has read-only permissions in pull requests from forked repositories."
"With the exception of GITHUB_TOKEN, secrets are not passed to the runner when a
workflow is triggered from a forked repository."

$ WebFetch docs.github.com/.../approving-workflow-runs-from-public-forks
"Workflow runs triggered by a contributor's pull request from a fork may require manual
approval from a maintainer with write access."

$ WebSearch "github actions required status check name job name matrix"
"The name comes from the combination of workflow name, job name, and matrix parameters
... CI / build (1.21), CI / build (1.22)..."
"Prefer requiring a single aggregating... job over requiring many individually-named
matrix jobs"
```

**Confiança:** fato verificado para as duas citações de segurança (texto oficial
reproduzido). O formato exato do nome do check (`workflow / job (matrix)`) vem de um
resumo de busca sobre discussões da comunidade GitHub, coerente com o comportamento
documentado, mas não é uma citação literal de página oficial; tratar como
comportamento observado, a confirmar visualmente na primeira execução real do workflow.

### P7 — Como o executor prova o DoD sem ter `admin`

**Resposta:** Com `write` (o que qualquer morador colaborador tem hoje), dá para provar
sem `admin`:

- **CI verde num push de branch:** push numa branch do próprio repositório (não de um
  fork) já aciona o workflow, sem precisar de permissão extra além de `write`.
  `gh run list --commit <sha>` filtra por SHA
  (`-c, --commit SHA   Filter runs by the SHA of the commit`, confirmado em
  `gh run list --help`) e mostra o status de cada workflow rodado naquele commit. Não
  consegui rodar esse comando contra um resultado real, porque hoje não existe nenhum
  workflow no repositório (`gh api .../actions/workflows` → `total_count: 0`); fica para
  a execução confirmar o formato exato da coluna de status.
- **PR com teste quebrado ficando vermelho:** abrir um PR de uma branch do repositório
  contra a `main` já dispara `pull_request`, de novo só com `write`.
- **Hook barrando um commit:** inteiramente local, não depende de nenhuma permissão do
  GitHub.

O que **não** dá para provar sem `admin`: que "a `main` só aceita código com CI verde"
está de fato **imposto pelo GitHub**, e não só pela boa vontade de quem empurra código.
Configurar a proteção clássica ou o ruleset exige `admin` (P4), que `write` não tem. Ou
seja, esse item específico do DoD só é prova depois que o operador (com a conta dona, ou
já transferido para uma organização com um morador `admin`) configurar a proteção, e o
executor só confere o resultado, não configura sozinho.

**Evidência:**
```
$ gh run list --help | grep -A1 "\-c, --commit"
  -c, --commit SHA     Filter runs by the SHA of the commit

$ gh api repos/casa-automatica/casa-automatica/actions/workflows
{"total_count":0,"workflows":[]}
```

**Confiança:** fato verificado para o que `write` permite hoje (testado com o próprio
token do operador). A afirmação de que "push numa branch própria não exige permissão
além de write" é conhecimento geral de GitHub Actions, não testado neste relatório
porque criar um workflow real está fora do limite desta unidade (proibido pela ordem:
"nenhum workflow criado"); marco como hipótese de comportamento a confirmar na execução.

### P8 — O que `M1.6-deploy-na-casa` vai precisar deste workflow

**Resposta:** O roadmap diz que o deploy é "disparado em push na `main`"
(`docs/fase 1/roadmap.md`, seção "M1 · Pipeline de CI e deploy"). Para acionar isso
depois da CI verde, `M1.6` vai precisar de uma das duas formas, e as duas dependem de
nomes que `M1.4` decide:

- Um job de deploy dentro do **mesmo arquivo** de workflow, com `needs:` apontando para
  os nomes dos jobs de build/lint/typecheck/test e uma condição de branch `main` e
  evento `push`. Isso exige que `M1.4` documente os nomes exatos dos jobs.
- Um **segundo workflow**, disparado por `workflow_run` quando o primeiro workflow
  terminar com sucesso na `main`. Isso exige que `M1.4` documente o nome exato do
  workflow (`name:` do arquivo), porque é isso que o `workflow_run` referencia.

Não desenho qual das duas formas usar, isso é escopo de `M1.6`. O que fica registrado
aqui é que o contrato de `M1.4` precisa **nomear** o arquivo de workflow e os jobs de
forma estável, e não escondê-los atrás de nome genérico tipo `ci.yml` com job `build`
sem mais contexto, porque `M1.6` vai referenciar esse nome.

**Evidência:** `docs/fase 1/roadmap.md`, seção "M1 · Pipeline de CI e deploy": "workflow
de deploy por SSH para o servidor, disparado em push na `main`". Comportamento de
`workflow_run` e `needs` é conhecimento geral de GitHub Actions, não testado aqui porque
está fora do limite da unidade (proibição de criar workflow).

**Confiança:** hipótese para o mecanismo técnico (`workflow_run` vs `needs` no mesmo
arquivo); fato verificado para a citação do roadmap.

## Superfície

| Arquivo ou recurso | Existe hoje | O que muda |
|---|---|---|
| `.github/workflows/*.yml` | não (`.github` não existe no repositório) | novo arquivo de workflow de CI |
| `package.json` (raiz) | sim, com `build`, `lint`, `typecheck`, `test`, `format`, `format:check` | nenhuma mudança de script esperada; o workflow chama os mesmos comandos |
| `pnpm-workspace.yaml` | sim, com `allowBuilds: {}` | se a escolha do operador para o hook (P3) for `lefthook` ou `simple-git-hooks`, esta chave precisa ganhar uma entrada liberando o pacote |
| `.husky/` ou `.githooks/` ou `lefthook.yml` | não | criado pelo mecanismo de hook escolhido |
| `.claude/settings.json` | sim, e **não passa** em `pnpm format:check` hoje | precisa ser formatado (`prettier --write`) antes ou durante a execução, senão a CI nasce vermelha |
| Configuração de proteção da `main` | não (`404` na API) | exige `admin`, fora do alcance de quem só tem `write` |
| Organização GitHub para transferência | não existe nenhuma | precisa ser criada do zero, se essa for a opção escolhida |
| `README.md` | sim, seção "Como rodar em cinco minutos" (`README.md:26-37`) não instala Node | passo de instalação de Node é candidato a entrar no contrato, junto com a correção dos dois problemas do instalador do pnpm em ambiente não interativo |

## Achados não previstos

1. **`pnpm format:check` já falha na `main`, hoje, sem eu ter mexido em nada.** Ligar a
   CI agora nasceria vermelha por causa de `.claude/settings.json`, não por causa da
   configuração da CI em si. Isso precisa de uma correção antes ou junto da unidade,
   porque senão o primeiro push já quebra o próprio propósito da unidade.
2. **O guia de 5 minutos do README não instala Node**, e o instalador standalone do
   pnpm não fornece um `node` utilizável. Uma máquina realmente vazia não completa o
   próprio README como está escrito hoje.
3. **O instalador oficial do pnpm falha em shell não interativo** sem `$SHELL` definida,
   e `source ~/.bashrc` não funciona em script não interativo por causa do guard-clause
   padrão do Ubuntu. Isso não afeta o fluxo humano normal (terminal interativo), mas é
   uma armadilha se alguém tentar copiar o comando do README para dentro de automação.
4. **`pnpm-workspace.yaml` já tem `allowBuilds: {}`**, um controle que a ordem não
   citava e que muda o custo real de `lefthook` e `simple-git-hooks` neste repositório
   específico: os dois exigem uma entrada nova nessa lista para funcionar, `husky` não.
5. **Node 26 não está pré-instalado no runner `ubuntu-24.04`** (só 22.23.2 e 24.20.0
   estão na toolcache), então todo workflow vai baixar o Node 26 na hora, com custo de
   tempo até isso ficar em cache de ação.
6. **Não existe nenhuma organização GitHub hoje**, nem vazia, para nenhum morador
   (`gh api user/orgs` devolve `[]` para `markinkkkkj`). A opção de transferência da P5
   começa do zero, não de uma organização já criada.
7. **A própria documentação do pnpm recomenda uma action nova (`pnpm/setup`, criada em
   2026-05, ainda em v2.x)**, diferente da action tradicional e mais usada
   (`pnpm/action-setup`, existe desde 2020). As duas estão ativas hoje, mas são
   maturidades bem diferentes.

## Opções

### Opção A — hook via `husky`
Pacote de 4 kB, zero dependência transitiva, ativa via `"prepare": "husky"` no
`package.json` raiz, sem precisar mexer em `allowBuilds`. Usa `core.hooksPath` apontando
para `.husky/_`. Custo: mais uma dependência de desenvolvimento, ainda que pequena.
Consequência: hook versionado como arquivo de shell simples em `.husky/`, fácil de ler e
de auditar; ferramenta madura (typicode), usada amplamente.

### Opção B — hook via `simple-git-hooks`
Pacote de 13 kB, zero dependência transitiva, mas com `postinstall` próprio, que exige
liberar `simple-git-hooks: true` em `allowBuilds` no `pnpm-workspace.yaml`. Configuração
inteira dentro do `package.json` (chave `"simple-git-hooks"`), sem arquivo extra. Custo:
precisa rodar `npx simple-git-hooks` de novo manualmente sempre que a configuração
mudar (a doc do próprio pacote avisa que a atualização não é automática). Consequência:
setup mais simples de ler (tudo num objeto JSON), mas manutenção mais manual.

### Opção C — hook via `lefthook`
Pacote de 28 kB mais um binário Go nativo por plataforma (5,42 MB no teste, para
`linux-x64`), também com `postinstall` próprio, mesma exigência de `allowBuilds`.
Suporta múltiplos comandos em paralelo, filtro por glob de arquivo staged, e roda mais
rápido em repositórios grandes por ser um binário nativo. Custo: mais peso para baixar e
mais superfície de cadeia de suprimento (binário compilado, não script JS legível).
Consequência: melhor para crescer (mais regras, mais paralelismo), overkill para os dois
comandos que a ordem pede hoje (`lint` e `typecheck`).

### Opção D — `core.hooksPath` com script versionado, sem dependência
Zero pacote novo. Um diretório `.githooks/` versionado, e um `"prepare"` script no
`package.json` raiz rodando só `git config core.hooksPath .githooks` (mesma mecânica que
o `husky` usa por baixo, sem a camada de conveniência dele). Custo: reinventar à mão o
que `husky` já resolve (compatibilidade entre shells, variável de opt-out, symlinks em
Windows). Consequência: nenhuma dependência de terceiro, mas manutenção 100% manual se
o hook crescer.

### Opção E — proteção clássica de branch
Interface mais antiga e mais simples de configurar pela tela do GitHub. Suporta
"Require status checks", "Do not allow bypassing" (cobre admins), bloqueio de
force-push e de push direto. Custo: uma regra por branch, sem herança nem prioridade
entre regras. Consequência: suficiente para proteger só a `main`, que é o único caso
desta fase.

### Opção F — ruleset
Interface mais nova, permite múltiplas regras, com precedência e bypass list mais
granular (por time, por papel). Custo: um pouco mais para aprender pela primeira vez.
Consequência: mais fácil de estender depois, se a fase 2 quiser proteger outra branch ou
dar bypass a um bot específico.

### Opção G — configurar logado como a conta dona `casa-automatica`
Nenhuma mudança de URL, nenhum clone quebrado, nenhum passo extra para os moradores.
Custo: continua uma pessoa só (quem tem a senha da conta `casa-automatica`) podendo
mexer em proteção e em settings de Actions; os outros moradores continuam em `write`,
sem poder tocar nisso nunca.
Consequência: mais rápido agora, mas não resolve o problema de fundo se a intenção é
que mais de uma pessoa administre o repositório.

### Opção H — transferir para uma organização gratuita nova
URL antiga redireciona automaticamente; issues, PRs, stars e webhooks são preservados;
clones existentes continuam funcionando pelo redirecionamento (recomendado atualizar o
remote, mas não é obrigatório no ato). Custo: criar a organização do zero (nenhuma
existe hoje), e a transferência só pode ser iniciada por quem já é `admin` no
repositório de origem, ou seja, de novo, a conta `casa-automatica`. Depois de
transferido, um morador pode virar `admin` do repositório sem ser `Owner` da
organização, no mesmo padrão que o brief já usa para o Supabase.
Consequência: mais de uma pessoa passa a poder mexer em proteção e settings, ao custo de
uma operação de transferência única e de manter mais uma organização gratuita.

Propor é papel do explorador. Escolher, não.

## Não descoberto

- **Formato exato da coluna de status em `gh run list --commit <sha>`** quando há um
  workflow de verdade rodando: não existe nenhum workflow hoje
  (`gh api .../actions/workflows` → `total_count: 0`), então não pude gerar uma
  execução real para conferir a saída literal. Fica para a execução confirmar.
- **Se "Restrict who can push to matching branches" (bloqueio de push direto) está
  disponível para repositório público de conta pessoal no plano gratuito**, ou só para
  organização: a fonte que achei foi um resumo de busca por IA, não uma citação literal
  da página oficial. Recomendo reconferir direto na tela do GitHub antes de fechar o
  contrato nesse ponto específico.
- **Se `pull_request_target` seria uma alternativa** para reportar check em PR de fork
  sem o token read-only: não explorei essa trilha porque o guia de hardening do próprio
  GitHub desaconselha usá-la quando o workflow faz checkout de código não confiável de
  fork, e desenhar isso é decisão de contrato, não de exploração.
- **O texto exato de "Do not allow bypassing" equivalente no ruleset** (nome exato da
  opção de bypass list para admin): não abri a tela de criação de ruleset de verdade
  (exigiria `admin`, que não tenho), só a documentação. Fica para quem tiver `admin`
  configurar e confirmar o rótulo exato.

## Riscos vistos daqui

- Se o contrato não incluir a correção do `.claude/settings.json`, o primeiro push com
  CI liga o pipeline já vermelho, por um motivo que não é CI. Sinal de que quebrou:
  `pnpm format:check` falhando no primeiro job do primeiro workflow.
- Se o mecanismo de hook escolhido for `lefthook` ou `simple-git-hooks` e o contrato não
  mencionar `allowBuilds`, `pnpm install` de um clone novo vai falhar com
  `ERR_PNPM_IGNORED_BUILDS` para quem nunca rodou `pnpm approve-builds` antes. Sinal:
  exatamente essa mensagem de erro após `git clone` + `pnpm install`.
- Se o workflow não pinar a versão de Node de forma explícita (`node@26` ou
  equivalente), o job pode herdar por acaso o Node 22 ou 24 pré-instalado do runner em
  algum passo que não passe pela action de setup, divergindo do `engines` do
  `package.json`. Sinal: erro de sintaxe ou de tipo que não acontece localmente.
- Se a proteção da `main` for configurada só depois que outra unidade (`M1.2`, `M1.3`)
  já começar a empurrar código direto, o hábito de push direto pode continuar mesmo
  depois da proteção ligada, até alguém tentar de propósito. Sinal: proteção ligada, mas
  nunca testada de verdade com um push direto barrado.

## Perguntas ao operador

### P1 — Qual mecanismo de git hook local usar?
Por que importa: trava a implementação do hook e o que entra em `pnpm-workspace.yaml`.
Opções:
- **A — `husky`** · custo: uma dependência de desenvolvimento pequena (4 kB), sem tocar
  em `allowBuilds` · consequência: hooks em arquivos de shell simples em `.husky/`,
  ferramenta madura e amplamente usada.
- **B — `simple-git-hooks`** · custo: precisa liberar `allowBuilds` para esse pacote, e
  rodar `npx simple-git-hooks` manualmente a cada mudança de configuração ·
  consequência: configuração inteira dentro do `package.json`, sem arquivo extra.
- **C — `lefthook`** · custo: mais pesado (binário nativo por plataforma, ~5,4 MB),
  também precisa liberar `allowBuilds` · consequência: mais recursos (paralelismo,
  filtro por glob), possivelmente além do que a unidade pede hoje.
- **D — `core.hooksPath` com script versionado, sem dependência** · custo: manutenção
  manual de tudo que `husky` já resolveria pronto · consequência: zero dependência de
  terceiro no projeto.

### P2 — Proteção clássica de branch ou ruleset?
Por que importa: trava como a `main` vai ficar protegida, e quem no futuro consegue
estender essa regra.
Opções:
- **A — proteção clássica** · custo: uma regra só, sem herança · consequência: mais
  simples de configurar agora, suficiente para o caso de uma branch só.
- **B — ruleset** · custo: um pouco mais para aprender na primeira configuração ·
  consequência: mais fácil de estender depois, com múltiplas regras e bypass mais
  granular.

### P3 — Configurar logado como `casa-automatica` ou transferir para uma organização nova?
Por que importa: define quem consegue mexer em proteção de branch e em settings de
Actions daqui para frente, e se essa unidade cria uma organização nova do zero.
Opções:
- **A — configurar logado na conta `casa-automatica`** · custo: precisa da credencial
  dessa conta agora · consequência: continua só uma pessoa podendo administrar o
  repositório; nenhuma mudança de URL ou de clone.
- **B — criar organização gratuita nova e transferir o repositório para ela** · custo:
  criar a organização do zero (nenhuma existe hoje) e a transferência em si, iniciada
  pela conta `casa-automatica` · consequência: moradores podem virar `admin` do
  repositório sem ser `Owner` da organização, no mesmo padrão já usado para o Supabase;
  URL antiga redireciona automaticamente.
