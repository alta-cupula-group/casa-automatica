> Unidade: `M1.4-ci-verificacao` · Marco: `M1 · CI` · Trilha: `dividida`
> Estado: aguardando operador
> Condutor aprovou: 2026-09-15 · Operador aprovou: `—`
> Base: `ordem.md`, `exploracao.md`, `docs/scope-brief.md`, `docs/fase 1/dod.md`

# Contrato — `M1.4-ci-verificacao`

Este documento é auto-suficiente. Quem executa não leu a exploração e não vai lê-la.
Tudo que a execução precisa está aqui ou nos arquivos nomeados aqui.

## O que será construído

Um workflow do GitHub Actions roda lint, checagem de tipos, testes, build e checagem de
formatação a cada push e a cada pull request. Um hook local de pré-commit roda lint e
checagem de tipos na máquina de quem commita. Um ruleset protege a `main`: código entra
só por pull request com o check verde, e push direto e force push são recusados. O
`README.md` passa a levar uma máquina vazia do zero até os comandos passarem, incluindo a
instalação do Node.

## Interfaces e formatos

**Workflow.** Arquivo `.github/workflows/ci.yml`, com `name: CI`. Um único job, com
`name: verificar`, rodando em `ubuntu-24.04`. O check que aparece no pull request se chama
`CI / verificar`. Esses dois nomes são interface pública: `M1.6-deploy-na-casa` vai
referenciá-los. Não use `strategy.matrix`, porque cada combinação criaria um check com
nome diferente.

Gatilhos: `push` em qualquer branch e `pull_request` com alvo na `main`.

O job roda, nesta ordem, com o repositório já instalado por `pnpm install --frozen-lockfile`:

```
pnpm -r build
pnpm -r lint
pnpm -r typecheck
pnpm -r test
pnpm format:check
```

O runner `ubuntu-24.04` não traz Node 26. O job instala Node 26 e o pnpm da versão fixada
em `packageManager` do `package.json` da raiz. Cache de dependência é opcional nesta
unidade.

**Hook local.** `husky`, ativado pelo script `prepare` do `package.json` da raiz, para
funcionar logo depois de `pnpm install` num clone novo. O hook de pré-commit roda:

```
pnpm -r lint && pnpm -r typecheck
```

Commit com erro de lint ou de tipo é recusado na máquina. `git commit --no-verify` pula o
hook; isso é comportamento do git, e o `README.md` diz que quem garante é a CI.

**Ruleset.** Alvo: a branch padrão. Regras:

| Regra | Efeito |
|---|---|
| Require a pull request before merging | push direto na `main` é recusado |
| Require status checks to pass | o check `CI / verificar` precisa estar verde |
| Block force pushes | force push na `main` é recusado |

Sem lista de bypass. Aprovação de revisor no pull request não é exigida, porque a casa tem
três pessoas e o gate humano já existe no processo. O ruleset vale para os três admins.

Se a tela ou a API não oferecer ruleset para este repositório, use a proteção clássica de
branch com as mesmas três regras, e registre a troca em `execucao.md`.

**README.** A seção "Como rodar em cinco minutos" passa a instalar o Node antes do pnpm, e
ganha uma seção curta sobre a CI e o hook: o que roda, e como abrir um pull request pela
linha de comando.

## Dependências novas

Lista fechada. O executor não adiciona pacote nem muda versão fora dela.

| Pacote | Versão | De onde saiu a versão |
|---|---|---|
| `husky` | `9.1.7` | saída de `npm view husky version` em 2026-09-15 |
| `actions/checkout` | `v7.0.1` | `gh api repos/actions/checkout/releases/latest` em 2026-09-15 |
| `actions/setup-node` | `v7.0.0` | `gh api repos/actions/setup-node/releases/latest` em 2026-09-15 |
| `pnpm/action-setup` | `v6.1.0` | `gh api repos/pnpm/action-setup/releases/latest` em 2026-09-15 |

`husky` entra como `devDependency` da raiz. As três actions são referenciadas no workflow.
O executor pode usar `corepack` no lugar de `pnpm/action-setup`, desde que a versão do
pnpm continue vindo do campo `packageManager`.

O `pnpm-workspace.yaml` tem `allowBuilds: {}`, que bloqueia script de instalação de
dependência. O `husky` não precisa dessa liberação, porque usa o `prepare` do projeto. Se
o executor precisar mexer em `allowBuilds`, o contrato falhou: pare e reporte.

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `.github/workflows/ci.yml` | criar |
| `.husky/pre-commit` | criar |
| `package.json` | alterar: script `prepare` e `devDependency` `husky` |
| `pnpm-lock.yaml` | alterar: efeito da instalação |
| `README.md` | alterar: instalação do Node, seção de CI e hook |
| `docs/fase 1/unidades/M1.4-ci-verificacao/execucao.md` | criar |

