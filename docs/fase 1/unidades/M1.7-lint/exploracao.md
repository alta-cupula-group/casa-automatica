> Unidade: `M1.7-lint` · Marco: `M1 · CI` · Trilha: `dividida`
> Estado: contrato em rascunho
> Explorador · Ferramenta: `Claude Code` · Modelo: `claude-sonnet-5` · Data: `2026-09-22`

# Exploração — `M1.7-lint`

## Resumo

`pnpm -r lint` hoje aplica 24 regras (G1), 0 violações, ~3,5 s. Testei G1-G4 do ESLint e
o equivalente no oxlint num clone fora do repositório, com build feito antes de medir.
Quase todo nome de regra do ESLint tem par no oxlint (94 de 96), e com a mesma opção de
regra as duas concordam violação por violação (23 = 23) — a divergência da primeira
versão deste relatório (23 contra 11) era eu não ter passado ao oxlint a opção "estrita"
que o `strictTypeChecked` usa em 3 regras, corrigida com evidência no achado 5.
`--type-aware` do oxlint funcionou com TypeScript 6.0.3 (doc pede 7+) e também dá falso
positivo sem build, igual ao ESLint. G3/G4 no ESLint falham ao type-checar `eslint.
config.js` e `drizzle.config.ts` (fora do `include` do `tsconfig`); o oxlint não tem esse
problema e acha 1 violação real que o ESLint não acha. Falta do operador: a opção (A/B/C)
e os grupos.

## Respostas

### P1 — Quais regras o ESLint aplica hoje em cada pacote?

**Resposta:** As mesmas 24 regras em `apps/api`, `apps/web` e `packages/shared`: 20 regras
de `@typescript-eslint` do conjunto `recommended` (versão instalada `8.70.0`) e 4 regras
base do ESLint (`no-var`, `prefer-const`, `prefer-rest-params`, `prefer-spread`) que o
próprio `recommended` do typescript-eslint religa para arquivo `.ts`/`.tsx`. Em
`packages/config`, que só linta `.js`, ficam 20 regras: as 4 base não se aplicam porque
`tseslint.configs.recommended` restringe seu bloco de regras JS puro a `**/*.ts`/`**/*.tsx`
(evidência: comparação de `--print-config` entre um arquivo `.ts` e um `.js`, seção
"Material bruto"). O `eslint-config-prettier@10.1.8` desliga **0 regras** nesse conjunto:
nenhuma das 24 conflita com formatação (evidência: `--print-config` com e sem o import de
`prettier` em `eslint.base.js`, mesmo resultado). Essa é a lista G1, com 24 regras.

**Evidência:**
```
$ node -v && pnpm -v
v26.9.0
12.4.1
$ (cd apps/api && npx eslint --print-config src/index.ts) | tail -c 400
    "ecmaVersion": 2026, "parser": "typescript-eslint/parser@8.70.0", ...
# on-set idêntico em apps/api, apps/web, packages/shared: 24 regras
# on-set em packages/config: 20 regras (faltam as 4 regras base do ESLint)
```
Trecho de `packages/config/eslint.base.js:1-8`:
```js
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
export const base = tseslint.config(
  { ignores: ['dist/**'] },
  ...tseslint.configs.recommended,
  prettier,
);
```

**Confiança:** fato verificado.

### P2 — Quais versões estão publicadas hoje de `oxlint`, `typescript-eslint`, e do plugin de hooks do React? Existe pacote que desliga no ESLint as regras que o oxlint já cobre?

**Resposta:** `oxlint` `1.85.0`. `typescript-eslint` publicado `8.70.1` (o repositório trava
em `8.70.0`, uma patch atrás). `eslint-plugin-react-hooks` `7.1.1`. `eslint-config-prettier`
`10.1.8` (igual à travada). Existe: `eslint-plugin-oxlint` `1.84.0`, do mesmo projeto
`oxc-project`, com o propósito declarado "Turn off all rules already supported by
`oxlint`". Ele expõe `configs['flat/recommended']` e também `buildFromOxlintConfigFile`,
que lê o `.oxlintrc.json` real do repositório para desligar exatamente as regras que ele
configura, em vez de uma lista fixa — importante porque a lista fixa do pacote vem de um
commit fixo do oxc (README: "The rules are extracted from [...] `rules.rs`") e pode ficar
desatualizada.

**Evidência:**
```
$ pnpm view oxlint version            -> 1.85.0
$ pnpm view typescript-eslint version -> 8.70.1
$ pnpm view eslint-plugin-react-hooks version -> 7.1.1
$ pnpm view eslint-config-prettier version    -> 10.1.8
$ pnpm view eslint-plugin-oxlint version      -> 1.84.0
$ grep "typescript-eslint@8.70.0" pnpm-lock.yaml -> presente (versão travada no repo)
```
`node_modules/.../eslint-plugin-oxlint/README.md`: "Turn off all rules already supported
by oxlint. The rules are extracted from [...] `oxc_linter/src/rules.rs`."

**Confiança:** fato verificado.

### P3 — Tabela regra por regra dos grupos G1 a G4

**Resposta:** 96 regras nomeadas nos quatro grupos (G1: 24, G2: 16, G3: 23, G4: 26). O
oxlint tem um nome equivalente para 94 delas; **não existem** `@typescript-eslint/no-
generated-empty-object-type` (G4) e as duas regras não-hooks de `react-hooks/config` e
`react-hooks/gating` (G2, ver P8 sobre o motivo). Das 94 que existem, **nenhuma vem ligada
por padrão** nos grupos G2, G3 e G4: todas exigem `.oxlintrc.json` explícito. G3 e G4 além
disso exigem `--type-aware` na linha de comando e o pacote `oxlint-tsgolint`. G2 exige
`--react-plugin`. Só 11 das 24 regras de G1 vêm ligadas pelo padrão de fábrica do oxlint
(categoria `correctness`, sem nenhum arquivo de configuração); as outras 13 de G1 também
precisam de config explícito, mas sem flag nem pacote extra. A tabela completa está em
"Material bruto". Três regras de G3/G4 (`restrict-plus-operands`, `restrict-template-
expressions`, `return-await`) têm, no código-fonte do `typescript-eslint@8.70.0`, uma
opção "recomendada" (permissiva) e uma opção "estrita" (restritiva) diferentes; o
`strictTypeChecked` do ESLint aplica a opção estrita, e o oxlint, sem receber essa opção
explícita, aplica a permissiva dele (que é igual à opção "recomendada" do typescript-
eslint). Nomear a regra não basta para essas três: o contrato precisa nomear a opção
também. Ver achado 5 revisado, com a evidência de que, passando a mesma opção, as duas
ferramentas concordam.

**Evidência:** ver comando `oxlint --rules --format=json` e a tabela completa no fim.

**Confiança:** fato verificado, pela saída de `oxlint --rules --format=json` (870 regras
listadas, com campo `default` e `category` por regra) cruzada com os nomes de regra do
`typescript-eslint` obtidos via `import('typescript-eslint').then(m => m.configs...)`.

### P4 — As regras com tipo (G3, G4) rodam no oxlint na versão da P2? O que isso exige?

**Resposta:** Rodam, com `--type-aware` e o pacote `oxlint-tsgolint@7.0.2002` instalado.
A documentação oficial diz "TypeScript 7.0+ is required" e que o motor é `typescript-go`
(reescrita em Go do compilador, embutida no `oxlint-tsgolint`, não é o pacote `typescript`
do projeto). Testei contra o `tsconfig.base.json` real do repositório (`target: ES2023`,
`module: nodenext`, `strict: true`, `verbatimModuleSyntax: true`) com `typescript@6.0.3`
instalado, e funcionou: um arquivo de teste com `doSomethingAsync()` sem `await` foi pego
por `no-floating-promises` com `--type-aware`. Não travou por causa da versão do
`typescript` do projeto. Não testei tsconfig com as opções que a doc cita como removidas
no TS 7 (`baseUrl`, por exemplo); o repositório não usa `baseUrl`, então esse risco não
se manifestou aqui, mas não é uma prova de que nunca vai se manifestar.

**Evidência:**
```
$ pnpm view oxlint-tsgolint version
7.0.2002
$ pnpm add -D -w oxlint-tsgolint@7.0.2002
$ ./node_modules/.bin/oxlint --type-aware apps/api/src/scratch-typeaware.ts
src/scratch-typeaware.ts:6:3: error typescript(no-floating-promises): Promises must be
awaited [...]
exit=1
```
`https://oxc.rs/docs/guide/usage/linter/type-aware.html`, texto literal extraído do HTML:
"Type-aware linting is powered by typescript-go. TypeScript 7.0+ is required [...] Type-
aware linting requires an additional dependency: `pnpm add -D oxlint-tsgolint@latest`."

**Confiança:** fato verificado para o caso testado (tsconfig atual do repositório). A
compatibilidade geral com qualquer opção de tsconfig é hipótese, porque só testei o
tsconfig que já existe aqui.

### P5 — Quantas violações o código de hoje dá em cada grupo?

**Resposta:** Medido depois de `pnpm -r build` (sem isso, `@casa/shared` não tem `dist/`
e todo import dele vira `any`, inflando falsamente G3/G4 — ver "Achados não previstos").
A primeira rodada desta exploração configurou o oxlint sem as opções de regra que o
ESLint usa por padrão em `strictTypeChecked`, o que gerou uma contagem menor no oxlint.
Corrigido (ver P3 revisado e achado 5 revisado): com as mesmas opções de regra, as duas
ferramentas concordam.

