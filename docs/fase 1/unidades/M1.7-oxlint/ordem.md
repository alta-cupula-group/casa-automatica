> Unidade: `M1.7-oxlint` · Marco: `M1 · CI` · Trilha: `dividida`
> Estado: em exploração
> Emitida por: condutor · Data: 2026-09-21

# Ordem de exploração — `M1.7-oxlint`

## Contexto

O lint do repositório hoje é ESLint `10.10.0`, declarado no `package.json` da raiz. A
configuração compartilhada fica em `packages/config/eslint.base.js`. Ela junta
`typescript-eslint` `recommended` e `eslint-config-prettier`, e ignora `dist/**`. Os
quatro pacotes do workspace reexportam essa base num `eslint.config.js` próprio e rodam
`eslint .` no script `lint`.

O `pnpm -r lint` roda em três lugares: na CI, em `.github/workflows/ci.yml`, no hook
`.husky/pre-commit`, e no `README.md`. O item B2 do `docs/fase 1/dod.md` exige que ele
saia com código 0.

O operador decidiu em 2026-09-20 trocar o ESLint pelo oxlint enquanto o repositório é
pequeno. Cada unidade que passa antes desta aumenta o que vai ter que ser convertido.
Ela é a posição 2 da fila aprovada em 2026-09-21.

O fatiamento descreveu a entrega como "mesma cobertura de regras, incluindo
`react-hooks`". O condutor achou uma contradição nisso ao emitir esta ordem. O ESLint de
hoje não carrega nenhuma regra de `react-hooks`. Manter a mesma cobertura e acrescentar
`react-hooks` são duas entregas diferentes. A escolha é do operador, e a P5 levanta o
custo de cada uma.

## O que esta unidade deve entregar

`pnpm -r lint` roda oxlint em vez de ESLint nos quatro pacotes, sai com código 0, e
reprova pelo menos as regras que o ESLint reprova hoje. A CI, o hook local e o
`README.md` passam a usar o oxlint, e o ESLint sai do repositório.

## Trilha escolhida

`dividida`. A unidade muda uma convenção que toda unidade seguinte vai consumir, e a
exploração depende de investigação externa sobre o oxlint. Pela regra 02, qualquer um
dos dois critérios já basta.

O contrato precisa ser auto-suficiente num ponto: ele tem que nomear a lista de regras
que o oxlint vai aplicar e dizer de onde cada uma veio. Um executor que receba só "troque
o ESLint pelo oxlint" liga o conjunto padrão da ferramenta, e ninguém consegue dizer se a
cobertura caiu.

## Perguntas a responder

1. **P1** — Quais regras o ESLint aplica hoje em cada pacote? Mostre a lista efetiva com
   `eslint --print-config` num arquivo `.ts` de cada pacote, e num `.tsx` de
   `apps/web`. Separe as regras ligadas das que o `eslint-config-prettier` desliga.
2. **P2** — Qual versão do oxlint está publicada hoje? Mostre com `pnpm view oxlint
   version` e diga a data de publicação. Diga como ele se instala num workspace pnpm: um
   pacote só na raiz ou um por app.
3. **P3** — Para cada regra ligada da P1, o oxlint tem uma equivalente? Monte uma tabela
   com três colunas: regra do ESLint, regra do oxlint, e se ela existe na versão da P2.
   A evidência sai da documentação oficial dessa versão, com a URL, ou da saída de
   `oxlint --rules`. Regra sem equivalente fica na tabela, marcada como perda.
4. **P4** — Alguma regra da P1 depende de informação de tipo? Se depender, diga se o
   oxlint cobre regra com tipo na versão da P2, e o que isso exige: pacote extra,
   `tsconfig`, flag. Mostre de onde tirou a resposta.
5. **P5** — Quanto custa acrescentar as regras de `react-hooks` ao oxlint, comparado a
   não acrescentar? Diga se elas existem no oxlint sem plugin extra. Rode as duas
   configurações em `apps/web` e mostre quantos avisos cada uma dá hoje. Não escolha
   entre as duas; isso é do operador.
6. **P6** — O oxlint entra em conflito com o Prettier? Diga se alguma regra de estilo
   dele vem ligada por padrão e se o `eslint-config-prettier` ainda tem papel depois da
   troca. Mostre com a documentação oficial.
7. **P7** — Qual é a diferença de tempo? Meça `pnpm -r lint` com o ESLint de hoje e com
   o oxlint configurado como na P3, três vezes cada, com `time` ou `hyperfine`. Mostre a
   saída e a máquina em que rodou.
8. **P8** — Quais arquivos e dependências saem, quais entram, e quais mudam? Liste cada
   `eslint.config.js`, cada script `lint`, `packages/config/package.json` com o
   `exports`, a CI, o hook, e o `README.md`. Diga se o pacote `@casa/config` continua
   tendo motivo para existir depois da troca, e o que mais usa ele. Para cada dependência
   que sai, mostre que nenhum outro pacote a usa.
9. **P9** — Como provar por comando que a cobertura não caiu? Proponha um teste que
   falha com o oxlint quando uma regra da tabela da P3 é violada. Por exemplo: um arquivo
   com violação conhecida, fora do build, que o oxlint tem que reprovar. Diga o que não
   dá para provar assim.

## Limites

- Não altere nada além de `docs/fase 1/unidades/M1.7-oxlint/exploracao.md`. Experimento
  fica num clone ou num diretório temporário fora do repositório, com a saída dos
  comandos no relatório.
- Não troque o Prettier. Formatação não faz parte desta unidade.
- Não decida sobre `react-hooks`. Traga o custo das duas opções na P5 e transforme a
  escolha em pergunta ao operador.
- Não proponha regra nova além das que o ESLint aplica hoje e das de `react-hooks`.
  Regra extra que pareça útil vira sugestão para o `docs/fase 1/backlog.md`, no fim do
  relatório.
- Não mexa na forma do hook nem da CI. A `M1.4-ci-verificacao` já decidiu que o hook roda
  lint e tipos, e que a CI roda lint, tipos, testes e build. Só o comando de lint muda.
- Não trate auditoria de dependência vulnerável. Isso é `M1.9-auditoria-dependencias`.

## Fontes a consultar

- `packages/config/eslint.base.js` e `packages/config/package.json`.
- O `eslint.config.js` e o `package.json` de cada pacote em `apps/` e `packages/`.
- `package.json` da raiz e `pnpm-lock.yaml`.
- `.github/workflows/ci.yml`, passo `Lint`.
- `.husky/pre-commit`.
- `README.md`, seções de comandos e do hook.
- `docs/fase 1/dod.md`, seção B.
- `docs/fase 1/unidades/M1.4-ci-verificacao/contrato.md`.
- Documentação oficial do oxlint, na versão da P2: instalação, arquivo de configuração,
  lista de regras, plugins, regras com tipo.
- Registro do npm: `pnpm view oxlint`.

## Branch

`unidade/M1.7-oxlint` para a execução. A `main` está protegida por ruleset, então nada
entra nela direto. O relatório de exploração entra por pull request, de uma branch
`docs/M1.7-exploracao`.

## Depende de

`M1.4-ci-verificacao`, fechada em 2026-09-16.
