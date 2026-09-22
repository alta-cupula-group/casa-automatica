> Unidade: `M1.7-lint` · Marco: `M1 · CI` · Trilha: `dividida`
> Estado: em revisão
> Executor · Ferramenta: `Claude Code, modelo claude-opus-5` · Data: `2026-09-22` · Rodada: `1`
> Contrato aprovado em: condutor `2026-09-22` · operador `2026-09-22`

# Execução — `M1.7-lint`

## O que ficou pronto

`pnpm -r lint` roda o oxlint `1.85.0` nos três pacotes, com análise de tipo pelo
`oxlint-tsgolint` `7.0.2002`. A configuração é uma só, `.oxlintrc.json`, na raiz. Ela
desliga as sete categorias e liga só as 61 regras do contrato, todas `error`. Ela liga
`options.typeAware` e ignora `**/dist/**`.

O oxlint acha o `.oxlintrc.json` da raiz sozinho quando roda de dentro de um pacote. Os
scripts `lint` de `apps/api` e `packages/shared` são `oxlint`. O de `apps/web` é
`oxlint src vite.config.ts`. A restrição de caminho é a saída que a tabela de Riscos
prevê: o `ignorePatterns` da configuração vale também para o arquivo passado ao teste, e
a flag `--no-ignore` não o anula.

O ESLint, o `typescript-eslint`, o `eslint-config-prettier`, os três `eslint.config.js` e
o pacote `packages/config` saíram. `import.meta.env.VITE_API_URL` tem o tipo
`string | undefined`, declarado em `apps/web/src/vite-env.d.ts`. O `App.tsx` não mudou.

`apps/web/src/lint.test.ts` roda o binário do oxlint com o `.oxlintrc.json` real contra
os seis arquivos de `apps/web/lint-fixtures/`. Ele exige que cada arquivo acuse só a regra
dele. O oxlint reporta a regra de hooks como `react-hooks/rules-of-hooks`, igual ao nome
do contrato.

O lint caiu de uma mediana de 3,503 s para 0,794 s.

## Testes antes da implementação

O teste e os fixtures vieram antes do `.oxlintrc.json`. Primeira execução, na versão
inicial do teste, que ainda esperava `react/rules-of-hooks` e passava `--no-ignore`:

```
$ pnpm --filter @casa/web test
     × G1 acusa só typescript/no-explicit-any em no-explicit-any.ts 9ms
     × G1 acusa só eslint/prefer-const em prefer-const.ts 1ms
     × G2 acusa só react/rules-of-hooks em rules-of-hooks.tsx 1ms
     × G2 acusa só react/set-state-in-render em set-state-in-render.tsx 1ms
     × G3 acusa só typescript/no-floating-promises em no-floating-promises.ts 1ms
     × G3 acusa só typescript/no-unsafe-assignment em no-unsafe-assignment.ts 1ms
Error: Configuração do oxlint não encontrada em <worktree>/.oxlintrc.json.
      Tests  6 failed | 1 passed (7)
exit=1
```

A mesma falha com a versão final do teste, num clone do commit `8c6693c` sem o
`.oxlintrc.json`:

```
$ mv .oxlintrc.json <scratchpad>/ && pnpm --filter @casa/web test
     × G1 acusa só typescript/no-explicit-any em no-explicit-any.ts 8ms
     × G1 acusa só eslint/prefer-const em prefer-const.ts 1ms
     × G2 acusa só react-hooks/rules-of-hooks em rules-of-hooks.tsx 1ms
     × G2 acusa só react/set-state-in-render em set-state-in-render.tsx 1ms
     × G3 acusa só typescript/no-floating-promises em no-floating-promises.ts 1ms
     × G3 acusa só typescript/no-unsafe-assignment em no-unsafe-assignment.ts 1ms
Error: Configuração do oxlint não encontrada em <scratchpad>/clean1/.oxlintrc.json.
      Tests  6 failed | 1 passed (7)
```

## Arquivos tocados

