> Unidade: `M1.7-lint` · Marco: `M1 · CI`
> Estado: em revisão
> Revisor: `revisor separado` · Ferramenta: `Claude Code, modelo claude-sonnet-5-5` · Data: `2026-10-01`

# Revisão — `M1.7-lint`

## Veredito

`aprovado com ressalva`

Os 10 itens do DoD do contrato e o DoD geral estão atendidos e verificados. A ressalva é o item 1 do DoD, que depende da idade dos pacotes no pnpm, e o relato do executor sobre o `pnpm-workspace.yaml`.

## Rodada 1

### DoD do contrato

Comandos rodados no worktree do commit `057bd84`, em 2026-10-01, depois de `pnpm install --frozen-lockfile` (código 0, sem sobrescrita de política).

| # | Item | Veredito | Evidência |
|---|---|---|---|
| 1 | Lint passa com oxlint | atendido | `pnpm -r build` saiu 0. `pnpm -r lint` mostra `apps/web lint$ oxlint src vite.config.ts` e `oxlint` em api e shared, `lint=0`. |
| 2 | ESLint saiu | atendido | `pnpm ls -r --depth Infinity eslint typescript-eslint eslint-config-prettier` saiu 0 sem listar nada. `git ls-files \| grep -E 'eslint\.config\.js\|^packages/config/'` sem saída. |
| 3 | 61 regras, nenhuma categoria | atendido | Script extraiu as regras das três listas do contrato: 61, iguais às 61 de `.oxlintrc.json`, todas `error`, sete categorias `off`. `oxlint --print-config` mostra 61 regras `deny`. |
| 4 | Cada grupo ligado | atendido | `pnpm --filter @casa/web test`: `Test Files 2 passed, Tests 7 passed`. Sem `.oxlintrc.json`, o mesmo teste dá `× ` nos seis casos, `Tests 6 failed \| 1 passed`. |
| 5 | Opções batem com a referência | atendido | Worktree descartável em `f247213`, build feito. ESLint com `recommended` e `recommendedTypeChecked` do `typescript-eslint` 8.70.0, `react-hooks` 7.1.1 em `apps/web`, mais o oxlint com o `.oxlintrc.json`. Os dois acham o mesmo e único achado, `apps/web/src/App.tsx:4 no-unsafe-assignment`. Os erros de parsing do ESLint em `drizzle.config.ts` e `eslint.config.js` vêm do meu config de comparação, não do repositório. Não repeti o corpus de sondagem de 100 linhas do executor. Conferi só o código do repositório. |
| 6 | `VITE_API_URL` tem tipo | atendido | `pnpm -r typecheck` saiu 0. `pnpm -r lint` sai 0 com `no-unsafe-assignment` ligada. `App.test.tsx` passa no teste do web. `App.tsx` não está no diff. |
| 7 | Fixtures não vazam | atendido | `find apps/web/dist -type f` lista só `index.html` e `assets/index-BTj6aNul.js`. `grep -rl -E 'no-explicit-any\|lint-fixtures\|Loose\|parse\(text' apps/web/dist` sai 1. O item 1 passa com `lint-fixtures/` presente. |
| 8 | Lint mais rápido | atendido | `time pnpm -r lint` antes (`f247213`, ESLint): 4,146 s, 3,636 s, 3,850 s, mediana 3,850 s. Depois: 0,764 s, 0,781 s, 0,785 s, mediana 0,781 s. |
| 9 | README | atendido | `git grep -n -i eslint README.md` sai 1. `git grep -n -i configuração README.md` só acha a linha 313, sobre a Data API. A abertura diz "três pacotes", a tabela lista três. |
| 10 | CI passa | atendido | `gh pr checks 35`: `verificar pass` nas duas execuções, push (`36866372474`) e pull_request (`36866378385`), no commit `057bd845b0e0c8a69fb20dbb99865606d341781a`. `gh run list --commit` mostra `success` nas duas. |

### DoD geral da fase

