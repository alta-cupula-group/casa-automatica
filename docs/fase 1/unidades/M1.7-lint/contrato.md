> Unidade: `M1.7-lint` · Marco: `M1 · CI` · Trilha: `dividida`
> Estado: aguardando operador
> Condutor aprovou: 2026-09-22 · Operador aprovou: —
> Base: `ordem.md`, `exploracao.md`, `docs/scope-brief.md`, `docs/fase 1/dod.md`

# Contrato — `M1.7-lint`

Este documento é auto-suficiente. Quem executa não leu a exploração e não vai lê-la.
Tudo que a execução precisa está aqui ou nos arquivos nomeados aqui.

## O que será construído

O oxlint substitui o ESLint em todo o repositório. `pnpm -r lint` continua sendo o
comando de lint, e passa a aplicar uma lista fechada de 61 regras em três grupos. O G1
são as regras que o ESLint aplica hoje. O G2 são as regras de React. O G3 são as regras
que usam informação de tipo. O ESLint, as dependências dele e o pacote
`packages/config` saem do repositório. Um teste prova que as regras de cada grupo estão
ligadas. A CI e o hook de pré-commit não mudam de comando.

## Interfaces e formatos

**Comando.** `pnpm -r lint` roda o oxlint em `apps/api`, `apps/web` e `packages/shared`,
cada um pelo script `lint` do próprio `package.json`. O oxlint roda com análise de tipo
ligada, que exige o pacote `oxlint-tsgolint`. A CI, em `.github/workflows/ci.yml`, e o
hook, em `.husky/pre-commit`, continuam chamando `pnpm -r lint` sem nenhuma mudança.

**Configuração.** Um arquivo só, `.oxlintrc.json`, na raiz do repositório. Os três
pacotes usam esse arquivo. Nenhuma categoria de regra do oxlint fica ligada. Só as regras
das listas abaixo ficam ligadas, todas com severidade `error`. `dist/**` fica fora do lint.

G1, em todos os pacotes, 24 regras:

```
typescript/ban-ts-comment               typescript/no-unnecessary-type-constraint
eslint/no-array-constructor             typescript/no-unsafe-declaration-merging
typescript/no-duplicate-enum-values     typescript/no-unsafe-function-type
typescript/no-empty-object-type         eslint/no-unused-expressions
typescript/no-explicit-any              eslint/no-unused-vars
typescript/no-extra-non-null-assertion  typescript/no-wrapper-object-types
typescript/no-misused-new               typescript/prefer-as-const
typescript/no-namespace                 typescript/prefer-namespace-keyword
typescript/no-non-null-asserted-optional-chain
typescript/triple-slash-reference       typescript/no-require-imports
typescript/no-this-alias                eslint/no-var
eslint/prefer-const                     eslint/prefer-rest-params
eslint/prefer-spread
```

G2, obrigatório em `apps/web`, 14 regras. Nos outros pacotes é indiferente, porque eles
não têm React.

```
react-hooks/rules-of-hooks        react/incompatible-library   react/error-boundaries
react-hooks/exhaustive-deps       react/immutability           react/purity
react/static-components           react/globals                react/set-state-in-render
react/use-memo                    react/refs                   react/unsupported-syntax
react/preserve-manual-memoization react/set-state-in-effect
```

G3, em todos os pacotes, 23 regras:

```
typescript/await-thenable                typescript/no-unsafe-call
typescript/no-array-delete               typescript/no-unsafe-enum-comparison
typescript/no-base-to-string             typescript/no-unsafe-member-access
typescript/no-duplicate-type-constituents typescript/no-unsafe-return
typescript/no-floating-promises          typescript/no-unsafe-unary-minus
typescript/no-for-in-array               typescript/only-throw-error
typescript/no-implied-eval               typescript/prefer-promise-reject-errors
typescript/no-misused-promises           typescript/require-await
typescript/no-redundant-type-constituents typescript/restrict-plus-operands
typescript/no-unnecessary-type-assertion typescript/restrict-template-expressions
typescript/no-unsafe-argument            typescript/unbound-method
typescript/no-unsafe-assignment
```

**Opções de regra.** Cada regra roda com as mesmas opções que ela tem no ESLint de
referência. Para o G1, a referência é `tseslint.configs.recommended` do
`typescript-eslint` `8.70.0`, que é a configuração de hoje. Para o G3, é
`tseslint.configs.recommendedTypeChecked` da mesma versão. Para o G2, é o `recommended`
do `eslint-plugin-react-hooks` `7.1.1`.

Atenção a `restrict-template-expressions` e `restrict-plus-operands`. No oxlint, a opção
padrão de uma regra pode diferir da opção do conjunto de referência. Se diferir, a regra
passa a acusar menos, e nenhum erro avisa. O item 5 do DoD pega essa diferença.

**Tipo da variável de ambiente do web.** `import.meta.env.VITE_API_URL` passa a ter o
tipo `string | undefined`, declarado em `apps/web/src/vite-env.d.ts`. Hoje ele chega como
`any`, e a regra `typescript/no-unsafe-assignment` acusa `apps/web/src/App.tsx:4`. Nenhum
outro código de produção muda.