```
$ git diff --stat e30246a..HEAD
 .oxlintrc.json                                 |   80 ++
 README.md                                      |    3 +-
 apps/api/eslint.config.js                      |    2 -
 apps/api/package.json                          |    3 +-
 apps/web/eslint.config.js                      |    2 -
 apps/web/lint-fixtures/no-explicit-any.ts      |    2 +
 apps/web/lint-fixtures/no-floating-promises.ts |    8 +
 apps/web/lint-fixtures/no-unsafe-assignment.ts |    5 +
 apps/web/lint-fixtures/prefer-const.ts         |    5 +
 apps/web/lint-fixtures/rules-of-hooks.tsx      |   10 +
 apps/web/lint-fixtures/set-state-in-render.tsx |    8 +
 apps/web/package.json                          |    3 +-
 apps/web/src/lint.test.ts                      |   82 ++
 apps/web/src/vite-env.d.ts                     |    4 +
 docs/fase 1/estado.md                          |    2 +-
 docs/fase 1/unidades/M1.7-lint/contrato.md     |    4 +-
 package.json                                   |    3 +-
 packages/config/eslint.base.js                 |    8 -
 packages/config/eslint.config.js               |    2 -
 packages/config/package.json                   |   16 -
 packages/shared/eslint.config.js               |    2 -
 packages/shared/package.json                   |    3 +-
 pnpm-lock.yaml                                 | 1075 ++++++------------------
```

Saída do commit `8c6693c`, antes deste registro. Todos os arquivos estão na lista do
contrato. `contrato.md` mudou no commit `24b9605`, do condutor, antes da execução.
`estado.md` mudou em `f247213`, do condutor, e no commit deste registro.
`pnpm-workspace.yaml` não mudou. O `pnpm add` o tinha alterado, e eu desfiz a alteração.
A seção Bloqueios explica.

## Definition of Done

Toda execução local de pnpm abaixo roda com `pnpm_config_minimum_release_age=0` no
ambiente. Sem isso o pnpm 12 recusa o lockfile até 2026-09-22T15:38:03Z. A seção
Bloqueios explica.

### DoD 1 — O lint passa com o oxlint.
Situação: `atendido, com a ressalva da política de idade`. Num clone do commit `8c6693c`:
```
$ pnpm install --frozen-lockfile        # sem a sobrescrita
? Verifying lockfile against supply-chain policies (242 entries)...
Error: ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION
install sem sobrescrita exit=1

$ pnpm install --frozen-lockfile        # com a sobrescrita
install exit=0
$ pnpm -r build
build exit=0
$ pnpm -r lint
packages/shared lint$ oxlint
packages/shared lint: Done
apps/api lint$ oxlint
apps/web lint$ oxlint src vite.config.ts
apps/web lint: Done
apps/api lint: Done
lint exit=0
```

### DoD 2 — O ESLint saiu do repositório.
Situação: `atendido`
```
$ pnpm ls -r --depth Infinity eslint typescript-eslint eslint-config-prettier
exit=0                                  # nenhuma linha listada
$ git ls-files | grep -E 'eslint\.config\.js|^packages/config/'
exit=1                                  # nenhuma linha
```

### DoD 3 — A configuração liga exatamente as 61 regras, e nenhuma categoria.
Situação: `atendido`. Comparação do arquivo com as três listas do contrato, e da
configuração efetiva, que o oxlint `1.85.0` imprime com `--print-config`:
```
$ python3 <compara .oxlintrc.json com as três listas do contrato>
arquivo: 61 iguais ao contrato: True severidades: {'error'} categorias: {'correctness': 'off', 'suspicious': 'off', 'pedantic': 'off', 'perf': 'off', 'style': 'off', 'restriction': 'off', 'nursery': 'off'}

$ oxlint --print-config > print-config.json && python3 <compara com as listas>
categories: {'correctness': 'allow', 'perf': 'allow', 'suspicious': 'allow', 'restriction': 'allow', 'nursery': 'allow', 'style': 'allow', 'pedantic': 'allow'}
options: {'typeAware': True} ignorePatterns: ['**/dist/**']
regras efetivas: 61 | severidades: ['deny']
contrato: 61 | efetivas: 61 | iguais: True | diferença: []
```
A configuração efetiva escreve as regras do plugin `eslint` sem prefixo e as de
`react-hooks` como `react/`. A comparação normaliza só isso. As categorias precisam de
`off` explícito: com `"categories": {}`, o `--print-config` mostra `correctness` ligada.