| # | Item | Veredito | Evidência |
|---|---|---|---|
| A1 | contrato aprovado antes do código | atendido | `e30246a docs(M1.7): contrato aprovado` precede `8c6693c feat(M1.7)`. |
| A2 | `execucao.md` com saída real | atendido | Leitura. Os comandos que reproduzi dão o mesmo resultado. |
| A3 | diff só nos arquivos do contrato | atendido | Ver Escopo. |
| A4 | estado coerente | atendido | `execucao.md` e `estado.md` dizem `em revisão`. |
| A5 | commits em pt-BR com prefixo | atendido | `git log` abaixo. |
| B1 | instalação e build num clone limpo | atendido | `pnpm install --frozen-lockfile` sem sobrescrita e `pnpm -r build` saíram 0. |
| B2, B3, B4 | lint, tipos, formatação | atendido | `pnpm -r lint`, `pnpm -r typecheck` e `pnpm format:check` saíram 0. |
| C1, C4 | suíte passa, sem rede | atendido | `@casa/web` roda 7 testes sem rede nem banco. Não rodei `apps/api` (precisa de Postgres local). A CI roda a suíte inteira e está verde. |
| C2 | teste por comportamento | atendido | `apps/web/src/lint.test.ts` e `App.test.tsx`. |
| C3 | verificação manual marcada | atendido | A coluna Teste do contrato marca os itens manuais. |
| C5 | correção com teste | não se aplica | Rodada 1. |
| D1, D2 | CI verde e mesmos comandos | atendido | Item 10. `ci.yml`, `.husky` e `pnpm-workspace.yaml` sem diff desde `e30246a`. |
| E1 | sem segredo | atendido | A busca do DoD no diff, fora o lockfile, não achou valor real. |
| E2, E3, E4 | `.env` e variáveis | atendido | Nenhum arquivo de ambiente mudou. O único acréscimo é a tipagem de `VITE_API_URL`, já no `.env.example`. |
| F1, F2 | idioma | atendido | Código e regras em inglês, documentos e commits em pt-BR. |
| I1 | README no mesmo commit | atendido | `README.md` está em `8c6693c` e `057bd84`. |

### Escopo

```
$ git diff --stat origin/main...HEAD
25 files changed, 2201 insertions(+), 847 deletions(-)
```

Todos os arquivos estão na lista do contrato, mais os documentos da própria unidade (`contrato.md`, `execucao.md`, `exploracao.md`) e `estado.md`. `pnpm-workspace.yaml`, `.github/`, `.husky/` e `App.tsx` não têm diff. Bate.

### Regras do repositório

- Código e banco em inglês: `ok`
- Nada assumido fora do brief: `ok`
- Nenhum `[A VALIDAR]` tratado como resolvido: `ok`
- Cabeçalhos e `estado.md` coerentes: `ok`
- Testes de comportamento falharam antes da implementação: `ok`. O registro em `execucao.md` mostra seis falhas, e eu reproduzi removendo `.oxlintrc.json`. O teste e a implementação estão no mesmo commit `8c6693c`, então o git não prova a ordem. Só o registro prova.
- Nenhuma dependência ou versão fora do contrato: `ok`. `package.json` troca `eslint` por `oxlint` `1.85.0` e `oxlint-tsgolint` `7.0.2002`, as versões do contrato. `@casa/config` saiu.
- CI verde no último commit, depois de `M1.4-ci-verificacao`: `ok`
- Ferramenta ou modelo diferente do executor: `ok`. Executor `claude-opus-5`, revisor `claude-sonnet-5-5`. A ferramenta é a mesma.

### Correções exigidas

Nenhuma.

### Observações

1. A política `minimumReleaseAge` do pnpm 12 bloqueou `pnpm install --frozen-lockfile` até 2026-09-22T15:38:03Z. Hoje o install passa sem sobrescrita e a CI está verde. O risco volta a qualquer dependência nova publicada há menos de um dia, e o teste `db:migrate contra host recusado` de `apps/api` também depende dessa política. Sugestão de destino: linha de backlog.
2. `packages/shared/dist` ausente ou velho faz o lint acusar `no-unsafe-call` em `apps/web`. O contrato já descreve o risco e o põe fora desta unidade. Confirmado no registro do executor. Não reproduzi.
3. O `.oxlintrc.json` não lê a opção de severidade `warn` que a referência dá a três regras de React. O contrato fixa `error`, então não é desvio.
4. O oxlint difere do ESLint em três casos de borda, registrados em `execucao.md` (`exhaustive-deps` ancora em outra linha, `no-unsafe-declaration-merging` acusa só a primeira declaração, `no-unused-vars` não acusa `declare module` sem uso). Não reproduzi. Sugestão de destino: nada, ou uma linha de backlog.

## GATE 2

- Aprovação técnica: `revisor separado` em `2026-10-01`
- Veredito do operador: `—`
- Ressalva e destino: `observação 1, linha de backlog a critério do condutor`