**Teste das regras.** `apps/web/src/lint.test.ts` roda o oxlint com o `.oxlintrc.json`
real contra arquivos de `apps/web/lint-fixtures/`. Cada arquivo viola uma única regra, e o
teste exige que o oxlint acuse exatamente aquela regra. São seis regras, duas por grupo:

| Grupo | Regra |
|---|---|
| G1 | `typescript/no-explicit-any` |
| G1 | `eslint/prefer-const` |
| G2 | `react-hooks/rules-of-hooks` |
| G2 | `react/set-state-in-render` |
| G3 | `typescript/no-floating-promises` |
| G3 | `typescript/no-unsafe-assignment` |

`apps/web/lint-fixtures/` fica fora do `pnpm -r lint`, do build e do typecheck. O teste
roda dentro de `pnpm -r test`, sem banco e sem rede.

## Dependências novas

| Pacote | Versão | De onde saiu a versão |
|---|---|---|
| `oxlint` | `1.85.0` | `pnpm view oxlint version`, em 2026-09-22 |
| `oxlint-tsgolint` | `7.0.2002` | `pnpm view oxlint-tsgolint version`, em 2026-09-22 |

Os dois entram no `devDependencies` do `package.json` da raiz.

Saem do repositório: `eslint`, `typescript-eslint` e `eslint-config-prettier`. Nenhum
pacote do workspace além destes os usa.

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `package.json` | alterar: sai `eslint`, entram `oxlint` e `oxlint-tsgolint` |
| `pnpm-lock.yaml` | alterar, pelo `pnpm install` |
| `.oxlintrc.json` | criar |
| `apps/api/package.json` | alterar: script `lint`, sai `@casa/config` |
| `apps/web/package.json` | alterar: script `lint`, sai `@casa/config` |
| `packages/shared/package.json` | alterar: script `lint`, sai `@casa/config` |
| `apps/api/eslint.config.js` | remover |
| `apps/web/eslint.config.js` | remover |
| `packages/shared/eslint.config.js` | remover |
| `packages/config/package.json` | remover |
| `packages/config/eslint.base.js` | remover |
| `packages/config/eslint.config.js` | remover |
| `apps/web/src/vite-env.d.ts` | criar |
| `apps/web/src/lint.test.ts` | criar |
| `apps/web/lint-fixtures/` | criar, um arquivo por regra da tabela do teste |
| `README.md` | alterar: sai a linha de `@casa/config` da tabela de pacotes, e a linha de `pnpm -r lint` diz oxlint |
| `docs/fase 1/unidades/M1.7-lint/execucao.md` | criar |
| `docs/fase 1/estado.md` | alterar: linha da `M1.7-lint` |

## Fora deste contrato

- Regras do grupo rígido do `typescript-eslint`, o `strictTypeChecked`. O operador deixou
  esse grupo de fora em 2026-09-22.
- Qualquer regra ou categoria do oxlint além das 61 listadas.
- Mudar o comando da CI ou do hook. Os dois continuam chamando `pnpm -r lint`.
- Fazer o hook rodar build antes do lint.
- Trocar o Prettier ou mexer em formatação.
- Criar `tsconfig` novo ou mudar o `include` dos que existem.
- Corrigir código de produção além de `apps/web/src/App.tsx` e do novo `vite-env.d.ts`.
- Mudar `docs/fase 1/roadmap.md` ou os documentos de unidades fechadas que citam ESLint.
  Eles são histórico.
- Liberar script de instalação de pacote em `pnpm-workspace.yaml`.

## Definition of Done

| # | Item | Como verificar | Teste |
|---|---|---|---|
| 1 | O lint passa com o oxlint. | Num clone limpo, depois de `pnpm install --frozen-lockfile` e `pnpm -r build`, `pnpm -r lint` sai com código 0. A saída mostra o oxlint nos três pacotes. | verificação manual, saída em `execucao.md` |
| 2 | O ESLint saiu do repositório. | `pnpm ls -r --depth Infinity eslint typescript-eslint eslint-config-prettier` não lista nenhum pacote. `git ls-files` não lista nenhum `eslint.config.js` e nada em `packages/config/`. | verificação manual |
| 3 | A configuração liga exatamente as 61 regras, e nenhuma categoria. | Comparação direta de `.oxlintrc.json` com as três listas deste contrato. Se o oxlint `1.85.0` tiver um comando que imprime a configuração efetiva, a saída dele entra em `execucao.md`. | verificação manual |
| 4 | Cada grupo está ligado. | `pnpm --filter @casa/web test` passa. Antes de o `.oxlintrc.json` existir, o mesmo teste falha, e a falha fica registrada. | `apps/web/src/lint.test.ts`, um caso por regra da tabela do teste |
| 5 | As opções de regra batem com o ESLint de referência. | Num clone descartável, antes de remover o ESLint, e depois de `pnpm -r build`, o executor roda o ESLint com as três referências da seção de opções e o oxlint com o `.oxlintrc.json` novo. As duas listas de arquivo, linha e regra são iguais. As duas listas entram em `execucao.md`. O `eslint-plugin-react-hooks` `7.1.1` entra só nesse clone, nunca no repositório. | verificação manual |
| 6 | O `VITE_API_URL` tem tipo. | `pnpm -r typecheck` sai com código 0, e o item 1 passa com `typescript/no-unsafe-assignment` ligada. | o teste existente `apps/web/src/App.test.tsx` continua passando |
| 7 | Os arquivos de teste das regras não vazam. | O item 1 passa com `apps/web/lint-fixtures/` presente. `apps/web/dist/` não tem nenhum arquivo vindo de `lint-fixtures/` depois de `pnpm -r build`. | verificação manual |
| 8 | O lint ficou mais rápido. | `time pnpm -r lint` roda três vezes antes da troca e três depois, na mesma máquina. A mediana de depois é menor. | verificação manual, saída em `execucao.md` |
| 9 | O `README.md` descreve o novo lint. | `git grep -n -i eslint README.md` não devolve nada. | verificação manual |
| 10 | A CI passa. | O check `CI / verificar` está verde no último commit da PR da unidade. | CI |