### DoD 4 — Cada grupo está ligado.
Situação: `atendido`. Teste: `apps/web/src/lint.test.ts`, `configuração do oxlint`, seis
casos `<grupo> acusa só <regra> em <arquivo>`.
```
$ pnpm --filter @casa/web test
 Test Files  2 passed (2)
      Tests  7 passed (7)
```
A falha antes do `.oxlintrc.json` está na seção de testes. Como prova extra, num clone
descartável, tirar um grupo da configuração derruba só os dois casos dele:
```
== sem G1   × G1 ... no-explicit-any   × G1 ... prefer-const              Tests  2 failed | 5 passed (7)
== sem G2   × G2 ... rules-of-hooks    × G2 ... set-state-in-render       Tests  2 failed | 5 passed (7)
== sem G3   × G3 ... no-floating-promises   × G3 ... no-unsafe-assignment Tests  2 failed | 5 passed (7)
```

### DoD 5 — As opções de regra batem com o ESLint de referência.
Situação: `atendido`. Clone descartável no commit `f247213`, antes da troca, com
`pnpm -r build`. Só nesse clone entraram `eslint-plugin-react-hooks@7.1.1`,
`typescript-eslint@8.70.0`, `eslint-config-prettier@10.1.8`, `oxlint` e
`oxlint-tsgolint`. O ESLint roda com `tseslint.configs.recommended`,
`tseslint.configs.recommendedTypeChecked`, `reactHooks.configs.flat.recommended` em
`apps/web/**` e `eslint-config-prettier`. O oxlint roda com o `.oxlintrc.json` novo. Os
caminhos são os que o `pnpm -r lint` novo cobre.
```
$ compare.sh clone5 apps/api apps/web/src apps/web/vite.config.ts packages/shared
eslint exit=1
oxlint exit=1
== ESLint
apps/web/src/App.tsx:4 no-unsafe-assignment
== oxlint
apps/web/src/App.tsx:4 no-unsafe-assignment
== iguais: True
```
As duas regras de atenção já têm no oxlint o mesmo padrão da referência. Os padrões de
`restrict-template-expressions` no `configuration_schema.json` do oxlint e no
`dist/rules/restrict-template-expressions.js` do `typescript-eslint` 8.70.0 são iguais:
`allowAny`, `allowBoolean`, `allowNullish`, `allowNumber` e `allowRegExp` valem `true`, e
`allow` é `Error`, `URL` e `URLSearchParams` de `lib`. Os de `restrict-plus-operands` também:
`allowAny`, `allowBoolean`, `allowNullish`, `allowNumberAndString` e `allowRegExp` valem
`true`, e `skipCompoundAssignments` vale `false`. O `recommendedTypeChecked` liga as duas
regras só com `'error'`, sem opção. Por isso o `.oxlintrc.json` não passa opção nenhuma.

O código do repositório só gera um achado. Por isso rodei também um corpus de sondagem em
`apps/web/src/probe/` do clone, com 51 regras acusando. Ele tem 15 expressões de template para
`restrict-template-expressions` e 15 somas para `restrict-plus-operands`. As listas batem em
97 linhas de 100. Todas as linhas das duas regras de atenção batem. As três diferenças
não são de opção. Elas estão em Encontrado e não tocado.

### DoD 6 — O `VITE_API_URL` tem tipo.
Situação: `atendido`
```
$ pnpm -r typecheck
typecheck exit=0
$ pnpm -r lint              # com typescript/no-unsafe-assignment ligada
lint exit=0
$ pnpm --filter @casa/web test     # inclui src/App.test.tsx
      Tests  7 passed (7)
```

### DoD 7 — Os arquivos de teste das regras não vazam.
Situação: `atendido`. No clone do commit `8c6693c`, depois de `pnpm -r build`:
```
$ find apps/web/dist -type f
apps/web/dist/index.html
apps/web/dist/assets/index-BTj6aNul.js
$ grep -rl -E 'no-explicit-any|lint-fixtures|Loose|parse\(text' apps/web/dist
grep dist exit=1
```
O bundle tem o mesmo nome com hash, `index-BTj6aNul.js`, do build de antes da troca. O
item 1 passou com `apps/web/lint-fixtures/` presente.

### DoD 8 — O lint ficou mais rápido.
Situação: `atendido`. Mesma máquina, no worktree, `time pnpm -r lint`:

