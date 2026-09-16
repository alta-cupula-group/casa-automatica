> Unidade: `M1.4-ci-verificacao` · Marco: `M1 · CI`
> Estado: `em correção`
> Revisor: `revisor separado` · Ferramenta: `Claude Code, modelo claude-sonnet-5` · Data: `2026-09-15`

# Revisão — `M1.4-ci-verificacao`

## Veredito

`reprovado`

O DoD do contrato tem um item, o 3, marcado como `não verificado` pelo próprio executor, e
esta revisão não conseguiu produzir a evidência que falta dentro dos limites impostos a ela.
Não verificável é reprovação. Todo o resto do DoD do contrato e do DoD geral foi conferido e
está `atendido`.

## Rodada 1

### DoD do contrato

| # | Item | Veredito | Evidência |
|---|---|---|---|
| 1 | Workflow roda os cinco comandos num push, termina verde, check `CI / verificar` | atendido | `gh run list --branch unidade/M1.4-ci-verificacao` mostra quatro execuções `completed success`. Para o último commit da unidade, `8b12fa5`: `gh api repos/alta-cupula-group/casa-automatica/commits/8b12fa5.../check-runs --jq '.check_runs[] | {name,status,conclusion}'` devolve `{"name":"verificar","status":"completed","conclusion":"success"}`. O log do run `35035616511` (evento `push`) mostra a etapa "Detectar mudança só de documentação" com `Mudança só de documentação: false` seguida das etapas Build, Lint, Checagem de tipos, Testes e Formatação |
| 2 | A `main` recusa push direto e recusa merge com check vermelho | atendido | evidência de `execucao.md`: `git push origin HEAD:main` devolveu `GH013: Repository rule violations` e código 1; pull request `#2` com teste quebrado ficou `mergeStateStatus: BLOCKED` com os dois checks `FAILURE`, foi fechado e a branch apagada. Confirmado por mim, só leitura: `gh api .../rulesets/23507008` mostra `enforcement: active`, regras `["pull_request","required_status_checks","non_fast_forward"]`, e `gh api .../branches` lista hoje só `main`, `unidade/M0.1-monorepo-base` e `unidade/M1.4-ci-verificacao`, confirmando que a branch de teste não sobrou |
| 3 | Pull request que toca só documentação fecha verde sem rodar os cinco comandos | **não verificado** | o próprio `execucao.md` marca o item como `não verificado` e explica que a `main` ainda não tem `.github/workflows/ci.yml`. Essa explicação está tecnicamente incorreta: o próprio pull request `#1` prova que o evento `pull_request` roda o workflow mesmo sem ele existir na `main`, porque é um pull request do mesmo repositório, não de um fork (`gh run list --branch unidade/M1.4-ci-verificacao` mostra runs com `event: pull_request` bem-sucedidos para os commits `0ab7df0` e `8b12fa5`, e `main` continua sem o arquivo: `git ls-tree -r origin/main --name-only \| grep -i workflow` não retorna nada). A mesma técnica usada para provar o item 2 — branch descartável a partir de um commit que já tem o `ci.yml`, pull request contra a `main`, examinar o log — serviria aqui trocando o conteúdo do commit por uma mudança só em `docs/`. Não apliquei essa técnica eu mesmo porque o escopo desta revisão proíbe abrir e fechar pull request e escrever qualquer arquivo além deste. Ver correção 1 |
| 4 | Hook recusa commit com erro de lint ou de tipo, funciona num clone novo sem passo manual | atendido | reproduzi de forma independente: clonei `unidade/M1.4-ci-verificacao` num diretório à parte, rodei `pnpm install --frozen-lockfile` (ativa o `prepare`), `git config core.hooksPath` devolveu `.husky/_`, inseri um erro de tipo proposital em `apps/api/src/config.ts` e `git commit` saiu com código 1 e a mensagem `husky - pre-commit script failed (code 1)`. Consistente com a evidência de `execucao.md` |
| 5 | Máquina vazia completa o README | atendido | evidência de `execucao.md`: container `ubuntu:24.04` sem Node e sem pnpm, clonando a branch da unidade e seguindo o README, chega a `pnpm -r build` com código 0. O texto do README na branch bate com o que o container seguiu (conferi o diff de `README.md`) |
| 6 | Os cinco comandos passam localmente | atendido | reproduzi de forma independente, clone limpo de `unidade/M1.4-ci-verificacao`: `pnpm -r build && pnpm -r lint && pnpm -r typecheck && pnpm -r test && pnpm format:check` saiu com código 0, todos os testes passaram e `prettier --check .` reportou "All matched files use Prettier code style!" |
| 7 | README descreve CI, hook, `--no-verify` e o fluxo de entrega em um comando | atendido | leitura da seção "CI, hook e entrega" em `README.md` na branch da unidade: descreve o workflow, o atalho de documentação, o hook, `--no-verify`, e o bloco `git switch -c ... && git push -u origin HEAD && gh pr create --fill && gh pr merge --squash --auto` |

### DoD geral da fase