| Grupo | ESLint: violações reais | ESLint: "erros" de arquivo fora do `tsconfig` | oxlint: violações (opções iguais ao ESLint) |
|---|---|---|---|
| G1 | 0 | 0 | 0 |
| G2 (`apps/web` só) | 0 | 0 | 0 |
| G1+G3 | 1 (`apps/web/src/App.tsx:4`, `no-unsafe-assignment`) | 6 | 1 (mesmo arquivo e regra) |
| G1+G3+G4 | 23 | 6 | 24 |

Por pacote, ESLint G1-G4 (23 reais): `apps/api` 21 (`restrict-template-expressions` 12,
`no-confusing-void-expression` 5, `no-unnecessary-condition` 3, `no-unnecessary-boolean-
literal-compare` 1), `apps/web` 1 (`no-unsafe-assignment`), `packages/shared` 1
(`restrict-template-expressions`), `packages/config` 0. oxlint G1-G4, com as mesmas
opções de regra (24): `apps/api` 21 (`restrict-template-expressions` 12,
`no-confusing-void-expression` 5, `no-unnecessary-condition` 3, `no-unnecessary-boolean-
literal-compare` 1 — os quatro números batem com o ESLint), `apps/web` 1
(`no-unsafe-assignment`, bate com o ESLint), `packages/shared` 1
(`restrict-template-expressions`, bate com o ESLint), `packages/config` 1 (`no-deprecated`
em `eslint.base.js`, que só o oxlint acha, porque o ESLint falha em parsear esse arquivo
antes de rodar qualquer regra nele — ver achado 2). Os "erros de arquivo fora do tsconfig"
do ESLint caem em `apps/api/drizzle.config.ts`, `apps/api/eslint.config.js`,
`apps/web/eslint.config.js`, `packages/shared/eslint.config.js`,
`packages/config/eslint.base.js`, `packages/config/eslint.config.js`: seis arquivos reais
do repositório, nenhum arquivo de teste meu.

**Evidência:** JSON de `eslint -f json` e de `oxlint --format=json` por grupo, com as
opções de regra corrigidas, em "Material bruto".

**Confiança:** fato verificado, no clone e com o build feito antes. A causa da diferença
original (ponto 1 da devolução do condutor de 2026-09-22) está detalhada no achado 5
revisado.

### P6 — Quanto tempo o lint leva?

**Resposta:** Máquina: `Intel(R) Core(TM) i7-10610U CPU @ 1.80GHz`, 8 threads, 15 GiB RAM,
Linux, SSD local. **Esta não é a máquina do hook** (notebook de quem commita) **nem a do
runner da CI** (`ubuntu-24.04` do GitHub Actions) **nem o servidor** (`pve`, Core
i5-7200U, 2 núcleos/4 threads). Os números só comparam as opções entre si nesta máquina;
não projetam o tempo real do hook, da CI ou do servidor.

| Caso | Execução 1 | Execução 2 | Execução 3 |
|---|---|---|---|
| ESLint G1 (`pnpm -r lint`, 4 pacotes) | 3581 ms | 3528 ms | 3588 ms |
| ESLint G1 a G3 (4 pacotes) | 14693 ms | 14538 ms | 14480 ms |
| ESLint G1 a G4 (4 pacotes) | 14913 ms | 15069 ms | 14869 ms |
| oxlint, G1 (sem `--type-aware`) | 152 ms | 137 ms | 124 ms |
| oxlint, G1 a G3 (`--type-aware`) | 727 ms | 601 ms | 650 ms |
| oxlint, G1 a G4 (`--type-aware`) | 616 ms | 533 ms | 491 ms |
| ESLint com zero regras (residual da opção C) | 2772 ms | 2686 ms | 2670 ms |
| `pnpm -r typecheck` | 3647 ms | 3603 ms | 3701 ms |

O tempo de G1-G3 e G1-G4 no ESLint é quase igual: o custo é abrir o programa TypeScript
por pacote (`projectService`), não o número de regras. A opção C soma o tempo do oxlint
com um resíduo do ESLint de ~2,7 s, dominado pela sobrecarga fixa de `npx` e do parser por
pacote, não pelas regras (confirmado rodando ESLint com zero regras ligadas).

**Evidência:** medições com `date +%s%N` antes/depois de cada comando, 3 repetições, em
"Material bruto".

**Confiança:** fato verificado nesta máquina. Hipótese: o comportamento relativo (oxlint
muito mais rápido, G3≈G4 no ESLint) deve se repetir no runner e no servidor, mas não medi
neles.

### P7 — O oxlint entra em conflito com o Prettier?

**Resposta:** Não encontrei nenhuma regra de formatação (`quotes`, `semi`, `indent`,
`comma-dangle` etc.) entre as 870 regras do oxlint; nenhuma delas existe no catálogo. As
regras de categoria `style` que existem são de idioma de código (`arrow-body-style`,
`jsx-boolean-value`), não de espaçamento. A formatação é trabalho de uma ferramenta
separada do mesmo projeto, o `oxfmt`, que tem sua própria página "Migrate from Prettier" e
que a ordem exclui explicitamente ("Não troque o Prettier"). Dentro do ESLint,
`eslint-config-prettier` continua com papel nas opções B e C, mas hoje desliga 0 regras
porque G1 já não inclui nada que colida com formatação (resposta de P1). Se o operador
adicionar ao G4 alguma regra de estilo puro do typescript-eslint (`prefer-return-this-
type`, por exemplo, não é de formatação, mas `stylistic`/`stylisticTypeChecked` seriam),
`eslint-config-prettier` passaria a ter efeito real; não testei esse conjunto porque não
está nos grupos G1-G4 da ordem.

**Evidência:** busca em `/tmp/oxlint-rules.json` (870 regras) por `quotes|semi|indent|
comma-dangle|space-before` não encontrou nenhuma. Página oficial lista "Oxfmt" como
produto distinto, com sua própria seção "Migrate from Prettier" na navegação.

**Confiança:** fato verificado para as 870 regras listadas na versão `1.85.0`. Não é
garantia de que uma versão futura nunca adicione regra de formatação.

### P8 — Arquivos e dependências por opção

**Resposta:**

*Opção A (só oxlint):* saem `eslint`, `typescript-eslint`, `eslint-config-prettier` do
repositório. Confirmei que nenhum arquivo de código importa `eslint` ou `typescript-
eslint` diretamente (só aparecem em `package.json`); `eslint` só está declarado na raiz,
`typescript-eslint`/`eslint-config-prettier` só em `packages/config/package.json`. Cada
`eslint.config.js` (4 arquivos) e `packages/config/eslint.base.js`/`eslint.config.js`
saem. Entram: `oxlint`, e se o operador quiser G3/G4, `oxlint-tsgolint`. O oxlint descobre
config por diretório (`.oxlintrc.json`, `oxlint.config.ts`) com a regra "nested config":
"For each file being linted, Oxlint uses the nearest config file [...] relative to that
file" — ou seja, ele já tem um mecanismo próprio de config por pacote, sem precisar de um
pacote `@casa/config` para isso. Como o único conteúdo hoje de `@casa/config` é o eslint
compartilhado (`package.json` só tem o export `"./eslint"`), a Opção A **remove o motivo
de `@casa/config` existir**, a não ser que o operador queira usá-lo para outra coisa
depois. Um limite documentado importa aqui: `options.typeAware` e `options.typeCheck` só
valem no config **raiz**; um `.oxlintrc.json` de pacote não pode religar isso sozinho.

*Opção B (ESLint só, mais regras):* nenhum arquivo sai. `packages/config/eslint.base.js`
ganha `tseslint.configs.recommendedTypeChecked`/`strictTypeChecked` conforme os grupos
escolhidos, e cada `eslint.config.js` de pacote precisa de `languageOptions.parserOptions.
projectService: true` (ou equivalente) para ligar a informação de tipo — não descobri um
jeito de ligar isso só na base compartilhada sem que cada pacote aponte seu próprio
`tsconfigRootDir`, porque o valor certo depende do diretório de cada pacote. Se o
operador quiser G2, entra `eslint-plugin-react-hooks` só em `apps/web`. `@casa/config`
continua com o mesmo motivo de existir.

*Opção C (as duas):* entra `oxlint` (e `oxlint-tsgolint` se G3/G4), entra `eslint-plugin-
oxlint` no lado do ESLint, usando `buildFromOxlintConfigFile` para ler o `.oxlintrc.json`
real em vez da lista fixa do pacote. `eslint.base.js` ganha esse import. Nada sai, porque
a lista "sem sobreposição" ainda depende de 2 regras que o oxlint não tem
(`no-generated-empty-object-type`, e as regras `react-hooks/config`/`react-hooks/gating`
se o operador quiser G2 completo): o ESLint continua rodando, só que com menos regras.

Comum às três: a CI (`.github/workflows/ci.yml`, passo "Lint") e o hook (`.husky/pre-
commit`) chamam só `pnpm -r lint`; não precisam saber qual ferramenta está por trás. O
`README.md` (linha 64, tabela de comandos) descreve hoje "roda o ESLint em todos os
pacotes" e precisa mudar de texto em qualquer opção que não seja B pura.