| Execução | ESLint, antes | oxlint, depois |
|---|---|---|
| 1 | 4,256 s | 1,039 s |
| 2 | 3,503 s | 0,751 s |
| 3 | 3,432 s | 0,794 s |
| mediana | 3,503 s | 0,794 s |

Todas as seis execuções saíram com código 0.

### DoD 9 — O `README.md` descreve o novo lint e os pacotes que existem.
Situação: `atendido`. Item alterado no contrato em 2026-09-22, commit `f8aa17c`.
```
$ git grep -n -i eslint README.md
exit=1
$ git grep -n -i "configuração" README.md
README.md:313:configuração da Data API, e veja que ela aparece desligada.
exit=0
$ sed -n 3,9p README.md
Software da casa de três moradores. Este repositório é um monorepo pnpm com três pacotes.

| Pacote         | Caminho           | O que é                                  |
| -------------- | ----------------- | ---------------------------------------- |
| `@casa/api`    | `apps/api`        | processo Node da API                     |
| `@casa/web`    | `apps/web`        | aplicação React servida pelo Vite        |
| `@casa/shared` | `packages/shared` | código compartilhado entre `api` e `web` |
$ pnpm format:check
All matched files use Prettier code style!
format exit=0
$ pnpm -r lint
packages/shared lint$ oxlint
packages/shared lint: Done
apps/api lint$ oxlint
apps/web lint$ oxlint src vite.config.ts
apps/web lint: Done
apps/api lint: Done
lint exit=0
```
A única linha com "configuração" fala da Data API do Supabase, não de um pacote. A frase
de abertura conta três pacotes, os mesmos três da tabela.

### DoD 10 — A CI passa.
Situação: `não verificado`. A ordem proíbe push, e não existe PR. A CI vai falhar em
`pnpm install --frozen-lockfile` se rodar antes de 2026-09-22T15:38:03Z. Ver Bloqueios.

### DoD geral da fase

| Item | Situação | Evidência |
|---|---|---|
| A1 | atendido | `git log`: `e30246a docs(M1.7): contrato aprovado` vem antes de `8c6693c feat(M1.7): ...` |
| A2 | atendido | este documento |
| A3 | atendido | `git diff --stat` acima |
| A4 | atendido | `em revisão` no cabeçalho e em `estado.md` |
| A5 | atendido | `feat(M1.7): ...` e `docs(M1.7): ...`, em pt-BR |
| B1 | atendido com ressalva | DoD 1. Instalação congelada só passa com a sobrescrita até 15:38:03Z |
| B2 | atendido | DoD 1 |
| B3 | atendido | `pnpm -r typecheck` exit=0 no clone limpo |
| B4 | atendido | `pnpm format:check`: `All matched files use Prettier code style!`, exit=0 no clone limpo |
| C1 | atendido com ressalva | ver abaixo |
| C2 | atendido | DoD 4 aponta `apps/web/src/lint.test.ts`. DoD 6 aponta `apps/web/src/App.test.tsx` |
| C3 | atendido | o contrato marca os itens manuais |
| C4 | atendido | o teste novo roda o binário local, sem rede e sem banco |
| D1 | não verificado | sem push, ver DoD 10 |
| D2 | atendido | `.github/workflows/ci.yml` não mudou e chama `pnpm -r lint` |
| E1 | atendido | a busca só acha nomes de pacote do lockfile: `js-tokens@4.0.0` e `@csstools/css-tokenizer@4.0.0` |
| E2 | atendido | `git ls-files` com `.env` lista só os três `.env.example` |
| E3, E4 | atendido | `VITE_API_URL` já está em `apps/web/.env.example`, e é a única variável lida em `apps/web/src` |
| F1, F2 | atendido | leitura do diff |
| I1 | atendido | `README.md` mudou no mesmo commit |

C1, no clone do commit `8c6693c`, com Postgres local na porta `54399`:
```
$ pnpm -r test
apps/api test:  FAIL  src/db/migrate.test.ts > DoD 4: falha > db:migrate contra host recusado escreve em stderr e sai com 1
apps/api test:       Tests  1 failed | 58 passed (59)
Received: "Error: ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION ..."
```
Esse teste chama `pnpm run db:migrate` num processo filho que só recebe `PATH` e `HOME`,
então a sobrescrita não chega nele. Com `HOME` apontando para uma pasta descartável cujo
`.config/pnpm/config.yaml` tem `minimumReleaseAge: 0`:
```
$ HOME=<scratchpad>/fakehome pnpm -r test
packages/shared test:       Tests  3 passed (3)
apps/web test:       Tests  7 passed (7)
apps/api test:       Tests  59 passed (59)
test exit=0
```