O DoD geral em `docs/fase 1/dod.md` vale por cima deste.

## Riscos

| Risco | Sinal de que aconteceu | O que fazer |
|---|---|---|
| O oxlint rodado de dentro de um pacote não acha o `.oxlintrc.json` da raiz, ou a análise de tipo só liga no arquivo da raiz. | O item 1 ou o item 4 falha, ou uma regra do G3 não acusa nada. | Apontar a configuração da raiz de forma explícita no script `lint`. Se nem assim funcionar, parar e reportar. |
| O script `lint` de um pacote não acha o binário do oxlint instalado na raiz. | `pnpm -r lint` falha com comando não encontrado. | Declarar `oxlint` e `oxlint-tsgolint`, na mesma versão, no `devDependencies` dos três pacotes, e registrar isso em `execucao.md`. |
| A opção padrão de uma regra no oxlint difere da referência. | O item 5 mostra listas diferentes. | Passar no `.oxlintrc.json` a opção da referência para aquela regra, até as listas baterem. Se a opção não existir no oxlint, parar e reportar. |
| O `.oxlintrc.json` não consegue ignorar `apps/web/lint-fixtures/` no lint normal e ainda deixar o teste usá-lo. | O item 1 falha, ou o teste não enxerga os arquivos. | Restringir o script `lint` de `apps/web` a caminhos que não incluem `lint-fixtures/`, em vez de usar a lista de ignorados. |
| A análise de tipo não roda num arquivo fora de todo `tsconfig`. | Os casos do G3 no teste não acusam nada. | Parar e reportar. Criar `tsconfig` está fora deste contrato. |
| O `pnpm install` pede para liberar script de instalação de `oxlint` ou `oxlint-tsgolint`. | Aviso do pnpm sobre `allowBuilds`, ou o binário não roda. | Parar e reportar. Não mexer em `pnpm-workspace.yaml`. |
| A documentação do oxlint pede TypeScript 7 para a análise de tipo, e o repositório usa `6.0.3`. | Erro do `oxlint-tsgolint` ao rodar. | Parar e reportar. Trocar a versão do TypeScript está fora deste contrato. |
| O hook acusa erro falso quando `packages/shared/dist` está ausente ou velho. Isso vale para o oxlint e valeria para o ESLint com o G3. `apps/api` e `apps/web` leem os tipos do `@casa/shared` no `dist`, e o hook não roda build. | Erro de lint ou de tipo que some depois de `pnpm -r build`. | Nada nesta unidade. O problema já existe no `pnpm -r typecheck` do hook. O condutor verificou em 2026-09-22 num clone limpo: sem `dist`, o typecheck falha com `TS2307` em `apps/web/src/App.tsx:1`. Com `dist` velho, ele falha com `TS2305`. O executor registra em `execucao.md` se o problema aparecer. |

## Depende de

`M1.4-ci-verificacao`, fechada em 2026-09-16.

## Teste de auto-suficiência

Aplicado pelo condutor antes do GATE 1.

> Um executor que leu só este contrato, as regras do repositório e os arquivos nomeados
> acima consegue entregar sem fazer nenhuma pergunta?

Resposta: `sim` · Verificado em: 2026-09-22

O executor precisa descobrir sozinho a sintaxe do `.oxlintrc.json` e das flags do
oxlint. A regra 01 manda buscar isso na documentação oficial da versão instalada. Todo
ponto em que essa descoberta pode falhar tem uma linha em Riscos.

## Perguntas ao operador

Nenhuma. A opção e os grupos foram decididos pelo operador em 2026-09-22. A decisão está
registrada no fim de `exploracao.md`.

## Alterações

| Data | O que mudou | Motivo | Reaprovado em |
|---|---|---|---|