**Evidência:**
```
$ grep -rn '"eslint"\|"typescript-eslint"\|"eslint-config-prettier"' --include=package.json .
packages/config/package.json:13:    "eslint-config-prettier": "10.1.8",
packages/config/package.json:14:    "typescript-eslint": "8.70.0"
package.json:20:    "eslint": "10.10.0",
$ grep -rln "from 'eslint'" apps packages --include="*.ts" --include="*.tsx" --include="*.js"
(vazio)
```
`https://oxc.rs/docs/guide/usage/linter/nested-config.html` (via busca, conteúdo
reproduzido pela ferramenta de busca): "For each file being linted, Oxlint uses the
nearest config file [...] options.typeAware and options.typeCheck are only supported in
the root config file, and nested configs should not set these fields."

**Confiança:** fato verificado para o que já existe no repositório (dependências, quem
usa o quê). Hipótese para o texto exato da regra "nested config", porque vi esse trecho
via resultado de busca, não abri a página original com sucesso (retornou 404 na url que
tentei, ver "Não descoberto").

### P9 — Como provar por comando que cada regra está ligada?

**Resposta:** Proposta: um diretório `tools/lint-fixtures/` (fora do build, ignorado no
`tsconfig` e no `.gitignore` do build mas versionado) com um arquivo por regra escolhida,
cada um violando só aquela regra, e um script que roda o comando de lint contra esse
diretório isolado e espera código de saída diferente de zero **e** a regra certa na saída.
Testei o princípio nesta exploração: escrevi `src/scratch-typeaware.ts` com uma promise
não tratada e `oxlint --type-aware` reprovou citando `no-floating-promises`; escrevi um
componente com hook condicional e `oxlint --react-plugin -D rules-of-hooks` reprovou
citando `rules-of-hooks`. O mesmo vale para o ESLint. O que **não dá para provar assim**:
que a regra está ligada com a mesma severidade e as mesmas opções em produção (só prova
"liga", não "liga com as opções X"); e não prova nada sobre desempenho ou sobre regras
que dependem de código real do projeto (como `restrict-template-expressions`, que se
comportou diferente entre ferramentas no mesmo código, P5) — para essas, o teste de
fixture isolado passaria nas duas ferramentas mesmo elas discordando em casos reais.

**Evidência:** comandos rodados nesta sessão, reproduzidos em "Material bruto".

**Confiança:** proposta do explorador, não testada como script definitivo no repositório
real (a ordem proíbe alterar o repositório).

### P10 — Quadro final

| Opção | Grupos | Regras cobertas | Regras perdidas | Violações a corrigir | Tempo (nesta máquina) | Dependências |
|---|---|---|---|---|---|---|
| A (só oxlint) | G1 | 24/24 nomes existem, 13 exigem config extra | 0 por nome; comportamento pode variar | 0 | ~130 ms | + `oxlint`; − `eslint`, `typescript-eslint`, `eslint-config-prettier`; `@casa/config` sem motivo |
| A | G1-G3 | 23/23 existem | 0 por nome | 1 (oxlint) | ~650 ms | + `oxlint-tsgolint` |
| A | G1-G4 | 49/50 existem (falta `no-generated-empty-object-type`) | 1 regra | 24 (oxlint, com as mesmas opções de regra do ESLint) | ~550 ms | idem |
| A | G1+G2 (`apps/web`) | 14/16 existem | `config`, `gating` | 0 | não medido isolado | + `--react-plugin` |
| B (só ESLint) | G1 | 24/24 (hoje) | 0 | 0 | ~3,6 s | nenhuma nova |
| B | G1-G3 | 47/47 | 0 | 1 real + 6 erro de arquivo fora do tsconfig | ~14,5 s | nenhuma nova |
| B | G1-G4 | 73/73 | 0 | 23 reais + 6 erro de arquivo | ~14,9 s | nenhuma nova |
| B | G1+G2 (`apps/web`) | 16/16 | 0 | 0 | não medido isolado | + `eslint-plugin-react-hooks` |
| C (as duas) | G1-G3 | oxlint cobre 23, ESLint cobre 0 | 0 por nome | 1 (oxlint) + resíduo do ESLint | ~650 ms + ~2,7 s | + `oxlint`, `oxlint-tsgolint`, `eslint-plugin-oxlint` |
| C | G1-G4 | oxlint cobre 49, ESLint cobre 1 (`no-generated-empty-object-type`) | 0 | 24 (oxlint) + 0 (a 1 regra que sobra pro ESLint não tem violação) | ~550 ms + ~2,7 s | idem |

O risco desta tabela não é mais "regra com o mesmo nome dá resultado diferente": com a
mesma opção de regra, ESLint e oxlint concordam violação por violação (achado 5
revisado). O risco real é que **o oxlint tem opção de regra separada da severidade**
(`"regra": "error"` liga a regra com a opção permissiva padrão dela, não com a opção que
o ESLint usa em `strictTypeChecked`), e escrever `.oxlintrc.json` sem essa opção emburrece
a regra em silêncio, sem erro nem aviso. O contrato precisa nomear a opção de cada regra
que tiver uma, não só o nome da regra.

## Superfície

| Arquivo ou recurso | Existe hoje | O que muda |
|---|---|---|
| `package.json` (raiz) | sim | `eslint` sai (A) ou fica (B/C); `oxlint`/`oxlint-tsgolint`/`eslint-plugin-oxlint` entram conforme a opção |
| `packages/config/package.json` | sim | `exports."./eslint"` sai (A) ou muda de conteúdo (B/C); `typescript-eslint`/`eslint-config-prettier` saem (A) |
| `packages/config/eslint.base.js` | sim | sai (A); ganha `recommendedTypeChecked`/`strictTypeChecked` + `projectService` (B/C) |
| `apps/api/eslint.config.js`, `apps/web/eslint.config.js`, `packages/shared/eslint.config.js`, `packages/config/eslint.config.js` | sim, 4 arquivos | saem (A); ganham `projectService`+`tsconfigRootDir` (B/C) |
| `.oxlintrc.json` (raiz, e possivelmente por pacote) | não | entra em A e C |
| `.github/workflows/ci.yml`, passo "Lint" | sim, chama `pnpm -r lint` | não muda a chamada; muda o que `lint` executa |
| `.husky/pre-commit` | sim, chama `pnpm -r lint && pnpm -r typecheck` | mesma observação; ver risco sobre ordem build/lint |
| `README.md:64` | sim, "roda o ESLint em todos os pacotes" | texto muda em A e C |
| `apps/web/src/App.tsx` | sim | tem 1 violação real de tipo hoje (`no-unsafe-assignment`), independente da opção, se G3+ for adotado |
| `apps/web` sem `vite-env.d.ts` | confirmado ausente | causa do achado acima; fora do escopo desta unidade corrigir |

## Achados não previstos

1. **Import cruzado quebra sem build, nas duas ferramentas.** Antes de `pnpm -r build`,
   G3/G4 no ESLint acusam `no-unsafe-call`/`no-unsafe-assignment` em `apps/api/src/
   index.ts` e `apps/web/src/App.tsx` só porque `@casa/shared` ainda não tem `dist/
   index.d.ts` (o `package.json` de `@casa/shared` aponta `types` para `./dist/
   index.d.ts`, que só existe depois do build). Repeti o teste com `oxlint --type-aware`
   em G1-G3, sem build: o mesmo problema aparece, com `no-unsafe-call` em
   `apps/api/src/index.ts` e em `apps/web/src/App.tsx` (este segundo, além da violação
   real e independente de build que o arquivo já tem). Não é um problema do ESLint; é um
   problema de type-checar um monorepo com pacote não buildado, que as duas ferramentas
   herdam igual. Isso importa porque **o hook de pré-commit roda `pnpm -r lint &&
   pnpm -r typecheck` sem `pnpm -r build` antes** (`.husky/pre-commit:1`). Se o operador
   adotar G3 ou G4, em qualquer opção (A, B ou C), um commit que mexe em `packages/shared`
   sem rodar build antes pode acusar violação de tipo falsa no hook, que desaparece na CI
   (que builda antes de lintar). Isso não está no contrato de `M1.4-ci-verificacao` nem na
   ordem desta unidade.

2. **`eslint.config.js` e `drizzle.config.ts` ficam fora do `tsconfig` `include`.** Com
   G3/G4 no ESLint, esses 6 arquivos reais (listados na superfície) dão erro de parsing
   por falta de informação de tipo, não uma violação de regra. Adotar G3/G4 no ESLint
   exige decidir se esses arquivos entram no `include` de algum `tsconfig`, se ganham um
   `tsconfig` próprio, ou se ficam com `ignores` no `eslint.config.js` — nenhuma opção
   está escrita em lugar nenhum hoje. O oxlint não teve esse problema nos mesmos arquivos.

3. **`eslint-plugin-react-hooks@7.1.1` não é "regras de hooks".** A versão publicada hoje
   junta ao `recommended` 14 regras que vêm do linter do React Compiler (`immutability`,
   `purity`, `set-state-in-effect`, `static-components` etc.), além das 2 regras clássicas
   (`rules-of-hooks`, `exhaustive-deps`). O README do pacote descreve isso como "enforces
   the Rules of React and other best practices". G2 na ordem foi descrito como "as regras
   de hooks do React"; a realidade instalável hoje é maior que isso, e o oxlint tem
   equivalente nomeado para a maioria dessas regras extras (as rodei manualmente e
   confirmei que pegam violação real, ver P9).