| # | Item | Veredito | Evidência |
|---|---|---|---|
| A1 | Commit de contrato aprovado antes do primeiro commit de código | atendido | `git log --oneline origin/unidade/M1.4-ci-verificacao~2` devolve `595fc29 docs(M1.4): contrato aprovado`, pai direto de `0ab7df0 feat(M1.4): ...` |
| A2 | `execucao.md` traz cada item do DoD com saída real | atendido | leitura de `execucao.md`: todos os sete itens do contrato e a tabela do DoD geral trazem comando e saída |
| A3 | Diff toca só os arquivos afetados do contrato | atendido | `git diff --stat origin/main..origin/unidade/M1.4-ci-verificacao` mostra exatamente `.github/workflows/ci.yml`, `.husky/pre-commit`, `README.md`, `package.json`, `pnpm-lock.yaml` e `docs/fase 1/unidades/M1.4-ci-verificacao/execucao.md`, a mesma lista do contrato |
| A4 | Estado no cabeçalho bate com `estado.md` | atendido | `execucao.md` traz `Estado: em revisão`; `docs/fase 1/estado.md` linha 83 traz `em revisão` para `M1.4-ci-verificacao`. `execucao.md` marcou este item como "não verificado" por não ser papel do executor atualizar `estado.md`, mas na leitura de hoje os dois batem |
| A5 | Commits em pt-BR com prefixo da regra 03 | atendido | `git log --oneline origin/main..origin/unidade/M1.4-ci-verificacao` mostra `feat(M1.4): ...` e `docs(M1.4): ...`, ambos em pt-BR |
| B1 | Instalação e build passam num clone limpo | atendido | reproduzido por mim, ver DoD 6 acima |
| B2 | Lint passa | atendido | mesmo comando acima, `pnpm -r lint` dentro da cadeia saiu com código 0 |
| B3 | Typecheck passa, `strict: true` | atendido | `pnpm -r typecheck` saiu com código 0 na minha reprodução. Esta unidade não mexe no `tsconfig` |
| B4 | Formatação confere | atendido | `prettier --check .` reportou conformidade na minha reprodução |
| C1 | Suíte passa | atendido | `pnpm -r test` passou nos três pacotes com testes, na minha reprodução |
| C2 | Item de comportamento do DoD com teste automatizado | não se aplica | o contrato classifica os itens 1 a 5 e o 7 como verificação manual, e a unidade não cria código de produto |
| C3 | Item não automatizável marcado no contrato com evidência esperada | atendido | leitura do contrato, coluna "Teste" da tabela de DoD |
| C4 | Nenhum teste acessa rede externa | atendido | a unidade não cria nem altera teste |
| C5 | Correção de rodada de revisão vem com teste que falhava antes | não se aplica | primeira rodada |
| D1 | Pipeline verde no último commit da unidade | atendido | `gh run list --commit 8b12fa5f2737b637d58293d9f878f48efdc8cafd` e `gh api .../check-runs` confirmam `success` para o commit mais recente da branch, tanto no evento `push` quanto no `pull_request` |
| D2 | Pipeline roda os mesmos comandos das seções B e C | atendido | leitura de `.github/workflows/ci.yml`: passos Build, Lint, Checagem de tipos, Testes e Formatação chamam exatamente `pnpm -r build`, `pnpm -r lint`, `pnpm -r typecheck`, `pnpm -r test` e `pnpm format:check` |
| E1 | Nenhum segredo no diff | atendido | `git diff origin/main..origin/unidade/M1.4-ci-verificacao \| grep -nEi 'password\|secret\|token\|service_role\|private key\|postgres(ql)?://[^ ]*:[^ ]*@'` não encontrou nenhum valor real, só a própria linha de `execucao.md` que documenta este comando |
| E2 | Só `.env.example` versionado | atendido | a unidade não toca arquivo `.env` |
| E3, E4 | Variável de ambiente documentada, `apps/web` só lê `VITE_` | não se aplica | a unidade não lê nem adiciona variável de ambiente |
| F1 | Identificadores de código em inglês | atendido | o único identificador novo é o `id`/`name` do job, `verificar`, que é interface pública fixada pelo contrato aprovado pelo operador, não uma escolha do executor. Nomes de passo são texto de log em pt-BR, não identificador |
| F2 | Documentos e commits em pt-BR | atendido | ver A5 |
| F3 | Texto de interface em i18n | não se aplica | vale a partir de M8 |
| G, H, J | Banco, API, servidor | não se aplica | valem a partir de `M1.2`, M2 e `M1.5` |
| I1 | README muda no mesmo commit que muda instalação/comando | atendido | o commit `0ab7df0` traz `ci.yml`, `.husky/pre-commit`, `package.json` e `README.md` juntos |
| I2 | Passo manual de operação documentado | atendido, com ressalva | o README descreve que a `main` exige pull request com o check verde, mas não documenta o comando de recriação do ruleset. `execucao.md` já registra essa ressalva e diz que o payload exato está no próprio `execucao.md`. Ver observação 1 |

### Escopo

