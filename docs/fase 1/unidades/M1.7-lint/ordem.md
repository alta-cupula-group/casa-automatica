> Unidade: `M1.7-lint` · Marco: `M1 · CI` · Trilha: `dividida`
> Estado: em exploração
> Emitida por: condutor · Data: 2026-09-21

# Ordem de exploração — `M1.7-lint`

## Contexto

O lint do repositório hoje é ESLint `10.10.0`, declarado no `package.json` da raiz. A
configuração compartilhada fica em `packages/config/eslint.base.js`. Ela junta
`typescript-eslint` `recommended` e `eslint-config-prettier`, e ignora `dist/**`. Os
quatro pacotes do workspace reexportam essa base num `eslint.config.js` próprio e rodam
`eslint .` no script `lint`.

O `pnpm -r lint` roda em três lugares: na CI, em `.github/workflows/ci.yml`, no hook
`.husky/pre-commit`, e no `README.md`. O item B2 do `docs/fase 1/dod.md` exige que ele
saia com código 0.

A unidade nasceu em 2026-09-20 como `M1.7-oxlint`, para trocar o ESLint pelo oxlint.
Em 2026-09-21 o operador ampliou o objetivo. Antes de trocar, ele quer comparar três
formas de fazer o lint, e decidir também quais regras o lint aplica. A unidade foi
renomeada para `M1.7-lint` na mesma data. Ela é a posição 2 da fila aprovada em
2026-09-21.

## O que esta unidade deve entregar

`pnpm -r lint` roda a ferramenta e o conjunto de regras que o operador escolher a partir
deste relatório, sai com código 0, e a CI, o hook local e o `README.md` usam essa
ferramenta. A escolha acontece antes do contrato.

## As três opções a comparar

- **A** — oxlint no lugar do ESLint. O ESLint sai do repositório.
- **B** — ESLint mantido, com mais regras do que hoje.
- **C** — oxlint e ESLint juntos. O oxlint aplica as regras que cobre, e o ESLint aplica
  só as que faltam, sem regra repetida nas duas ferramentas.

## Os grupos de regras a medir

- **G1** — as regras que o ESLint aplica hoje.
- **G2** — as regras de hooks do React, só em `apps/web`.
- **G3** — as regras de `typescript-eslint` que usam informação de tipo, no conjunto
  recomendado da versão instalada.
- **G4** — o conjunto rígido de `typescript-eslint`, além do G3.

O nome exato de cada conjunto sai da documentação oficial da versão instalada. Se o
nome que esta ordem usa não existir, o explorador diz qual é o equivalente.

## Trilha escolhida

`dividida`. A unidade muda uma convenção que toda unidade seguinte vai consumir, e a
exploração depende de investigação externa sobre duas ferramentas. Pela regra 02,
qualquer um dos dois critérios já basta.

O contrato precisa ser auto-suficiente num ponto: ele tem que nomear as regras que cada
ferramenta aplica e dizer de onde cada uma veio. Um executor que receba só "troque o
lint" liga o conjunto padrão da ferramenta, e ninguém consegue dizer o que passou a ser
pego e o que deixou de ser.

## Perguntas a responder

1. **P1** — Quais regras o ESLint aplica hoje em cada pacote? Mostre a lista efetiva com
   `eslint --print-config` num arquivo `.ts` de cada pacote e num `.tsx` de
   `apps/web`. Separe as regras ligadas das que o `eslint-config-prettier` desliga. Essa
   lista é o G1.
2. **P2** — Quais versões estão publicadas hoje de `oxlint`, `typescript-eslint`, e do
   plugin de hooks do React para ESLint? Mostre com `pnpm view <pacote> version`. Para a
   opção C, diga se existe um pacote oficial que desliga no ESLint as regras que o oxlint
   já cobre, e a versão dele.
3. **P3** — Monte uma tabela com uma linha por regra dos grupos G1 a G4. As colunas são
   o grupo, a regra no ESLint, a regra no oxlint ou "não existe", e se a regra do oxlint
   depende de flag ou pacote extra. A evidência sai da documentação oficial da versão da
   P2, com a URL, ou da saída de `oxlint --rules`.
4. **P4** — As regras com informação de tipo, no G3 e no G4, rodam no oxlint na versão
   da P2? Se rodam, diga o que isso exige e em que estado a documentação oficial as
   declara. Mostre de onde tirou a resposta.
5. **P5** — Quantas violações o código de hoje dá em cada grupo? Rode cada grupo contra
   o repositório e mostre a contagem por pacote e por regra. Essa é a quantidade de
   correção que cada grupo custa agora.
6. **P6** — Quanto tempo o lint leva? Meça `pnpm -r lint` em seis casos: ESLint com G1,
   ESLint com G1 a G3, ESLint com G1 a G4, oxlint com o que ele cobre de G1 a G3, e a
   opção C com G1 a G3 e com G1 a G4. Rode cada caso três vezes com `time` ou
   `hyperfine`. Meça também `pnpm -r typecheck`, para comparar com o que o hook já gasta.
   Diga a máquina em que rodou.
7. **P7** — O oxlint entra em conflito com o Prettier? Diga se alguma regra de estilo
   dele vem ligada por padrão, e se o `eslint-config-prettier` ainda tem papel em cada
   opção. Mostre com a documentação oficial.
8. **P8** — Para cada opção, quais arquivos e dependências saem, quais entram, e quais
   mudam? Cubra cada `eslint.config.js`, cada script `lint`,
   `packages/config/package.json` com o `exports`, a CI, o hook, e o `README.md`. Diga
   se o pacote `@casa/config` continua tendo motivo para existir em cada opção. Para cada
   dependência que sai, mostre que nenhum outro pacote a usa.
9. **P9** — Como provar por comando que cada regra escolhida está ligada? Proponha um
   teste que falha quando uma regra da tabela da P3 deixa de ser aplicada. Por exemplo:
   um arquivo com violação conhecida, fora do build, que o lint tem que reprovar. Diga o
   que não dá para provar assim.
10. **P10** — Monte um quadro final com uma linha por combinação de opção e grupos. As
    colunas são as regras cobertas, as perdidas, as violações a corrigir, o tempo, e as
    dependências. Esse quadro é o que o operador usa para decidir.

## Limites

- Não altere nada além de `docs/fase 1/unidades/M1.7-lint/exploracao.md`. Experimento
  fica num clone ou num diretório temporário fora do repositório, com a saída dos
  comandos no relatório.
- Não escolha a opção nem os grupos. Isso é do operador. Traga o quadro da P10 e
  transforme a escolha em pergunta ao operador, com a recomendação do explorador.
- Não troque o Prettier. Formatação não faz parte desta unidade.
- Não meça regra fora dos grupos G1 a G4. Regra extra que pareça útil vira sugestão para
  o `docs/fase 1/backlog.md`, no fim do relatório.
- Não corrija as violações que a P5 encontrar. Contar é o suficiente.
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
- Documentação oficial do `typescript-eslint`, na versão da P2: conjuntos de regras e
  regras com tipo.
- Registro do npm: `pnpm view <pacote>`.

## Branch

`unidade/M1.7-lint` para a execução. A `main` está protegida por ruleset, então nada
entra nela direto. O relatório de exploração entra por pull request, de uma branch
`docs/M1.7-exploracao`.

## Depende de

`M1.4-ci-verificacao`, fechada em 2026-09-16.