4. **`tseslint.config(...)` está deprecated.** O oxlint, rodando `no-deprecated` sobre
   `packages/config/eslint.base.js` (arquivo real, hoje), relatou: "`config` is
   deprecated. ESLint core now provides this functionality via `defineConfig()`, which we
   now recommend instead", com link para a doc do typescript-eslint. Isso vale
   independente da opção escolhida (A, B ou C), porque `eslint.base.js` usa esse helper
   hoje. O ESLint não achou isso porque falhou em type-checar esse arquivo (achado 2).

5. **Mesma regra, contagem diferente — causa encontrada: opção de regra, não
   implementação diferente (revisado).** Na primeira rodada desta exploração,
   `restrict-template-expressions` deu 13 violações no ESLint (dentro de `strictTypeChecked`)
   contra 0 no oxlint com a regra citada só pelo nome, no mesmo código. Abri o
   código-fonte da regra instalada
   (`node_modules/.../@typescript-eslint/eslint-plugin/dist/rules/restrict-template-
   expressions.js`): a regra tem duas famílias de opção, uma "recomendada" (permissiva:
   `allowAny/allowBoolean/allowNullish/allowNumber/allowRegExp: true`) e uma "estrita"
   (`false` em todas). O preset `recommendedTypeChecked` do ESLint usa a opção permissiva;
   `strictTypeChecked` troca para a estrita — é isso, e não G1 nem G3, que liga a regra
   nesse projeto. A doc oficial do oxlint para essa regra
   (`https://oxc.rs/docs/guide/usage/linter/rules/typescript/restrict-template-
   expressions.html`) documenta o oxlint com a opção permissiva como padrão
   (`allowAny: true`, etc.), igual à opção "recomendada" do typescript-eslint. Passando a
   mesma opção estrita ao oxlint (`"typescript/restrict-template-expressions": ["error",
   {"allowAny": false, "allowBoolean": false, "allowNever": false, "allowNullish": false,
   "allowNumber": false, "allowRegExp": false}]`), a contagem bate: **13 no oxlint,
   idêntica ao ESLint**, arquivo por arquivo. Encontrei mais duas regras de G3/G4 com essa
   mesma separação recomendado/estrito no código-fonte: `restrict-plus-operands` e
   `return-await`; nenhuma das duas tinha violação em nenhuma das ferramentas antes ou
   depois do ajuste (0 e 0), então não geravam divergência visível, mas o contrato precisa
   nomear a opção delas também. Não encontrei nenhuma outra regra de G3/G4 com essa
   separação. **Conclusão revisada:** com a mesma opção de regra, ESLint e oxlint
   concordam violação por violação no código de hoje; o oxlint ainda acha 1 violação que
   o ESLint não acha (`no-deprecated` em `eslint.base.js`), mas isso vem do achado 2
   (arquivo fora do `tsconfig`), não de comportamento de regra diferente. O risco real não
   é "oxlint se comporta diferente"; é "`.oxlintrc.json` sem a opção certa liga a regra
   calada, sem erro, no nível de exigência errado".

## Opções

A ordem já nomeia as três opções. O quadro completo, com número, está em P10. Aqui vai
só o resumo de custo e consequência que o molde pede.

### Opção A — só oxlint
O que é: o ESLint sai do repositório; o oxlint assume G1 e o que ele cobrir de G2-G4.
Custo: perde 1 regra nominal de G4 e, se G2 entrar completo, 2 regras de hooks/compiler;
`packages/config` perde seu único motivo de existir; todo mundo aprende uma ferramenta
nova; pelo menos 3 regras (`restrict-plus-operands`, `restrict-template-expressions`,
`return-await`) exigem escrever a opção da regra no `.oxlintrc.json`, não só o nome, ou
ficam mais permissivas que o padrão que o time já usa (achado 5). Consequência: lint de
7 a 25 vezes mais rápido nesta máquina (P6); com a opção certa, o comportamento regra por
regra é o mesmo que o ESLint dá hoje (achado 5).

### Opção B — ESLint com mais regras
O que é: fica só o ESLint; G2-G4 entram nele. Custo: G3/G4 custam ~4x o tempo de G1 nesta
máquina e expõem os achados 1 e 2 (arquivo de config fora do `tsconfig`, hook sem build
antes de lintar tipo). Consequência: nenhuma dependência nova, nenhuma ferramenta nova.

### Opção C — as duas, sem regra repetida
O que é: oxlint cobre o que consegue, ESLint cobre só o resto, coordenado por
`eslint-plugin-oxlint`. Custo: duas ferramentas no pipeline; `eslint-plugin-oxlint`
precisa ficar sincronizado com o `.oxlintrc.json` real (`buildFromOxlintConfigFile`, não
testado nesta exploração). Consequência: a maior parte do lint fica rápida (oxlint) e o
que falta (hoje, 1 a 3 regras) continua garantido pelo ESLint.

Propor é papel do explorador. Escolher, não.

## Não descoberto

- **Se existe alguma quarta regra de G3/G4 com opção recomendado/estrito divergente
  além das três que encontrei** (`restrict-plus-operands`, `restrict-template-
  expressions`, `return-await`). Cheguei a essas três por `grep` no código-fonte
  instalado do `typescript-eslint@8.70.0` procurando a chave `strict:` dentro de
  `meta.docs.recommended` de cada arquivo de regra dos grupos G3/G4; não fiz o mesmo
  levantamento para o G1 nem verifiquei se o oxlint tem alguma outra regra com default
  diferente do documentado por um motivo que não seja essa chave.
- **Comportamento em `ubuntu-24.04` (runner da CI) e no servidor `pve`.** Só medi tempo
  nesta máquina de trabalho. Não tenho acesso ao runner nem ao servidor para repetir a
  medição.
- **`https://oxc.rs/docs/guide/usage/linter/nested-config.html` não abriu direto** pela
  ferramenta de busca de página (retornou 404 na URL testada por mim,
  `.../linter/config/nested-configs.html`); o conteúdo citado em P8 vem de um resultado
  de busca que reproduziu trechos da página, não da página em si. Marco essa citação como
  confiança menor que as demais.
- **Se algum tsconfig do projeto usa opção "removida no TypeScript 7"**, a doc do oxlint
  cita isso como risco de `--type-aware` travar. Não achei nenhuma no `tsconfig.base.json`
  nem nos `tsconfig.json` de pacote, mas não testei exaustivamente contra a lista completa
  de opções descontinuadas do TypeScript 7, porque essa lista não estava na página que
  consultei.
- **eslint-plugin-oxlint via `buildFromOxlintConfigFile`**: não testei essa função na
  prática (só confirmei que existe no pacote), porque a opção C precisaria primeiro do
  `.oxlintrc.json` final decidido pelo operador.

## Riscos vistos daqui

| Risco | Sinal de que aconteceu | O que fazer |
|---|---|---|
| Hook aprova o que a CI reprova (achado 1), em qualquer opção A/B/C | commit passa local, falha na CI, se G3/G4 entrar em qualquer ferramenta | decidir se o hook builda antes de lintar, ou se G3/G4 não entra |
| `eslint.config.js`/`drizzle.config.ts` quebram o lint tipado no ESLint (achado 2) | erro de parsing, não de regra, ao ligar G3/G4 no ESLint | decidir `include`/`ignores` antes do contrato |
| G2 traz mais regra do que o esperado (achado 3) | violação nova em componente React que não é de hook | decidir se quer o conjunto inteiro do `recommended` ou uma lista fechada de regras |
| `.oxlintrc.json` liga regra sem a opção certa, em silêncio (achado 5) | contagem de violação de uma regra específica muda quando alguém adiciona a opção que faltava | o contrato nomeia regra e opção juntas para toda regra de G3/G4 que tiver opção, não só o nome |
| `--type-aware` interage mal com opção de tsconfig não testada aqui | erro do `tsgolint` ao rodar contra `apps/api` ou `apps/web` reais | testar de novo no contrato, contra o repositório real, antes do DoD travar número |

## Perguntas ao operador

### P1 — Qual das três opções (A, B, C) e quais grupos (G1 a G4, e G2 para `apps/web`)?
Por que importa: define o `.oxlintrc.json`/`eslint.config.js` que o contrato vai fixar
regra por regra, e o contrato não pode nomear regra sem essa escolha.
Opções:
- **A — só oxlint** · custo: perde 2 regras nominais (uma de G4, duas de G2 se G2 entrar
  completo), muda `packages/config` de função, exige `oxlint-tsgolint` para G3/G4, e o
  `.oxlintrc.json` precisa nomear a opção de pelo menos 3 regras (achado 5), não só o
  nome delas · consequência: lint ~7 a ~25 vezes mais rápido nesta máquina; com a opção
  certa, a mesma cobertura que o ESLint dá hoje (achado 5).
- **B — ESLint com mais regras** · custo: G3/G4 custam ~4x o tempo de G1 (~14,5-14,9 s
  contra ~3,6 s nesta máquina) e batem no achado 1 e no achado 2 · consequência: nenhuma
  dependência nova, nenhuma ferramenta nova para o time aprender.