```
$ git diff --stat origin/main..origin/unidade/M1.4-ci-verificacao
 .github/workflows/ci.yml                                          |  74 ++++
 .husky/pre-commit                                                 |   1 +
 README.md                                                         |  41 +-
 docs/fase 1/unidades/M1.4-ci-verificacao/execucao.md              | 452 +++++++++++++++++++++
 package.json                                                      |   2 +
 pnpm-lock.yaml                                                    |  10 +
 6 files changed, 579 insertions(+), 1 deletion(-)
```

Bate exatamente com a lista de arquivos afetados do contrato. Nenhum arquivo a mais.
`estado.md` não foi tocado nesta branch, o que é esperado: a atualização dele está na branch
`docs/estado-m1-4-em-revisao` (pull request `#3`), fora do escopo desta unidade e do papel do
executor.

### Regras do repositório

- Código e banco em inglês: `ok`
- Nada assumido fora do brief: `ok`, com uma ressalva: a justificativa do item 3 do DoD como
  "só dá para verificar depois que a `main` tiver o workflow" não é um fato verificado, é uma
  hipótese sobre o comportamento do GitHub Actions, e a evidência do próprio pull request `#1`
  a contradiz. Ver correção 1
- Nenhum `[A VALIDAR]` tratado como resolvido: `ok`, não há `[A VALIDAR]` nesta unidade
- Cabeçalhos e `estado.md` coerentes: `ok`
- Testes de comportamento falharam antes da implementação: `ok`. `execucao.md` mostra, para
  cada item de verificação manual, o comando rodado antes de qualquer arquivo existir ou antes
  do hook/ruleset existir, com o estado de falha (`ls` sem arquivo, `git push` sem recusa,
  commit com erro de tipo aceito, README sem Node)
- Nenhuma dependência ou versão fora do contrato: `ok`. `husky@9.1.7` é a única dependência
  nova, confirmada em `package.json` e em `pnpm-lock.yaml` com a mesma versão do contrato. As
  actions do workflow usam exatamente as versões fixadas: `actions/checkout@v7.0.1`,
  `actions/setup-node@v7.0.0`, `pnpm/action-setup@v6.1.0`
- CI verde no último commit, depois de `M1.4-ci-verificacao`: `ok`. Esta é a própria unidade
  que introduz a CI; o commit `8b12fa5`, o mais recente da branch, está `success` tanto no
  evento `push` quanto no `pull_request`
- Em unidade de risco, ferramenta ou modelo diferente do executor: `ok`. Executor usou Claude
  Code com `claude-opus-5`; esta revisão usa Claude Code com `claude-sonnet-5`

### Correções exigidas

1. Produza a evidência real do item 3 do DoD do contrato: um pull request contra a `main`, a
   partir de uma branch derivada de um commit que já contenha `.github/workflows/ci.yml`
   (a própria técnica usada para o item 2, com a branch descartável `teste/...`), alterando só
   um arquivo dentro de `docs/` ou só um `.md`. Cole em `execucao.md` o log do run mostrando que
   as etapas Build, Lint, Checagem de tipos, Testes e Formatação não rodaram, e que o check
   `CI / verificar` fechou verde. Se o resultado divergir do esperado, o item 3 do contrato
   falhou e a unidade fica bloqueada até o condutor decidir o próximo passo. Corrija também a
   frase de `execucao.md` que afirma que o evento `pull_request` só roda o workflow depois que
   ele existir na `main`: essa frase está desmentida pelos próprios runs `35035022211` e
   `35035619690`, que rodaram via `pull_request` sem a `main` ter o arquivo.

### Observações

Achados fora das correções obrigatórias, para o condutor decidir o destino.

1. O ruleset `main protegida` nasceu com `require_extra_approval_for_unattributed_changes:
   true`, um padrão do GitHub não pedido pelo contrato. `execucao.md` já registra isso em
   "Encontrado e não tocado", item 3, corretamente sem mexer. Fica para o condutor decidir se
   vira item de backlog ou item de DoD de uma unidade futura.
2. O repositório está hoje com `allow_auto_merge: true`, mas `execucao.md` registra em
   "Bloqueios e dúvidas", B1, que a tentativa do executor de ligar essa configuração foi
   recusada por permissão. A configuração está ativa agora, então o bloqueio B1 parece
   resolvido, só que `execucao.md` não foi atualizado para refletir isso. Não é uma correção
   obrigatória porque a configuração de repositório não é um item numerado do DoD do contrato,
   mas o condutor pode querer o registro atualizado para não confundir quem ler depois.
3. O workflow não trata pull request vindo de fork, como o contrato pediu para registrar.
   `execucao.md` registra isso em "Encontrado e não tocado", item 4. Não é uma correção desta
   unidade, é a ressalva que o próprio contrato já previa como cenário fora do escopo.
4. A ressalva de I2 (payload do ruleset não documentado no README) já está registrada por quem
   executou e é uma decisão de forma, não de comportamento. Fica para o condutor decidir se o
   README precisa do comando de recriação do ruleset ou se `execucao.md` já basta como registro
   operacional, conforme I2 do DoD geral pede.

## GATE 2

- Aprovação técnica: pendente. Esta revisão reprova a rodada 1
- Veredito do operador: pendente
- Ressalva e destino: nenhuma nesta rodada. Observações 1 a 4 aguardam decisão do condutor