O ruleset não é arquivo. Ele é configurado no GitHub pela API, com a conta do operador,
que tem `admin` desde 2026-09-15.

## Fora deste contrato

- Deploy, SSH, Cloudflare Tunnel, Docker e Caddy. Isso é `M1.5` e `M1.6`.
- Cache de dependência no runner, se custar mais que um passo do workflow.
- Atualização automática de dependência, Dependabot, badge no README.
- Qualquer verificação nova que o DoD da fase não peça, como cobertura ou auditoria.
- Mexer em `allowBuilds`, em `prettier.config.js` ou no conteúdo dos pacotes.
- Corrigir os defeitos herdados da `M0.1` que estão no backlog.

## Definition of Done

| # | Item | Como verificar | Teste |
|---|---|---|---|
| 1 | O workflow roda os cinco comandos num push de branch e termina verde | `gh run list --branch unidade/M1.4-ci-verificacao` mostra `completed success`; `gh run view <id> --log` mostra os cinco comandos | verificação manual, com a saída em `execucao.md` |
| 2 | O check se chama `CI / verificar` | `gh api repos/alta-cupula-group/casa-automatica/commits/<sha>/check-runs --jq '.check_runs[].name'` devolve `verificar` no workflow `CI` | verificação manual |
| 3 | Pull request com teste quebrado fica vermelho | num commit de teste quebrado, o mesmo comando do item 1 mostra `failure`; o PR mostra o check vermelho. O commit quebrado não fica na branch final | verificação manual |
| 4 | O hook recusa commit com erro de lint ou de tipo | com um erro de tipo proposital, `git commit` sai com código diferente de zero e a saída mostra o comando que falhou. O erro é desfeito depois | verificação manual |
| 5 | O hook funciona num clone novo, sem passo manual | num clone limpo em diretório temporário, `pnpm install --frozen-lockfile` e depois `git config core.hooksPath` devolve o caminho do husky | verificação manual |
| 6 | Push direto na `main` é recusado pelo GitHub | `git push origin HEAD:main` de um commit qualquer sai com erro citando a regra; a saída vai para `execucao.md` | verificação manual |
| 7 | Merge na `main` exige o check verde | o pull request desta unidade mostra o check exigido; merge só acontece com ele verde | verificação manual |
| 8 | Uma máquina vazia completa o README | num container `ubuntu:24.04` sem Node e sem pnpm, seguir o README na ordem leva `pnpm -r build` a sair com código 0 | verificação manual, com a saída em `execucao.md` |
| 9 | Os cinco comandos passam localmente depois da mudança | `pnpm -r build && pnpm -r lint && pnpm -r typecheck && pnpm -r test && pnpm format:check` sai com código 0 | comando |
| 10 | O `README.md` descreve a CI, o hook, o `--no-verify` e como abrir pull request pela linha de comando | leitura do `README.md` | verificação manual |

O DoD geral em `docs/fase 1/dod.md` vale por cima deste e não precisa ser repetido aqui.
A seção D passa a valer a partir desta unidade.

## Riscos

| Risco | Sinal de que aconteceu | O que fazer |
|---|---|---|
| O ruleset bloqueia o próprio executor antes do fim da unidade | `git push` recusado na `main` no meio do trabalho | é o comportamento esperado. Trabalhe na branch da unidade e entre por pull request |
| A API não oferece ruleset neste plano | erro na chamada de criação | use a proteção clássica com as mesmas três regras e registre a troca |
| O check exigido nunca reporta, e o pull request fica esperando para sempre | PR parado com check pendente | confira o nome do check com o item 2 antes de exigi-lo no ruleset |
| O job herda um Node diferente do `engines` | erro de tipo ou de sintaxe que não acontece localmente | fixe a versão do Node no passo de setup |
| Pull request vindo de fork não roda sem aprovação | check pendente com aviso de aprovação | não trate nesta unidade. Registre em `execucao.md` |

## Depende de

`M0.1-monorepo-base`, fechada. O repositório está na organização `alta-cupula-group` desde
2026-09-15, e o operador tem `admin`.

## Teste de auto-suficiência

Aplicado pelo condutor antes do GATE 1.

> Um executor que leu só este contrato, as regras do repositório e os arquivos nomeados
> acima consegue entregar sem fazer nenhuma pergunta?

Resposta: `sim` · Verificado em: `2026-09-15`

## Perguntas ao operador

Nenhuma. As três decisões desta unidade estão no veredito do operador em `exploracao.md`,
registrado em 2026-09-15: `husky`, ruleset, e organização com transferência.