- **C — as duas, sem regra repetida** · custo: duas ferramentas no pipeline, dependência
  de `eslint-plugin-oxlint` ficar sincronizada com o `.oxlintrc.json` real, mesma
  exigência de opção explícita do item A · consequência: cobre quase tudo com o oxlint
  rápido e usa o ESLint só para o que falta (hoje, 1 regra de G4 e, se G2 entrar completo,
  2 regras de hooks/compiler); pega 1 violação (achado 2) que o ESLint sozinho não pega.
Recomendação do explorador: nenhuma. A ordem pede para não escolher; o dado que mais
deveria pesar nessa escolha não é mais "as ferramentas discordam" (não discordam, com a
opção certa — achado 5 revisado), e sim o tempo (P6) contra o esforço de escrever e
manter um `.oxlintrc.json` correto regra a regra, incluindo a opção.

### P2 — G2 entra com o `recommended` inteiro do `eslint-plugin-react-hooks` (16 regras, incluindo as 14 do React Compiler) ou uma lista fechada só das regras de hooks clássicas (`rules-of-hooks`, `exhaustive-deps`)?
Por que importa: a ordem descreveu G2 como "regras de hooks", mas a versão publicada hoje
do pacote é maior que isso (achado 3). O contrato precisa nomear uma lista fechada.
Opções:
- **A — `recommended` inteiro** · custo: 14 regras novas de padrão React Compiler, cujo
  impacto em `apps/web` hoje (1 componente) não testei em profundidade porque a ordem
  restringe a G1-G4 · consequência: cobertura ampla, alinhada ao que o React recomenda
  hoje; pode gerar violação em código futuro sem relação com hooks.
- **B — lista fechada, só as 2 regras clássicas** · custo: nenhum · consequência: fica
  mais previsível, mas diverge do "recommended" oficial, que o próprio pacote recomenda
  seguir para receber regra nova automaticamente.
Recomendação do explorador: nenhuma.

## Material bruto

Ambiente do experimento: clone completo do worktree em diretório fora do repositório
(`scratchpad/m17-exp/repo`), com `pnpm install --frozen-lockfile` e depois `pnpm add -D`
das dependências de teste (`oxlint@1.85.0`, `oxlint-tsgolint@7.0.2002`, `eslint-plugin-
react-hooks@7.1.1`, `typescript-eslint@8.70.0`, `eslint-config-prettier@10.1.8`,
`eslint-plugin-oxlint@1.84.0`). Nada disso tocou o worktree real desta unidade.

### Tabela completa da P3 (96 regras nomeadas, 94 com par no oxlint)