### CI
Não verificado. Nenhum push foi feito, como a ordem pede.

## Bloqueios e dúvidas

**B1 — política `minimumReleaseAge` do pnpm 12.** O pnpm `12.4.1` recusa pacote
publicado há menos de um dia, e isso vale também para `pnpm install --frozen-lockfile` e
para a checagem que ele faz antes de rodar um script. O `oxlint` `1.85.0` e os 19
binários `@oxlint/binding-*` foram publicados entre 2026-09-21T15:29:48Z e
2026-09-21T15:38:03Z. O `oxlint-tsgolint` `7.0.2002` é de 2026-09-18 e não é afetado.

- O `pnpm add` gravou em `pnpm-workspace.yaml` uma lista `minimumReleaseAgeExclude` com
  os 20 pacotes. Esse arquivo não está na lista do contrato, e a seção Fora proíbe mexer
  nele. Eu desfiz a mudança. O lockfile vale sem ela.
- Até 2026-09-22T15:38:03Z, sem sobrescrita, um clone limpo e a CI falham em
  `pnpm install --frozen-lockfile` com `ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION`. O teste
  `db:migrate contra host recusado` de `apps/api/src/db/migrate.test.ts` também falha.
- Depois desse instante, a política deixa de valer para esses pacotes sem nenhuma
  mudança no repositório. Isso é inferência da mensagem do pnpm, que compara a data de
  publicação com um corte de 24 horas. Eu não verifiquei depois do horário.

Pergunta ao condutor: esperar o horário e só então abrir a PR, ou levar ao operador a
inclusão de `pnpm-workspace.yaml` no contrato. Não decidi nenhuma das duas.

## Encontrado e não tocado

1. **README, linhas 3 e 4.** A frase dizia que o monorepo tem "três pacotes de produto e
   um de configuração". O contrato foi alterado em 2026-09-22, no commit `f8aa17c`, e a
   frase foi corrigida no commit `docs(M1.7): abertura do README corrigida`. Ver DoD 9.
2. **Diferenças de implementação no corpus de sondagem do DoD 5.** Nenhuma tem opção que
   a corrija:
   - `react-hooks/exhaustive-deps`: o oxlint ancora o achado na linha do uso da variável.
     O ESLint ancora no array de dependências. É o mesmo achado, com a linha diferente
     quando os dois ficam em linhas distintas.
   - `typescript/no-unsafe-declaration-merging`: o ESLint acusa a interface e a classe. O
     oxlint acusa só a primeira declaração. A regra não tem opção no `typescript-eslint`
     8.70.0, porque o `schema` é `[]`.
   - `eslint/no-unused-vars`: o ESLint acusa `declare module Legacy {}` sem uso. O oxlint
     não acusa. Nenhuma opção do `no-unused-vars` do oxlint trata módulo ambiente.
3. **O `recommended` do `eslint-plugin-react-hooks` 7.1.1 tem 16 regras.** As duas fora
   do contrato são `react-hooks/config` e `react-hooks/gating`. Nenhuma acusou nada na
   comparação. A referência também dá severidade `warn` a `exhaustive-deps`,
   `incompatible-library` e `unsupported-syntax`. O contrato fixa `error` para as 61.
4. **O risco do `dist` ausente aparece com o oxlint.** No clone limpo, sem
   `packages/shared/dist`, `pnpm -r lint` falha com
   `src/App.tsx:9:32: error typescript(no-unsafe-call)`. Depois de `pnpm -r build` ele
   passa. É o mesmo problema que o contrato descreve para o `typecheck` do hook.
5. A análise de tipo funciona em arquivo fora de todo `tsconfig`, como os de
   `apps/web/lint-fixtures/`. O `oxlint-tsgolint` traz o próprio `typescript-go`, e o
   TypeScript `6.0.3` do repositório não gerou erro.

## Como reverter

```bash
git revert <commit deste registro> 8c6693c
pnpm install
```