| Grupo | Regra no ESLint | Regra no oxlint | Depende de |
|---|---|---|---|
| G1 | `@typescript-eslint/ban-ts-comment` | `typescript/ban-ts-comment` | regra/categoria fora do padrão (precisa `.oxlintrc.json`) |
| G1 | `@typescript-eslint/no-array-constructor` | `eslint/no-array-constructor` | regra/categoria fora do padrão (precisa `.oxlintrc.json`) |
| G1 | `@typescript-eslint/no-duplicate-enum-values` | `typescript/no-duplicate-enum-values` | nenhuma (padrão) |
| G1 | `@typescript-eslint/no-empty-object-type` | `typescript/no-empty-object-type` | regra/categoria fora do padrão (precisa `.oxlintrc.json`) |
| G1 | `@typescript-eslint/no-explicit-any` | `typescript/no-explicit-any` | regra/categoria fora do padrão (precisa `.oxlintrc.json`) |
| G1 | `@typescript-eslint/no-extra-non-null-assertion` | `typescript/no-extra-non-null-assertion` | nenhuma (padrão) |
| G1 | `@typescript-eslint/no-misused-new` | `typescript/no-misused-new` | nenhuma (padrão) |
| G1 | `@typescript-eslint/no-namespace` | `typescript/no-namespace` | regra/categoria fora do padrão (precisa `.oxlintrc.json`) |
| G1 | `@typescript-eslint/no-non-null-asserted-optional-chain` | `typescript/no-non-null-asserted-optional-chain` | nenhuma (padrão) |
| G1 | `@typescript-eslint/no-require-imports` | `typescript/no-require-imports` | regra/categoria fora do padrão (precisa `.oxlintrc.json`) |
| G1 | `@typescript-eslint/no-this-alias` | `typescript/no-this-alias` | nenhuma (padrão) |
| G1 | `@typescript-eslint/no-unnecessary-type-constraint` | `typescript/no-unnecessary-type-constraint` | regra/categoria fora do padrão (precisa `.oxlintrc.json`) |
| G1 | `@typescript-eslint/no-unsafe-declaration-merging` | `typescript/no-unsafe-declaration-merging` | nenhuma (padrão) |
| G1 | `@typescript-eslint/no-unsafe-function-type` | `typescript/no-unsafe-function-type` | regra/categoria fora do padrão (precisa `.oxlintrc.json`) |
| G1 | `@typescript-eslint/no-unused-expressions` | `eslint/no-unused-expressions` | nenhuma (padrão) |
| G1 | `@typescript-eslint/no-unused-vars` | `eslint/no-unused-vars` | nenhuma (padrão) |
| G1 | `@typescript-eslint/no-wrapper-object-types` | `typescript/no-wrapper-object-types` | nenhuma (padrão) |
| G1 | `@typescript-eslint/prefer-as-const` | `typescript/prefer-as-const` | nenhuma (padrão) |
| G1 | `@typescript-eslint/prefer-namespace-keyword` | `typescript/prefer-namespace-keyword` | nenhuma (padrão) |
| G1 | `@typescript-eslint/triple-slash-reference` | `typescript/triple-slash-reference` | nenhuma (padrão) |
| G1 | `no-var` | `eslint/no-var` | regra/categoria fora do padrão (precisa `.oxlintrc.json`) |
| G1 | `prefer-const` | `eslint/prefer-const` | regra/categoria fora do padrão (precisa `.oxlintrc.json`) |
| G1 | `prefer-rest-params` | `eslint/prefer-rest-params` | regra/categoria fora do padrão (precisa `.oxlintrc.json`) |
| G1 | `prefer-spread` | `eslint/prefer-spread` | regra/categoria fora do padrão (precisa `.oxlintrc.json`) |
| G3 | `@typescript-eslint/await-thenable` | `typescript/await-thenable` | `--type-aware` + `oxlint-tsgolint` |
| G3 | `@typescript-eslint/no-array-delete` | `typescript/no-array-delete` | `--type-aware` + `oxlint-tsgolint` |
| G3 | `@typescript-eslint/no-base-to-string` | `typescript/no-base-to-string` | `--type-aware` + `oxlint-tsgolint` |
| G3 | `@typescript-eslint/no-duplicate-type-constituents` | `typescript/no-duplicate-type-constituents` | `--type-aware` + `oxlint-tsgolint` |
| G3 | `@typescript-eslint/no-floating-promises` | `typescript/no-floating-promises` | `--type-aware` + `oxlint-tsgolint` |
| G3 | `@typescript-eslint/no-for-in-array` | `typescript/no-for-in-array` | `--type-aware` + `oxlint-tsgolint` |
| G3 | `@typescript-eslint/no-implied-eval` | `typescript/no-implied-eval` | `--type-aware` + `oxlint-tsgolint` |
| G3 | `@typescript-eslint/no-misused-promises` | `typescript/no-misused-promises` | `--type-aware` + `oxlint-tsgolint`; regra/categoria fora do padrão (precisa `.oxlintrc.json`) |
| G3 | `@typescript-eslint/no-redundant-type-constituents` | `typescript/no-redundant-type-constituents` | `--type-aware` + `oxlint-tsgolint` |
| G3 | `@typescript-eslint/no-unnecessary-type-assertion` | `typescript/no-unnecessary-type-assertion` | `--type-aware` + `oxlint-tsgolint`; regra/categoria fora do padrão (precisa `.oxlintrc.json`) |
| G3 | `@typescript-eslint/no-unsafe-argument` | `typescript/no-unsafe-argument` | `--type-aware` + `oxlint-tsgolint`; regra/categoria fora do padrão (precisa `.oxlintrc.json`) |
| G3 | `@typescript-eslint/no-unsafe-assignment` | `typescript/no-unsafe-assignment` | `--type-aware` + `oxlint-tsgolint`; regra/categoria fora do padrão (precisa `.oxlintrc.json`) |
| G3 | `@typescript-eslint/no-unsafe-call` | `typescript/no-unsafe-call` | `--type-aware` + `oxlint-tsgolint`; regra/categoria fora do padrão (precisa `.oxlintrc.json`) |
| G3 | `@typescript-eslint/no-unsafe-enum-comparison` | `typescript/no-unsafe-enum-comparison` | `--type-aware` + `oxlint-tsgolint`; regra/categoria fora do padrão (precisa `.oxlintrc.json`) |
| G3 | `@typescript-eslint/no-unsafe-member-access` | `typescript/no-unsafe-member-access` | `--type-aware` + `oxlint-tsgolint`; regra/categoria fora do padrão (precisa `.oxlintrc.json`) |
| G3 | `@typescript-eslint/no-unsafe-return` | `typescript/no-unsafe-return` | `--type-aware` + `oxlint-tsgolint`; regra/categoria fora do padrão (precisa `.oxlintrc.json`) |
| G3 | `@typescript-eslint/no-unsafe-unary-minus` | `typescript/no-unsafe-unary-minus` | `--type-aware` + `oxlint-tsgolint` |
| G3 | `@typescript-eslint/only-throw-error` | `typescript/only-throw-error` | `--type-aware` + `oxlint-tsgolint`; regra/categoria fora do padrão (precisa `.oxlintrc.json`) |
| G3 | `@typescript-eslint/prefer-promise-reject-errors` | `typescript/prefer-promise-reject-errors` | `--type-aware` + `oxlint-tsgolint`; regra/categoria fora do padrão (precisa `.oxlintrc.json`) |
| G3 | `@typescript-eslint/require-await` | `typescript/require-await` | `--type-aware` + `oxlint-tsgolint`; regra/categoria fora do padrão (precisa `.oxlintrc.json`) |
| G3 | `@typescript-eslint/restrict-plus-operands` | `typescript/restrict-plus-operands` | `--type-aware` + `oxlint-tsgolint`; regra/categoria fora do padrão (precisa `.oxlintrc.json`) |
| G3 | `@typescript-eslint/restrict-template-expressions` | `typescript/restrict-template-expressions` | `--type-aware` + `oxlint-tsgolint` |
| G3 | `@typescript-eslint/unbound-method` | `typescript/unbound-method` | `--type-aware` + `oxlint-tsgolint` |
| G4 | `@typescript-eslint/no-confusing-void-expression` | `typescript/no-confusing-void-expression` | `--type-aware` + `oxlint-tsgolint`; regra/categoria fora do padrão (precisa `.oxlintrc.json`) |
| G4 | `@typescript-eslint/no-deprecated` | `typescript/no-deprecated` | `--type-aware` + `oxlint-tsgolint`; regra/categoria fora do padrão (precisa `.oxlintrc.json`) |
| G4 | `@typescript-eslint/no-dynamic-delete` | `typescript/no-dynamic-delete` | `--type-aware` + `oxlint-tsgolint`; regra/categoria fora do padrão (precisa `.oxlintrc.json`) |
| G4 | `@typescript-eslint/no-extraneous-class` | `typescript/no-extraneous-class` | `--type-aware` + `oxlint-tsgolint`; regra/categoria fora do padrão (precisa `.oxlintrc.json`) |
| G4 | `@typescript-eslint/no-generated-empty-object-type` | não existe | — |
| G4 | `@typescript-eslint/no-invalid-void-type` | `typescript/no-invalid-void-type` | `--type-aware` + `oxlint-tsgolint`; regra/categoria fora do padrão (precisa `.oxlintrc.json`) |
| G4 | `@typescript-eslint/no-meaningless-void-operator` | `typescript/no-meaningless-void-operator` | `--type-aware` + `oxlint-tsgolint` |
| G4 | `@typescript-eslint/no-misused-spread` | `typescript/no-misused-spread` | `--type-aware` + `oxlint-tsgolint` |
| G4 | `@typescript-eslint/no-mixed-enums` | `typescript/no-mixed-enums` | `--type-aware` + `oxlint-tsgolint`; regra/categoria fora do padrão (precisa `.oxlintrc.json`) |
| G4 | `@typescript-eslint/no-non-null-asserted-nullish-coalescing` | `typescript/no-non-null-asserted-nullish-coalescing` | `--type-aware` + `oxlint-tsgolint`; regra/categoria fora do padrão (precisa `.oxlintrc.json`) |
| G4 | `@typescript-eslint/no-non-null-assertion` | `typescript/no-non-null-assertion` | `--type-aware` + `oxlint-tsgolint`; regra/categoria fora do padrão (precisa `.oxlintrc.json`) |
| G4 | `@typescript-eslint/no-unnecessary-boolean-literal-compare` | `typescript/no-unnecessary-boolean-literal-compare` | `--type-aware` + `oxlint-tsgolint`; regra/categoria fora do padrão (precisa `.oxlintrc.json`) |
| G4 | `@typescript-eslint/no-unnecessary-condition` | `typescript/no-unnecessary-condition` | `--type-aware` + `oxlint-tsgolint`; regra/categoria fora do padrão (precisa `.oxlintrc.json`) |
| G4 | `@typescript-eslint/no-unnecessary-template-expression` | `typescript/no-unnecessary-template-expression` | `--type-aware` + `oxlint-tsgolint`; regra/categoria fora do padrão (precisa `.oxlintrc.json`) |
| G4 | `@typescript-eslint/no-unnecessary-type-arguments` | `typescript/no-unnecessary-type-arguments` | `--type-aware` + `oxlint-tsgolint`; regra/categoria fora do padrão (precisa `.oxlintrc.json`) |
| G4 | `@typescript-eslint/no-unnecessary-type-conversion` | `typescript/no-unnecessary-type-conversion` | `--type-aware` + `oxlint-tsgolint`; regra/categoria fora do padrão (precisa `.oxlintrc.json`) |
| G4 | `@typescript-eslint/no-unnecessary-type-parameters` | `typescript/no-unnecessary-type-parameters` | `--type-aware` + `oxlint-tsgolint`; regra/categoria fora do padrão (precisa `.oxlintrc.json`) |
| G4 | `@typescript-eslint/no-useless-constructor` | `eslint/no-useless-constructor` | `--type-aware` + `oxlint-tsgolint`; regra/categoria fora do padrão (precisa `.oxlintrc.json`) |
| G4 | `@typescript-eslint/no-useless-default-assignment` | `typescript/no-useless-default-assignment` | `--type-aware` + `oxlint-tsgolint` |
| G4 | `@typescript-eslint/prefer-literal-enum-member` | `typescript/prefer-literal-enum-member` | `--type-aware` + `oxlint-tsgolint`; regra/categoria fora do padrão (precisa `.oxlintrc.json`) |
| G4 | `@typescript-eslint/prefer-reduce-type-parameter` | `typescript/prefer-reduce-type-parameter` | `--type-aware` + `oxlint-tsgolint`; regra/categoria fora do padrão (precisa `.oxlintrc.json`) |
| G4 | `@typescript-eslint/prefer-return-this-type` | `typescript/prefer-return-this-type` | `--type-aware` + `oxlint-tsgolint`; regra/categoria fora do padrão (precisa `.oxlintrc.json`) |
| G4 | `@typescript-eslint/related-getter-setter-pairs` | `typescript/related-getter-setter-pairs` | `--type-aware` + `oxlint-tsgolint`; regra/categoria fora do padrão (precisa `.oxlintrc.json`) |
| G4 | `@typescript-eslint/return-await` | `typescript/return-await` | `--type-aware` + `oxlint-tsgolint`; regra/categoria fora do padrão (precisa `.oxlintrc.json`) |
| G4 | `@typescript-eslint/unified-signatures` | `typescript/unified-signatures` | `--type-aware` + `oxlint-tsgolint`; regra/categoria fora do padrão (precisa `.oxlintrc.json`) |
| G4 | `@typescript-eslint/use-unknown-in-catch-callback-variable` | `typescript/use-unknown-in-catch-callback-variable` | `--type-aware` + `oxlint-tsgolint`; regra/categoria fora do padrão (precisa `.oxlintrc.json`) |
| G2 | `react-hooks/rules-of-hooks` | `react-hooks/rules-of-hooks` | `--react-plugin` + regra/categoria fora do padrão |
| G2 | `react-hooks/exhaustive-deps` | `react-hooks/exhaustive-deps` | `--react-plugin` + regra/categoria fora do padrão |
| G2 | `react-hooks/static-components` | `react/static-components` | `--react-plugin` + regra/categoria fora do padrão |
| G2 | `react-hooks/use-memo` | `react/use-memo` | `--react-plugin` + regra/categoria fora do padrão |
| G2 | `react-hooks/preserve-manual-memoization` | `react/preserve-manual-memoization` | `--react-plugin` + regra/categoria fora do padrão |
| G2 | `react-hooks/incompatible-library` | `react/incompatible-library` | `--react-plugin` + regra/categoria fora do padrão |
| G2 | `react-hooks/immutability` | `react/immutability` | `--react-plugin` + regra/categoria fora do padrão |
| G2 | `react-hooks/globals` | `react/globals` | `--react-plugin` + regra/categoria fora do padrão |
| G2 | `react-hooks/refs` | `react/refs` | `--react-plugin` + regra/categoria fora do padrão |
| G2 | `react-hooks/set-state-in-effect` | `react/set-state-in-effect` | `--react-plugin` + regra/categoria fora do padrão |
| G2 | `react-hooks/error-boundaries` | `react/error-boundaries` | `--react-plugin` + regra/categoria fora do padrão |
| G2 | `react-hooks/purity` | `react/purity` | `--react-plugin` + regra/categoria fora do padrão |
| G2 | `react-hooks/set-state-in-render` | `react/set-state-in-render` | `--react-plugin` + regra/categoria fora do padrão |
| G2 | `react-hooks/unsupported-syntax` | `react/unsupported-syntax` | `--react-plugin` + regra/categoria fora do padrão |
| G2 | `react-hooks/config` | não existe | — |
| G2 | `react-hooks/gating` | não existe | — |

### Comandos de P1 (print-config)

```
$ (cd apps/api && npx eslint --print-config src/index.ts)     # 24 regras ligadas
$ (cd apps/web && npx eslint --print-config src/main.tsx)     # 24 regras ligadas, igual a api
$ (cd packages/shared && npx eslint --print-config src/index.ts)  # 24 regras ligadas, igual
$ (cd packages/config && npx eslint --print-config eslint.base.js)  # 20 regras ligadas
```

### Comandos de P4 (`--type-aware`)

```
$ pnpm add -D -w oxlint-tsgolint@7.0.2002
$ cat apps/api/src/scratch-typeaware.ts
async function doSomethingAsync(): Promise<void> { return; }
function run() { doSomethingAsync(); }
run();
$ ./node_modules/.bin/oxlint --type-aware apps/api/src/scratch-typeaware.ts
src/scratch-typeaware.ts:6:3: error typescript(no-floating-promises): Promises must be
awaited, add void operator to ignore.
exit=1
```

### Comandos de P5 (violações por grupo, depois de `pnpm -r build`)

```
$ pnpm -r build
$ (cd apps/api && npx eslint --no-config-lookup --config eslint.g3.config.js . -f json)
$ (cd apps/web && npx eslint --no-config-lookup --config eslint.g3.config.js . -f json)
$ (cd packages/shared && npx eslint --no-config-lookup --config eslint.g3.config.js . -f json)
$ (cd packages/config && npx eslint --no-config-lookup --config eslint.g3.config.js . -f json)
# G1+G3, excluindo os arquivos eslint.g3/g4.config.js que eu mesmo criei para o teste:
# api: 1 erro de arquivo fora do tsconfig (drizzle.config.ts) + 1 (eslint.config.js) + 0 violação real
# web: 1 erro de arquivo (eslint.config.js) + 1 violação real (no-unsafe-assignment)
# shared: 1 erro de arquivo (eslint.config.js)
# config: 2 erros de arquivo (eslint.base.js, eslint.config.js)

$ rm -f .oxlintrc.json  # config para G1-G3 do oxlint, ver tabela P3
$ ./node_modules/.bin/oxlint --type-aware --format=json apps packages
{"filename":"apps/web/src/App.tsx","code":"typescript(no-unsafe-assignment)", ...}
# 1 diagnóstico só, no mesmo arquivo e linha que o ESLint achou
```

Diagnóstico completo do oxlint G1-G4 (config com as 68 regras da tabela P3, `--type-
aware`, contra `apps` e `packages`):

```json
[
  {
    "message": "Returning a void expression from an arrow function shorthand is forbidden.",
    "code": "typescript(no-confusing-void-expression)",
    "severity": "error",
    "url": "https://oxc.rs/docs/guide/usage/linter/rules/typescript/no-confusing-void-expression.html",
    "help": "Add braces to the arrow function.",
    "filename": "apps/api/src/index.test.ts",
    "labels": [
      {
        "span": {
          "offset": 984,
          "length": 13,
          "line": 25,
          "column": 25
        }
      }
    ]
  },
  {
    "message": "Returning a void expression from an arrow function shorthand is forbidden.",
    "code": "typescript(no-confusing-void-expression)",
    "severity": "error",
    "url": "https://oxc.rs/docs/guide/usage/linter/rules/typescript/no-confusing-void-expression.html",
    "help": "Add braces to the arrow function.",
    "filename": "apps/api/src/index.test.ts",
    "labels": [
      {
        "span": {
          "offset": 1425,
          "length": 46,
          "line": 39,
          "column": 27
        }
      }
    ]
  },
  {
    "message": "Returning a void expression from an arrow function shorthand is forbidden.",
    "code": "typescript(no-confusing-void-expression)",
    "severity": "error",
    "url": "https://oxc.rs/docs/guide/usage/linter/rules/typescript/no-confusing-void-expression.html",
    "help": "Add braces to the arrow function.",
    "filename": "apps/api/src/index.test.ts",
    "labels": [
      {
        "span": {
          "offset": 2494,
          "length": 15,
          "line": 80,
          "column": 36
        }
      }
    ]
  },
  {
    "message": "Unnecessary optional chain on a non-nullish value.",
    "code": "typescript(no-unnecessary-condition)",
    "severity": "error",
    "url": "https://oxc.rs/docs/guide/usage/linter/rules/typescript/no-unnecessary-condition.html",
    "filename": "apps/api/src/db/api-role.test.ts",
    "labels": [
      {
        "label": "Type: { sql: Sql<{}>; close(): Promise<void>; }",
        "span": {
          "offset": 686,
          "length": 3,
          "line": 25,
          "column": 9
        }
      },
      {
        "span": {
          "offset": 689,
          "length": 2,
          "line": 25,
          "column": 12
        }
      }
    ]
  },
  {
    "message": "Unnecessary optional chain on a non-nullish value.",
    "code": "typescript(no-unnecessary-condition)",
    "severity": "error",
    "url": "https://oxc.rs/docs/guide/usage/linter/rules/typescript/no-unnecessary-condition.html",
    "filename": "apps/api/src/db/api-role.test.ts",
    "labels": [
      {
        "label": "Type: { url: string; password: string; drop(): Promise<void>; }",
        "span": {
          "offset": 708,
          "length": 8,
          "line": 26,
          "column": 9
        }
      },
      {
        "span": {
          "offset": 716,
          "length": 2,
          "line": 26,
          "column": 17
        }
      }
    ]
  },
  {
    "message": "Unnecessary optional chain on a non-nullish value.",
    "code": "typescript(no-unnecessary-condition)",
    "severity": "error",
    "url": "https://oxc.rs/docs/guide/usage/linter/rules/typescript/no-unnecessary-condition.html",
    "filename": "apps/api/src/index.test.ts",
    "labels": [
      {
        "label": "Type: ChildProcessWithoutNullStreams",
        "span": {
          "offset": 3062,
          "length": 5,
          "line": 104,
          "column": 5
        }
      },
      {
        "span": {
          "offset": 3067,
          "length": 2,
          "line": 104,
          "column": 10
        }
      }
    ]
  },
  {
    "message": "Returning a void expression from an arrow function shorthand is forbidden.",
    "code": "typescript(no-confusing-void-expression)",
    "severity": "error",
    "url": "https://oxc.rs/docs/guide/usage/linter/rules/typescript/no-confusing-void-expression.html",
    "help": "Add braces to the arrow function.",
    "filename": "apps/api/src/db/migrate-cli.ts",
    "labels": [
      {
        "span": {
          "offset": 1536,
          "length": 10,
          "line": 38,
          "column": 44
        }
      }
    ]
  },
  {
    "message": "This expression unnecessarily compares a boolean value to a boolean instead of using it directly.",
    "code": "typescript(no-unnecessary-boolean-literal-compare)",
    "severity": "error",
    "url": "https://oxc.rs/docs/guide/usage/linter/rules/typescript/no-unnecessary-boolean-literal-compare.html",
    "filename": "apps/api/src/db/migrate-cli.ts",
    "labels": [
      {
        "span": {
          "offset": 2835,
          "length": 28,
          "line": 81,
          "column": 17
        }
      }
    ]
  },
  {
    "message": "Returning a void expression from an arrow function shorthand is forbidden.",
    "code": "typescript(no-confusing-void-expression)",
    "severity": "error",
    "url": "https://oxc.rs/docs/guide/usage/linter/rules/typescript/no-confusing-void-expression.html",
    "help": "Add braces to the arrow function.",
    "filename": "apps/api/src/db/migrate-cli.ts",
    "labels": [
      {
        "span": {
          "offset": 4145,
          "length": 18,
          "line": 117,
          "column": 39
        }
      }
    ]
  },
  {
    "message": "Unsafe assignment of an any value.",
    "code": "typescript(no-unsafe-assignment)",
    "severity": "error",
    "url": "https://oxc.rs/docs/guide/usage/linter/rules/typescript/no-unsafe-assignment.html",
    "filename": "apps/web/src/App.tsx",
    "labels": [
      {
        "label": "Assigned value has type `any`.",
        "span": {
          "offset": 86,
          "length": 34,
          "line": 4,
          "column": 18
        }
      },
      {
        "label": "Target is inferred as `any`.",
        "span": {
          "offset": 77,
          "length": 6,
          "line": 4,
          "column": 9
        }
      },
      {
        "span": {
          "offset": 84,
          "length": 1,
          "line": 4,
          "column": 16
        }
      }
    ]
  },
  {
    "message": "`config` is deprecated. ESLint core now provides this functionality via `defineConfig()`,\nwhich we now recommend instead. See ://typescript-eslint.io/packages/typescript-eslint/#config-deprecated.",
    "code": "typescript(no-deprecated)",
    "severity": "error",
    "url": "https://oxc.rs/docs/guide/usage/linter/rules/typescript/no-deprecated.html",
    "filename": "packages/config/eslint.base.js",
    "labels": [
      {
        "span": {
          "offset": 119,
          "length": 6,
          "line": 4,
          "column": 30
        }
      }
    ]
  }
]
```

Lista completa de mensagens do ESLint G1-G4 (depois do build), arquivo/linha/regra,
excluindo os `eslint.g3.config.js`/`eslint.g4.config.js` que eu mesmo criei para o teste
(`None` na coluna de regra é o erro de parsing por arquivo fora do `include` do tsconfig,
não uma violação de regra):

```
api apps/api/drizzle.config.ts - None
api apps/api/eslint.config.js - None
api apps/api/src/db/api-role.test.ts 25 @typescript-eslint/no-unnecessary-condition
api apps/api/src/db/api-role.test.ts 26 @typescript-eslint/no-unnecessary-condition
api apps/api/src/db/migrate-cli.ts 38 @typescript-eslint/no-confusing-void-expression
api apps/api/src/db/migrate-cli.ts 81 @typescript-eslint/no-unnecessary-boolean-literal-compare
api apps/api/src/db/migrate-cli.ts 100 @typescript-eslint/restrict-template-expressions
api apps/api/src/db/migrate-cli.ts 117 @typescript-eslint/no-confusing-void-expression
api apps/api/src/db/prod-guard.ts 112 @typescript-eslint/restrict-template-expressions
api apps/api/src/db/prod-guard.ts 112 @typescript-eslint/restrict-template-expressions
api apps/api/src/db/prod-guard.ts 112 @typescript-eslint/restrict-template-expressions
api apps/api/src/db/prod-guard.ts 127 @typescript-eslint/restrict-template-expressions
api apps/api/src/db/target.ts 80 @typescript-eslint/restrict-template-expressions
api apps/api/src/db/target.ts 80 @typescript-eslint/restrict-template-expressions
api apps/api/src/index.test.ts 25 @typescript-eslint/no-confusing-void-expression
api apps/api/src/index.test.ts 39 @typescript-eslint/no-confusing-void-expression
api apps/api/src/index.test.ts 55 @typescript-eslint/restrict-template-expressions
api apps/api/src/index.test.ts 55 @typescript-eslint/restrict-template-expressions
api apps/api/src/index.test.ts 72 @typescript-eslint/restrict-template-expressions
api apps/api/src/index.test.ts 80 @typescript-eslint/no-confusing-void-expression
api apps/api/src/index.test.ts 84 @typescript-eslint/restrict-template-expressions
api apps/api/src/index.test.ts 104 @typescript-eslint/no-unnecessary-condition
api apps/api/src/index.ts 13 @typescript-eslint/restrict-template-expressions
web apps/web/eslint.config.js - None
web apps/web/src/App.tsx 4 @typescript-eslint/no-unsafe-assignment
shared packages/shared/eslint.config.js - None
shared packages/shared/src/index.ts 10 @typescript-eslint/restrict-template-expressions
config packages/config/eslint.base.js - None
config packages/config/eslint.config.js - None
```

### Máquina das medições de P6

```
$ nproc
8
$ grep "model name" /proc/cpuinfo | head -1
model name	: Intel(R) Core(TM) i7-10610U CPU @ 1.80GHz
$ uname -a
Linux archlinux 7.2.6-arch2-1 #1 SMP PREEMPT_DYNAMIC ... x86_64 GNU/Linux
```

### Comando de P7 (busca por regra de formatação no oxlint)

```
$ ./node_modules/.bin/oxlint --rules --format=json > oxlint-rules.json
$ python3 -c "import json; d=json.load(open('oxlint-rules.json'));
  print([r['value'] for r in d if r['value'] in
  ('quotes','semi','indent','comma-dangle','no-mixed-spaces-and-tabs')])"
[]
```

### Comando de P8 (quem usa cada dependência)

```
$ grep -rn '"eslint"\|"typescript-eslint"\|"eslint-config-prettier"' --include=package.json .
packages/config/package.json:13:    "eslint-config-prettier": "10.1.8",
packages/config/package.json:14:    "typescript-eslint": "8.70.0"
package.json:20:    "eslint": "10.10.0",
$ grep -rln "from 'eslint'" apps packages --include="*.ts" --include="*.tsx" --include="*.js"
(vazio)
```

### Rodada de correção (devolução do condutor de 2026-09-22)

Comando de `pnpm view` pedido no ponto 4 da devolução:

```
$ pnpm view oxlint-tsgolint version
7.0.2002
```

Código-fonte da regra instalada, ponto 1 da devolução (caminho relativo ao clone de
teste):

```
$ F="node_modules/.pnpm/@typescript-eslint+eslint-plugin@8.70.0_@typescript-eslint+parser@8.70.0_eslint@10.10.0_14ee09ae53143a3f27556394be5ab7bb/node_modules/@typescript-eslint/eslint-plugin/dist/rules/restrict-template-expressions.js"
$ sed -n '30,82p' "$F"
        docs: {
            description: 'Enforce template literal expressions to be of `string` type',
            recommended: {
                recommended: true,
                strict: [
                    {
                        allowAny: false,
                        allowBoolean: false,
                        allowNever: false,
                        allowNullish: false,
                        allowNumber: false,
                        allowRegExp: false,
                    },
                ],
            },
            requiresTypeChecking: true,
        },
        ...
    defaultOptions: [
        {
            allow: [{ name: ['Error', 'URL', 'URLSearchParams'], from: 'lib' }],
            allowAny: true,
            allowBoolean: true,
            allowNullish: true,
            allowNumber: true,
            allowRegExp: true,
        },
    ],
```

`grep -n "strict:"` nos 26 arquivos de regra de G3+G4 encontrou a mesma estrutura só em
`restrict-plus-operands.js` e `return-await.js`, além de `restrict-template-
expressions.js`. Nenhuma outra regra de G3/G4 tem essa chave.

Doc oficial do oxlint para a mesma regra, texto extraído do HTML de
`https://oxc.rs/docs/guide/usage/linter/rules/typescript/restrict-template-
expressions.html`:

```
allowAny: type: boolean, default: true. Whether to allow any typed values [...]
allowBoolean: type: boolean, default: true. [...]
allowNullish: type: boolean, default: true. [...]
allowNumber: type: boolean, default: true. [...]
allowRegExp: type: boolean, default: true. [...]
```

oxlint com a opção "recomendada" (padrão, sem passar opção) contra o código de hoje:

```
$ ./node_modules/.bin/oxlint --type-aware --format=json apps packages
# diagnósticos de restrict-template-expressions: 0
```

oxlint com a opção "estrita" (a mesma que `strictTypeChecked` usa no ESLint):

```json
{
  "plugins": ["typescript"],
  "categories": { "correctness": "off" },
  "rules": {
    "typescript/restrict-template-expressions": ["error", {
      "allowAny": false, "allowBoolean": false, "allowNever": false,
      "allowNullish": false, "allowNumber": false, "allowRegExp": false
    }]
  }
}
```
```
$ ./node_modules/.bin/oxlint --type-aware --format=json apps packages
diagnosticos: 13
packages/shared/src/index.ts       1
apps/api/src/index.ts              1
apps/api/src/index.test.ts         4
apps/api/src/db/prod-guard.ts      4
apps/api/src/db/target.ts          2
apps/api/src/db/migrate-cli.ts     1
```

13 = 13, mesma contagem do ESLint (P5/material bruto, lista completa de arquivo/linha).
`restrict-plus-operands` e `return-await`, com a opção estrita equivalente, deram 0
diagnósticos, igual ao ESLint (nenhuma das duas tinha violação em nenhum código real).

Rodada completa de G1-G4 no oxlint com as três opções estritas corrigidas:

```
$ ./node_modules/.bin/oxlint --type-aware --format=json apps packages
TOTAL: 24
typescript(restrict-template-expressions)         13
typescript(no-confusing-void-expression)            5
typescript(no-unnecessary-condition)                3
typescript(no-unnecessary-boolean-literal-compare)  1
typescript(no-unsafe-assignment)                    1
typescript(no-deprecated)                           1
--- por pacote ---
apps/api        21
packages/shared  1
apps/web         1
packages/config  1
```

Ponto 2 da devolução: repeti o teste do achado 1 com `oxlint --type-aware`, G1-G3, sem
`pnpm -r build` antes (removi `packages/shared/dist`, `apps/api/dist`, `apps/web/dist`):

```
$ rm -rf packages/shared/dist apps/api/dist apps/web/dist
$ test -d packages/shared/dist && echo "existe" || echo "não existe"
não existe
$ ./node_modules/.bin/oxlint --type-aware --format=json apps packages
diagnosticos: 3
typescript(no-unsafe-call) apps/api/src/index.ts        Unsafe call of a(n) `error` type [...]
typescript(no-unsafe-assignment) apps/web/src/App.tsx   Unsafe assignment of an any value.
typescript(no-unsafe-call) apps/web/src/App.tsx         Unsafe call of a(n) `error` type [...]
```

Sim: o oxlint também dá falso positivo sem build. `apps/api/src/index.ts` e o
`no-unsafe-call` extra em `apps/web/src/App.tsx` desaparecem depois de `pnpm -r build`; o
`no-unsafe-assignment` em `apps/web/src/App.tsx` é real e independente do build (é o
mesmo de P5, causado pela falta de `vite-env.d.ts`).

## Decisão do operador

Registrada pelo condutor em 2026-09-22, com as palavras do operador na conversa.

- **P1:** opção A, só o oxlint. Grupos G1, G2 e G3, na recomendação do condutor. O G4
  fica de fora.
- **P2:** o G2 entra com o `recommended` inteiro do `eslint-plugin-react-hooks`. Na opção
  A, isso quer dizer as 14 regras desse conjunto que o oxlint tem. As duas que ele não
  tem, `config` e `gating`, ficam de fora.
