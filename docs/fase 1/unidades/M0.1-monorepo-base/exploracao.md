> Unidade: `M0.1-monorepo-base` · Marco: `M0` · Trilha: `dividida`
> Estado: fechada
> Explorador · Data: 2026-09-12

# Exploração — `M0.1-monorepo-base`

## Resumo

O monorepo inteiro foi montado e rodado num diretório temporário. As seis verificações do
DoD passam num clone limpo com `HOME` novo, em 15 segundos somados. Corepack não serve
mais: o Node 26 não o distribui e a máquina do operador não o tem. O próprio pnpm resolve
isso, porque lê `packageManager` e troca de versão sozinho. Três coisas quebraram a
hipótese inicial. A primeira: `typescript@7.0.2` é a versão mais nova e o
`typescript-eslint` recusa rodar com ela, com erro duro. A segunda: consumir
`packages/shared` pelo `dist` faz `pnpm -r test` e `pnpm -r typecheck` falharem num clone
limpo sem `build` antes. A terceira: `pnpm -r <script>` sai com código 0 quando um pacote
não tem o script, o que deixa o DoD cego. O conteúdo de `apps/api` continua sendo decisão
do operador, com três opções descritas abaixo. Também levo ao operador o `.mcp.json`, que
está para ser versionado num repositório público e carrega o identificador do projeto
Supabase.

## Respostas

### P1 — Qual versão de Node e de pnpm o repositório fixa, e por qual mecanismo

**Resposta:** Corepack está fora. O Node deixou de distribuí-lo a partir da versão 25.0.0,
e a máquina do operador não tem o pacote instalado. O mecanismo que funciona é o campo
`packageManager` no `package.json` da raiz, lido pelo próprio pnpm. Qualquer pnpm recente
que encontre esse campo baixa e executa a versão declarada. `engines` não é mecanismo, é
documentação: o pnpm 12 não recusa instalar por causa dele, nem com `engineStrict: true`.
`.nvmrc` também não trava nada sozinho, porque só é lido por gerenciadores de versão de
Node.

Na máquina com Node 26.8.2 e sem pnpm, o passo a passo é:

1. `corepack enable` falha com `command not found`.
2. `npm install` roda e ignora `packageManager` em silêncio.
3. O usuário instala o pnpm uma vez, por `curl -fsSL https://get.pnpm.io/install.sh | sh -`
   ou por `npx get-pnpm`. Leva 4 segundos. Escreve em `~/.local/share/pnpm` e altera o
   `.bashrc`. Exige reabrir o shell.
4. A partir daí, qualquer comando `pnpm` dentro do repositório usa a versão de
   `packageManager`, mesmo que a versão instalada seja outra.

Versões candidatas hoje: `pnpm@12.4.1` publicado em 2026-09-10, e `pnpm@11.27.0`, última
da linha anterior. A linha 12 tem duas semanas de vida. Testei as duas e as duas se
autogerenciam.

**Evidência:**

```
$ node -v
v26.8.2
$ which pnpm corepack
which: no pnpm in (...)
which: no corepack in (...)
$ pacman -Ss '^corepack$'
extra/corepack 0.36.0-1     # pacote separado, não instalado
```

`https://nodejs.org/api/corepack.html` devolve HTTP 308 para
`https://github.com/nodejs/corepack#readme`, que diz: "Corepack is distributed with
Node.js from version 14.19.0 up to (but not including) 25.0.0."

Troca automática de versão, com `packageManager` apontando para uma versão diferente da
instalada:

```
$ cat package.json | grep packageManager
  "packageManager": "pnpm@12.3.0",
$ pnpm -v          # binário instalado é o 12.4.1
12.3.0
$ pnpm install
Done in 356ms using pnpm v12.3.0
```

O mesmo com a linha anterior:

```
  "packageManager": "pnpm@11.27.0"
$ pnpm -v
11.27.0
$ pnpm install
Done in 8.4s using pnpm v11.27.0
```

`packageManager` ignorado pelo npm:

```
$ npm install          # com "packageManager": "pnpm@12.4.1"
up to date, audited 1 package in 319ms
found 0 vulnerabilities
```

`engines` não é aplicado:

```
$ cat package.json
{ "name": "engtest", "private": true, "engines": { "node": ">=99.0.0" }, ... }
$ pnpm install
+ is-odd 3.0.1
Done in 508ms using pnpm v12.4.1     # exit=0, rodando em Node 26.8.2

$ cat pnpm-workspace.yaml
engineStrict: true
$ pnpm install
Done in 57ms using pnpm v12.4.1      # exit=0 de novo
```

Bootstrap medido, com `HOME` isolado:

```
$ time curl -fsSL https://get.pnpm.io/install.sh | sh -
real 0m3.678s
$ .../.local/share/pnpm/bin/pnpm -v
12.4.1
```

**Confiança:** `fato verificado`

### P2 — Árvore mínima que faz `pnpm install --frozen-lockfile` e `pnpm -r build` passarem

**Resposta:** O mínimo absoluto são quatro arquivos na raiz mais um pacote com script
`build`: `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml` e o `package.json` do
pacote. Sem `pnpm-lock.yaml` versionado, `--frozen-lockfile` falha. Essa árvore mínima não
atende o DoD, que também cobra lint, tipos, testes e formatação.

A árvore que montei e que passa nas seis verificações tem 29 arquivos versionados:

```
.gitignore
.prettierignore
package.json
pnpm-workspace.yaml
pnpm-lock.yaml
prettier.config.js
tsconfig.base.json
apps/api/package.json
apps/api/tsconfig.json
apps/api/tsconfig.build.json
apps/api/eslint.config.js
apps/api/src/index.ts
apps/api/src/config.ts
apps/api/src/config.test.ts
apps/web/package.json
apps/web/tsconfig.json
apps/web/eslint.config.js
apps/web/vite.config.ts
apps/web/index.html
apps/web/src/main.tsx
apps/web/src/App.tsx
apps/web/src/App.test.tsx
packages/shared/package.json
packages/shared/tsconfig.json
packages/shared/tsconfig.build.json
packages/shared/eslint.config.js
packages/shared/src/index.ts
packages/shared/src/index.test.ts
packages/config/package.json
packages/config/eslint.base.js
```

Faltam nessa lista o `README.md` e os `.env.example`, que a ordem cobra e que não
influenciam build. Conteúdo essencial de cada arquivo de configuração está na seção
`Material bruto`, no fim.

Dois pontos do `pnpm-workspace.yaml` merecem atenção. Primeiro, no pnpm 12 o `.npmrc` só
vale para autenticação e registro. Toda outra configuração mora no `pnpm-workspace.yaml`.
Segundo, o `pnpm-workspace.yaml` é onde vai `allowBuilds`, e sem ele o install quebra
assim que entrar uma dependência com script de instalação. Está detalhado em
`Achados não previstos`.

**Evidência:**

```
$ pnpm install --frozen-lockfile   # package.json com dependência a mais que o lockfile
        specifiers in the lockfile don't match specifiers in package.json:
      * in importers["."]:
      * 1 dependency was added: cowsay@1.6.0
exit=1
```

Sequência completa num clone limpo, com `HOME` e cache novos:

```
== pnpm install --frozen-lockfile
2.314 s   exit=0
== pnpm -r build
3.413 s   exit=0
== pnpm -r lint
2.959 s   exit=0
== pnpm -r typecheck
2.850 s   exit=0
== pnpm -r test
2.847 s   exit=0
== pnpm format:check
0.718 s   exit=0
== du -sh node_modules
135M
```

**Confiança:** `fato verificado`

### P3 — Divisão dos scripts entre raiz e pacotes, e o que `pnpm -r` faz com script ausente

**Resposta:** `build`, `lint`, `typecheck` e `test` ficam em cada pacote. A raiz só
reexporta, e a reexportação é conveniência, porque `pnpm -r` não executa o script da raiz.
`format:check` fica só na raiz, porque Prettier varre o repositório inteiro de uma vez e
tem que alcançar `docs/` e os arquivos de configuração.

O comportamento de `pnpm -r <script>` com script ausente tem dois casos, e o segundo é um
buraco no DoD:

| Situação | O que acontece | Código de saída |
|---|---|---|
| Nenhum pacote tem o script | `ERR_PNPM_RECURSIVE_RUN_NO_SCRIPT` | 1 |
| Alguns pacotes têm o script | roda só neles, ignora os demais em silêncio | 0 |

Ou seja, se alguém apagar o `test` de `apps/api`, `pnpm -r test` continua verde. O item C1
do DoD passaria sem testar a API. O flag `--fail-if-no-match` existe no `pnpm run`, mas ele
trata de filtro que não casa, não de script ausente num pacote selecionado.

A ordem de execução é topológica. `packages/shared` roda antes de `apps/api` e
`apps/web`, porque os dois o declaram em `dependencies` com `workspace:*`. Os dois apps
rodam em paralelo entre si.

**Evidência:**

```
$ pnpm -r inexistente
Error: ERR_PNPM_RECURSIVE_RUN_NO_SCRIPT
  × None of the selected packages has a "inexistente" script
exit=1

$ pnpm -r lint          # packages/config não tem script lint
packages/shared lint$ eslint .
apps/api lint$ eslint .
apps/web lint$ eslint .
exit=0                  # packages/config foi ignorado sem aviso

$ pnpm -r build         # a raiz tem "build": "pnpm -r build"
packages/shared build$ tsc -p tsconfig.build.json
packages/shared build: Done
apps/api build$ tsc -p tsconfig.build.json
apps/web build$ tsc -p tsconfig.json --noEmit && vite build
                        # a raiz não entra, não há recursão infinita
```

**Confiança:** `fato verificado`

### P4 — ESLint e Prettier compartilhados, e o pacote de configuração

**Resposta:** ESLint 10 só lê configuração achatada, num arquivo `eslint.config.js`. O
pacote compartilhado `@casa/config` exporta a configuração por `exports`, e cada pacote o
declara como `"@casa/config": "workspace:*"` em `devDependencies`. O arquivo de cada
pacote fica com duas linhas.

Testei as duas formas de organizar:

- **Um `eslint.config.js` por pacote.** Funciona. O `ignores: ['dist/**']` do pacote de
  configuração resolve certo, porque padrão de `ignores` é relativo ao diretório do
  arquivo de configuração.
- **Um `eslint.config.js` só na raiz.** Também funciona, e o `eslint .` rodado dentro de
  `apps/api` encontra a configuração subindo os diretórios. Mas o `ignores: ['dist/**']`
  para de valer para `apps/web/dist`, e o lint passa a analisar o bundle gerado. Deu 840
  erros. Corrige com `ignores: ['**/dist/**']`.

Versões que funcionam juntas, verificadas rodando:

| Pacote | Versão | Publicada em |
|---|---|---|
| `eslint` | 10.10.0 | 2026-09-04 |
| `typescript-eslint` | 8.70.0 | 2026-09-07 |
| `eslint-config-prettier` | 10.1.8 | — |
| `prettier` | 3.9.6 | 2026-07-21 |
| `typescript` | 6.0.3 | 2026-04-16 |

Conflitos conhecidos, os dois verificados aqui:

1. **`typescript-eslint` não roda com TypeScript 7.** O par de peer é
   `typescript: ">=4.8.4 <6.1.0"`. A documentação diz que versão fora da faixa só emite
   aviso. Não é o que acontece com a 7.0: o pacote lança erro e o lint morre.
2. **Prettier cobra formatação do `pnpm-lock.yaml`.** Sem um `.prettierignore`,
   `pnpm format:check` falha logo depois do primeiro `pnpm install`. O item B4 do DoD
   ficaria vermelho por um arquivo gerado.

**Evidência:**

```
$ pnpm -r lint      # com typescript@7.0.2 instalado
packages/shared lint: Error: typescript-eslint does not support TS 7.0.
    at Object.<anonymous> (.../typescript-eslint/dist/index.js:52:11)
exit=1

$ pnpm peers check
✕ unmet peer typescript
  Installed: 7.0.2
  Wanted:
    ">=4.8.4 <6.1.0":
      typescript-eslint@8.70.0
      @typescript-eslint/parser@8.70.0
      ...
```

`https://typescript-eslint.io/users/dependency-versions/` devolve: "The version range of
TypeScript currently supported is `>=4.8.4 <6.1.0`", e diz que fora da faixa o parser
mostra um aviso. O comportamento real com a 7.0 é erro, não aviso.

```
$ pnpm format:check     # sem .prettierignore
[warn] package.json
[warn] packages/config/package.json
[warn] packages/shared/package.json
[warn] pnpm-lock.yaml
[warn] pnpm-workspace.yaml
[warn] Code style issues found in 5 files.
exit=1

$ cat .prettierignore
pnpm-lock.yaml
dist/
$ pnpm format:check
All matched files use Prettier code style!
exit=0
```

Configuração única na raiz sem `**/`:

```
$ pnpm --filter @casa/web lint
  9:51231  error  Expected an assignment or function call ...  @typescript-eslint/no-unused-expressions
✖ 840 problems (840 errors, 0 warnings)     # analisou apps/web/dist/assets/index-*.js
```

**Confiança:** `fato verificado`

### P5 — Runner de teste para os três casos, com um comando único na raiz

**Resposta:** Duas opções reais. Rodei as duas.

**Opção A, Vitest por pacote, chamado por `pnpm -r test`.** É a que passa nos três casos
sem adaptação. `apps/api` e `packages/shared` rodam em ambiente `node`. `apps/web` roda em
`jsdom`, configurado em `apps/web/vite.config.ts`. Nenhum acesso a rede, atendendo C4. O
comando único da raiz é o próprio `pnpm -r test`, que é o que o DoD já cobra.

Existe uma variante da opção A com um `vitest.config.ts` na raiz usando `projects`, que
roda tudo num processo só. Funciona, e o relatório sai unificado. Custa um arquivo a mais e
paga o preço de não aparecer em `pnpm -r test`, que passaria a não ter nenhum pacote com
script `test` e falharia com `ERR_PNPM_RECURSIVE_RUN_NO_SCRIPT`.

**Opção B, `node --test` nativo.** O Node 26 roda `.ts` direto, sem `tsx` e sem
`ts-node`. `process.features.typescript` responde `strip`. `node --test` encontra e roda
`*.test.ts`. Custo zero em dependências para `apps/api` e `packages/shared`. Mas **não
cobre `apps/web`**: o Node recusa `.tsx`, porque JSX não é tipo a remover, é sintaxe a
transformar. A documentação do Node é explícita: ".tsx files are unsupported". Então a
opção B obriga a manter Vitest só para o web, e o repositório fica com dois runners e dois
formatos de teste.

Três restrições do modo `strip` que o contrato precisa fixar se a opção B entrar:

- `enum`, `namespace` com código, propriedade de parâmetro e decorador quebram em execução.
  `erasableSyntaxOnly: true` no `tsconfig` transforma isso em erro de tipo.
- Extensão de arquivo é obrigatória no import, e tem que ser a real. `import './a.js'`
  falha se só existe `a.ts`.
- `import type` é obrigatório para importar tipo.

**Evidência:**

```
$ pnpm -r test
packages/shared test:  RUN  v5.0.0 .../packages/shared
packages/shared test:  Test Files  1 passed (1)
apps/api test:  Test Files  1 passed (1)
apps/web test:  Test Files  1 passed (1)     # environment: jsdom
exit=0
```

Node nativo:

```
$ node -e "console.log(process.features.typescript)"
strip
$ node --test
✔ cents (1.633039ms)
ℹ tests 1
ℹ pass 1

$ cat x.tsx
const a = <p>oi</p>;
$ node x.tsx
SyntaxError: Unexpected token '<'

$ cat d.ts
enum E { A, B }
$ node d.ts
code: 'ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX'

$ node c.ts        # c.ts faz import from './a.js', existe só a.ts
  url: 'file:///.../a.js'     # ERR_MODULE_NOT_FOUND
```

`https://nodejs.org/api/typescript.html` devolve: "v25.2.0, v24.12.0: Type stripping is now
stable", "Stability: 2 - Stable", ".tsx files are unsupported" e "file extensions are
mandatory in `import` statements".

Vitest no `vite.config.ts` tem uma pegadinha de tipo. `defineConfig` importado de `vite`
não aceita a chave `test`. Tem que vir de `vitest/config`:

```
apps/web build: vite.config.ts(6,3): error TS2769: No overload matches this call.
apps/web build:     Object literal may only specify known properties,
apps/web build:     and 'test' does not exist in type 'UserConfigExport'.
```

**Confiança:** `fato verificado`

### P6 — O que `apps/api` contém neste marco

**Decisão do operador.** Não escolho. Ela está repetida na seção
`Perguntas ao operador`, como P1.

O que dá para afirmar sem decidir:

O mínimo que permite `build` e teste de fumaça é um módulo que exporta uma função pura, um
ponto de entrada que a usa, e um teste dessa função. Foi o que montei: `src/config.ts` com
`loadConfig`, `src/index.ts` que imprime uma linha, e `src/config.test.ts`. Nenhum servidor
HTTP, nenhuma rota, nada de Fastify. Isso respeita o limite da ordem sobre o M2.

O que o `M1.5-compose-e-caddy` vai precisar encontrar aqui, olhando o roadmap e não o
código, porque o código não existe:

1. Um comando de início determinístico. Um script `start` no `package.json` de `apps/api`.
2. Um artefato em caminho fixo, ou a garantia de que o fonte roda direto.
3. Um jeito de instalar só as dependências de produção dentro da imagem. O pnpm tem
   `pnpm deploy --prod` para isso, que monta um diretório com o pacote e as dependências
   resolvidas, sem `devDependencies`.
4. Uma porta configurável por variável de ambiente, para o Caddy saber para onde mandar.

Se `apps/api` do M0 não tiver `start` nem artefato, o `M1.5` precisa inventar os dois, e
aí a interface foi decidida fora do contrato que deveria decidi-la.

As três opções estão em `Opções`, com custo.

**Evidência:** as três opções foram executadas e rodam. Saída em `Opções`.

**Confiança:** `fato verificado` para o que roda. `hipótese` para o que o `M1.5` vai
precisar, porque a unidade ainda não tem ordem escrita.

### P7 — O que `apps/web` contém neste marco, e o que isso fixa para o M8

**Resposta:** O mínimo que produz um build e um teste de fumaça de DOM é: `index.html`,
`src/main.tsx` montando a raiz do React, um componente `src/App.tsx` que consome
`packages/shared`, e um teste que renderiza esse componente. `vite build` gera
`apps/web/dist` em 190 ms.

Montei e rodei com React 19.3.0, `@vitejs/plugin-react` 6.1.1, Vite 8.3.0 e
`@testing-library/react` 16.3.0. Nada de manifest, nada de service worker, nada de rota,
nada de i18n. Isso respeita o limite da ordem sobre o M8.

O que a escolha de hoje já fixa para o M8:

| Escolha de hoje | O que fixa no M8 |
|---|---|
| Vite 8 com `@vitejs/plugin-react` | O PWA entra por plugin de Vite. `vite-plugin-pwa` é o caminho, e ele depende da major do Vite. |
| `index.html` na raiz de `apps/web` | É onde o `<link rel="manifest">` vai entrar. Nada a refazer. |
| `jsdom` como ambiente de teste do web | Teste de componente do M8 continua sem rede, atendendo C4. Teste de service worker não cabe em jsdom e vai precisar de outra coisa. |
| `apps/web/dist` como saída | É o diretório que o `M1.5` serve pelo Caddy. |
| React 19 com `createRoot` e `StrictMode` | Fixa a API de montagem. Capacitor no futuro envolve o mesmo bundle. |

Uma observação sobre o Vite 8: ele não usa mais esbuild para o bundle de produção, usa
Rolldown. Aparece no lockfile como `@rolldown/binding-*`, um binário por plataforma.

**Evidência:**

```
$ pnpm --filter @casa/web build
vite v8.3.0 building client environment for production...
✓ 16 modules transformed.
dist/index.html                  0.25 kB │ gzip:  0.19 kB
dist/assets/index-Dkl_2NRr.js  219.77 kB │ gzip: 68.69 kB
✓ built in 179ms

$ pnpm --filter @casa/web test
 RUN  v5.0.0 .../apps/web
 Test Files  1 passed (1)
 Duration  1.31s (environment 80%, ...)
```

O lockfile lista as plataformas todas, então `--frozen-lockfile` funciona em qualquer
máquina:

```
$ grep -oE '@rolldown/binding-[a-z0-9-]*' pnpm-lock.yaml | sort -u
@rolldown/binding-darwin-arm64
@rolldown/binding-darwin-x64
@rolldown/binding-linux-arm-gnueabihf
@rolldown/binding-linux-arm64-gnu
@rolldown/binding-linux-arm64-musl
@rolldown/binding-linux-ppc64-gnu
@rolldown/binding-linux-s390x-gnu
@rolldown/binding-linux-x64-gnu
@rolldown/binding-linux-x64-musl
@rolldown/binding-win32-arm64-msvc
```

**Confiança:** `fato verificado`

### P8 — `packages/shared`, o mínimo que justifica existir, e fonte contra build

**Resposta:** O que justifica o pacote já no M0 é ser o lugar onde o M7 vai colocar o
cliente gerado do OpenAPI, e onde a regra de centavos do item G5 do DoD vai morar. Criar a
pasta no M0 custa cinco arquivos. Criá-la no M7 custa mexer na configuração dos dois apps
com o repositório já cheio.

Para o M0 o conteúdo mínimo é uma função pura com teste. Usei formatação de centavos, que é
exatamente o tipo de coisa que o G5 vai cobrar mais tarde.

A comparação entre as duas formas de consumo é o achado mais importante desta pergunta.

**Consumir o build.** `exports` aponta para `./dist/index.js`, o pacote tem script `build`
com `tsc` emitindo. Custo: `pnpm -r typecheck` e `pnpm -r test` **falham** num clone limpo
enquanto `dist` não existir. O DoD fica com ordem obrigatória, `build` antes de tudo.

**Consumir o fonte.** `exports` aponta para `./src/index.ts`, o script `build` do pacote
vira só `tsc --noEmit`. Custo: os quatro comandos passam em qualquer ordem num clone limpo.
Em troca, o `apps/api` compilado emite `import { formatCents } from '@casa/shared'`, que em
execução resolve para um `.ts` e depende do modo `strip` do Node. Rodou aqui. Mas amarra a
produção ao `strip`, e obriga a imagem do container a levar o fonte de `packages/shared`.

A ordem topológica de `pnpm -r build` é a mesma nas duas formas, porque a aresta do grafo é
`workspace:*` em `dependencies`, não o formato do `exports`.

**Evidência:**

Consumindo o `dist`, clone limpo, sem `build` antes:

```
$ pnpm install --frozen-lockfile
$ pnpm -r test
packages/shared test:  Test Files  1 passed (1)
apps/api test:  Test Files  1 passed (1)
apps/web test: Error: Failed to resolve import "@casa/shared" from "src/App.tsx".
apps/web test:  Test Files  1 failed (1)
exit=1

$ pnpm -r typecheck
packages/shared typecheck: Done
apps/api typecheck: src/index.ts(1,29): error TS2307: Cannot find module '@casa/shared'
                    or its corresponding type declarations.
apps/api typecheck: Failed
apps/web typecheck: Failed
exit=1
```

Consumindo o fonte, mesmo clone limpo, sem `build` antes:

```
$ pnpm -r typecheck
packages/shared typecheck: Done
apps/api typecheck: Done
apps/web typecheck: Done
exit=0
$ pnpm -r test
packages/shared test:  Test Files  1 passed (1)
apps/api test:  Test Files  1 passed (1)
apps/web test:  Test Files  1 passed (1)
exit=0
```

O binário da API roda nas duas formas:

```
$ node apps/api/dist/index.js
api ok port=3000 sample=10,99
```

Ordem topológica, idêntica nas duas:

```
packages/shared build$ ...
packages/shared build: Done
apps/api build$ ...
apps/web build$ ...
```

**Confiança:** `fato verificado`

### P9 — Variáveis de ambiente neste marco, e o que não deveria estar versionado

**Resposta:** Neste marco existem duas variáveis, e só porque o DoD cobra que o
`.env.example` exista e que o código leia alguma coisa. A proposta mínima:

| Arquivo | Variável | Para quê |
|---|---|---|
| `apps/api/.env.example` | `PORT` | porta que o M2 vai usar e que o `M1.5` precisa conhecer |
| `apps/api/.env.example` | `NODE_ENV` | modo de execução |
| `apps/web/.env.example` | `VITE_API_URL` | endereço da API que o M8 vai consumir |

A API lê sem dependência nenhuma. O Node 26 tem `--env-file`, `--env-file-if-exists` e
`process.loadEnvFile()`. Nada de `dotenv`. `--env-file-if-exists` é o que serve ao
desenvolvimento, porque não quebra quando o `.env` não existe.

O web lê por `import.meta.env.VITE_*`. Verifiquei o item E4 na prática: variável sem o
prefixo `VITE_` não entra no bundle. Verifiquei também qual arquivo o Vite lê num monorepo,
porque isso não era óbvio: ele lê `apps/web/.env`, e **não** lê o `.env` da raiz do
monorepo. Então `.env.example` por app é a forma certa, e um `.env` na raiz seria uma
armadilha silenciosa.

**O que hoje está no repositório e não deveria ficar como está:**

1. **Não existe `.gitignore`.** Nenhum. O item E2 do DoD já vale desde já e hoje não tem
   como ser atendido. Precisa de pelo menos `node_modules/`, `dist/`, `.env`, `*.local` e
   `*.tsbuildinfo`.
2. **`.mcp.json` está para ser versionado e carrega o identificador do projeto Supabase.**
   O repositório é público. Não é segredo pela definição do item E1, mas revela a URL do
   projeto. Vira pergunta ao operador, P2 abaixo.
3. **`.claude/settings.local.json` está para ser versionado.** O nome diz `local`. Não tem
   segredo dentro, só duas chaves de habilitação de MCP. Candidato natural a `.gitignore`.
4. **`docs/roadmap.md` foi apagado no diretório de trabalho e a remoção não foi commitada.
   `docs/scope-brief.md` está modificado e não commitado.** A árvore está suja antes da
   unidade começar. O item A3 do DoD compara o diff da unidade com a lista do contrato, e
   essa sujeira vai entrar no diff se não for resolvida antes.

Nenhum segredo foi encontrado no que está para ser versionado.

**Evidência:**

```
$ git ls-files
LICENSE
docs/roadmap.md
docs/scope-brief.md

$ git status --porcelain
 D docs/roadmap.md
 M docs/scope-brief.md
?? .claude/
?? .mcp.json
?? CLAUDE.md
?? "docs/fase 1/"
?? docs/handoff.md

$ ls -la .gitignore
ls: cannot access '.gitignore': No such file or directory

$ git ls-files | grep -i env
(nenhuma saída)

$ cat .mcp.json
{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp?project_ref=omgheudterjqrjunpack&features=..."
    }
  }
}

$ grep -rniE 'password|secret|token|service_role|postgres(ql)?://' .claude .mcp.json
(nenhuma saída fora dos arquivos de regra)
```

Node lendo `.env` sem dependência:

```
$ node --env-file=.env -e "console.log(process.env.PORT, process.env.API_NAME)"
9999 casa
$ node --env-file-if-exists=.naoexiste -e "console.log('seguiu', process.env.PORT)"
.naoexiste not found. Continuing without it.
seguiu undefined
$ node --env-file=.naoexiste -e "console.log('x')"
node: .naoexiste: not found
```

Qual `.env` o Vite lê, com `apps/web/.env` e `.env` da raiz ao mesmo tempo:

```
$ grep -c 'VALOR_DO_APP_XYZ' apps/web/dist/assets/*.js    # de apps/web/.env
1
$ grep -c 'VALOR_DA_RAIZ_XYZ' apps/web/dist/assets/*.js   # do .env da raiz
0
$ grep -c 'AUSENTE_RAIZ' apps/web/dist/assets/*.js        # o fallback entrou
1
```

Variável sem prefixo não vaza:

```
$ cat apps/web/.env
VITE_API_URL=http://localhost:3000
SEGREDO=nao_deve_vazar
$ grep -o 'http://localhost:3000' apps/web/dist/assets/*.js | head -1
http://localhost:3000
$ grep -c 'nao_deve_vazar' apps/web/dist/assets/*.js
0
```

`https://vite.dev/guide/env-and-mode` devolve: "Variables prefixed with `VITE_` will be
exposed in client-side source code after Vite bundling" e "`VITE_*` variables should not
contain sensitive information such as API keys."

**Confiança:** `fato verificado`

### P10 — README de cinco minutos: sequência e tempo real

**Resposta:** A sequência tem cinco passos e leva menos de trinta segundos de máquina numa
conexão razoável. O gargalo não é comando nenhum, é o humano reabrir o shell depois de
instalar o pnpm.

```bash
# 1. instalar o pnpm, uma vez por máquina
curl -fsSL https://get.pnpm.io/install.sh | sh -
source ~/.bashrc

# 2. clonar
git clone https://github.com/casa-automatica/casa-automatica.git
cd casa-automatica

# 3. instalar
pnpm install --frozen-lockfile

# 4. configurar
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# 5. verificar
pnpm -r build && pnpm -r lint && pnpm -r typecheck && pnpm -r test && pnpm format:check
```

Tempos medidos, clone limpo, `HOME` e cache novos, nada aproveitado de instalação
anterior:

| Passo | Tempo |
|---|---|
| `curl ... install.sh \| sh -` | 3,7 s |
| `pnpm install --frozen-lockfile` | 2,3 s |
| `pnpm -r build` | 3,4 s |
| `pnpm -r lint` | 3,0 s |
| `pnpm -r typecheck` | 2,9 s |
| `pnpm -r test` | 2,8 s |
| `pnpm format:check` | 0,7 s |
| **soma** | **18,8 s** |

`node_modules` fica com 135 MB. A loja do pnpm fica com 136 MB no primeiro uso e é
compartilhada entre projetos depois.

Numa segunda máquina com a loja já quente, `pnpm install --frozen-lockfile` cai para 88 ms,
porque o pnpm liga os arquivos por hard link em vez de copiar.

**Evidência:** o bloco de tempos da resposta P2, medido com `TIMEFORMAT='%3R s'`. E:

```
$ pnpm install --frozen-lockfile     # loja quente
Done in 88ms using pnpm v12.4.1
real 0m0.185s
```

O tempo de rede do `git clone` não foi medido, porque o clone do experimento foi local.
O repositório real hoje tem três arquivos versionados, então o clone é desprezível.

**Confiança:** `fato verificado`, com a ressalva do `git clone` acima.

## Superfície

| Arquivo ou recurso | Existe hoje | O que muda |
|---|---|---|
| `package.json` | não | criado na raiz, com `packageManager`, `engines` e os scripts agregadores |
| `pnpm-workspace.yaml` | não | criado, com `packages` e `allowBuilds` |
| `pnpm-lock.yaml` | não | criado e versionado, obrigatório para `--frozen-lockfile` |
| `.gitignore` | não | criado. Hoje o repositório não tem nenhum |
| `.prettierignore` | não | criado. Sem ele `pnpm format:check` falha por causa do lockfile |
| `prettier.config.js` | não | criado na raiz |
| `tsconfig.base.json` | não | criado na raiz, com `strict: true` para o item B3 |
| `README.md` | não | criado, com a sequência da resposta P10 |
| `apps/api/` | não | criada inteira. Conteúdo depende da resposta do operador à P1 |
| `apps/web/` | não | criada inteira, com React, Vite e um teste em jsdom |
| `packages/shared/` | não | criada, com uma função pura e o teste dela |
| `packages/config/` | não | criada, com a configuração de ESLint compartilhada |
| `apps/api/.env.example` | não | criado, com `PORT` e `NODE_ENV` |
| `apps/web/.env.example` | não | criado, com `VITE_API_URL` |
| `docs/roadmap.md` | sim, apagado sem commit | resolver antes da execução, para não sujar o diff |
| `docs/scope-brief.md` | sim, modificado sem commit | idem |
| `.mcp.json` | sim, não versionado | versionar ou ignorar. Pergunta P2 ao operador |
| `.claude/settings.local.json` | sim, não versionado | candidato a entrar no `.gitignore` |

## Achados não previstos

**1. `pnpm install` sai com código 1 quando uma dependência tem script de instalação não
aprovado.** Isso não aparece na árvore do M0, porque nenhuma das dependências que escolhi
tem script. Aparece no M1 e no M2, quando entrar qualquer coisa com binário nativo. O
comportamento é erro, não aviso, e o item B1 do DoD quebra:

```
$ pnpm add esbuild
Error: ERR_PNPM_IGNORED_BUILDS
  × adding a new package
  ╰─▶ Ignored build scripts: esbuild@0.28.2
  help: Run "pnpm approve-builds" to pick which dependencies should be allowed to run scripts.
exit=1
```

A correção mora no `pnpm-workspace.yaml`, e a sintaxe não é lista, é mapa. Lista dá erro
de parser:

```yaml
allowBuilds:
  esbuild: true
```

```
$ pnpm install
+ esbuild 0.28.2
Done in 269ms using pnpm v12.4.1
exit=0
```

`https://pnpm.io/settings/build` devolve: com `strictDepBuilds: true`, que é o padrão, "the
installation exits with a non-zero code". O contrato do M0 deve criar a chave `allowBuilds`
desde já, mesmo vazia, e o DoD do M0 deve dizer que dependência com script de instalação
entra ali.

**2. O arquivo `tsconfig.json` que exclui os testes deixa os testes sem checagem de tipo.**
Foi o desenho que montei primeiro. `pnpm -r typecheck` passava com erro de tipo dentro de um
arquivo de teste. O item B3 do DoD ficaria cego para metade do código novo. O conserto é
dividir em dois arquivos: `tsconfig.json` inclui tudo e não emite, `tsconfig.build.json`
estende e exclui os testes. Verificado:

```
$ echo 'const naoUsado: number = "texto";' >> packages/shared/src/index.test.ts
$ pnpm --filter @casa/shared typecheck
src/index.test.ts(9,7): error TS2322: Type 'string' is not assignable to type 'number'.
$ ls packages/shared/dist
index.d.ts  index.js  index.js.map       # sem .test.js
```

**3. `pnpm add -D @types/node` instala a versão 22 numa máquina com Node 26.** A tag
`latest` do pacote `@types/node` aponta para `22.20.2`. A versão que corresponde ao Node 26
é `26.5.1`, publicada no mesmo dia, e só é alcançada pelas tags `ts5.6` a `ts6.0` ou por
pedido explícito. Se o executor digitar o comando sem versão, os tipos ficam três majors
atrás do runtime, e APIs novas do Node somem do autocompletar sem erro nenhum.

```
$ pnpm add -D @types/node
+ @types/node 22.20.2
$ npm view @types/node dist-tags | grep -E "latest|ts6.0"
  latest: '22.20.2',
  'ts6.0': '26.5.1'
```

**4. A documentação do `typescript-eslint` está errada sobre versão não suportada.** Ela diz
que o parser emite aviso. Com TypeScript 7.0 o pacote lança erro antes de qualquer parsing.
Está na resposta P4.

**5. `pnpm -r` não é uma rede de segurança.** Script ausente num pacote não reprova. Está na
resposta P3. Vale para `lint`, `typecheck` e `test` do DoD.

**6. A maturidade das versões mais novas é curta.** `pnpm@12.0.0` tem duas semanas.
`vitest@5.0.0` tem nove dias. `typescript@7.0.2` tem dois meses e não passa no lint. As
linhas anteriores existem e funcionam: `pnpm@11.27.0`, `vitest@4.1.11` com peer de Vite 8,
`typescript@6.0.3`. Testei a combinação conservadora inteira e ela passa igual.

## Opções

### Sobre o conteúdo de `apps/api`, que é a pergunta P6 da ordem

As três foram construídas e executadas. Detalhe do custo em cada uma.

#### Opção A — `tsc` emite, o container roda `dist`

`apps/api/src` tem `config.ts`, `index.ts` e `config.test.ts`. `build` roda
`tsc -p tsconfig.build.json` e gera `apps/api/dist`. `start` roda `node dist/index.js`.
Imports internos usam extensão `.js`, que é o que o `tsc` espera com `module: nodenext`.

Custo: um passo de build para rodar qualquer coisa. `pnpm -r typecheck` e `pnpm -r test`
passam a depender de `pnpm -r build` ter rodado antes, se `packages/shared` também for
consumido pelo `dist`.

Consequência: fecha a porta para importar `.ts` direto. Abre a imagem de container mais
enxuta, porque só o `dist` e as dependências de produção precisam entrar. É o caminho que o
`M1.5` tem menos trabalho para consumir.

```
$ pnpm -r build && node apps/api/dist/index.js
api ok port=3000 sample=10,99
$ pnpm --filter @casa/api start
$ node dist/index.js
api ok port=3000 sample=10,99
```

#### Opção B — sem emissão, o container roda o fonte com o `strip` do Node

`build` roda só `tsc --noEmit`. `start` roda `node src/index.ts`. Imports internos usam
extensão `.ts`, o que exige `allowImportingTsExtensions` no `tsconfig`.

Custo: `erasableSyntaxOnly: true` vira obrigatório, senão `enum` e decorador passam na
checagem de tipo e quebram em execução. O `packages/shared` também precisa ser consumido
como fonte, senão o `.ts` importa um `.js` que não existe.

Consequência: fecha a porta para decorador, o que importa se algum dia entrar uma
biblioteca que dependa deles. Abre a simplificação de não ter etapa de build na API. A
imagem de container leva o fonte de `apps/api` e de `packages/shared`.

```
$ node apps/api/dist/index.js     # variante fonte, api compilada importando shared .ts
api ok port=3000 sample=10,99
$ node -e "console.log(process.features.typescript)"
strip
```

#### Opção C — só um módulo, sem ponto de entrada executável

`apps/api/src` tem `config.ts` e `config.test.ts`, e nada mais. `build` roda `tsc`. Não há
`start`, não há `index.ts`.

Custo: o `M1.5` não encontra comando de início e precisa inventá-lo, ou esperar o M2.
Consequência: adia a decisão A contra B para o M2, quando o Fastify entrar e a forma de
execução ficar óbvia. Em troca o `M1.5` pode ficar bloqueado ou construir um container que
não sobe nada.

### Sobre o runner de teste, que é decisão do condutor

Vitest em todo lugar, chamado por `pnpm -r test`. Custo: três dependências de
desenvolvimento por pacote. Consequência: um formato de teste só, e o comando do DoD é o
que já está escrito.

`node --test` na API e no shared, Vitest só no web. Custo: dois runners, dois formatos, e
restrição permanente de sintaxe no código da API. Consequência: menos dependência, e o
`dev` da API roda sem transpilador.

### Sobre a linha de versões, que é decisão do condutor

Linha nova: `pnpm@12.4.1`, `vitest@5.0.0`, `vite@8.3.0`, `eslint@10.10.0`,
`typescript@6.0.3`. Custo: `pnpm` e `vitest` com menos de um mês de campo. Consequência:
menos atualização nos próximos meses.

Linha conservadora: `pnpm@11.27.0`, `vitest@4.1.11`, o resto igual. Custo: uma atualização
a mais no horizonte. Consequência: menos risco de bug de versão recém-lançada numa unidade
que é a fundação de tudo. Testei e passa igual.

`typescript@7.0.2` está fora das duas, porque quebra o lint.

Propor é papel do explorador. Escolher, não.

## Não descoberto

- **Quanto tempo o `git clone` real leva.** O experimento clonou local. O repositório
  público hoje tem três arquivos versionados, então o clone é rápido, mas não medi contra o
  GitHub.
- **Se `pnpm install` funciona sem rede com a loja quente.** Não testei o modo offline. O
  item C4 do DoD fala de teste sem rede, e os testes passam, mas o `install` não foi
  verificado nessa condição.
- **Se o `M1.5` prefere `pnpm deploy --prod` ou uma imagem multi-estágio.** Não é desta
  unidade e não tem ordem escrita. Só registrei que o comando existe.
- **Comportamento em Windows e em macOS.** Tudo foi rodado em Linux. O lockfile lista os
  binários das outras plataformas, então `--frozen-lockfile` deve funcionar, mas não
  verifiquei.
- **Se `typescript-eslint` vai suportar TypeScript 7 em breve.** A página de versões
  suportadas não menciona a 7. Não achei anúncio de prazo.
- **Se o `pnpm` respeita `packageManager` quando o binário instalado é muito antigo.**
  Testei com 12.4.1 chamando 12.3.0 e 11.27.0. Não testei uma versão anterior chamando uma
  posterior.

## Riscos vistos daqui

| Risco | Sinal de que quebrou |
|---|---|
| Executor roda `pnpm add` sem fixar versão e traz `@types/node@22` | Autocompletar sem APIs do Node 26. Nenhum erro de compilação. |
| Falta `.prettierignore` | `pnpm format:check` falha apontando `pnpm-lock.yaml`. |
| Falta `allowBuilds` no `pnpm-workspace.yaml` | `pnpm install` sai com `ERR_PNPM_IGNORED_BUILDS` na primeira dependência com script. Só aparece no M1 ou no M2. |
| `tsconfig` de build usado também para `typecheck` | Erro de tipo dentro de arquivo de teste passa despercebido. |
| Pacote sem script `test` ou `lint` | `pnpm -r` sai com 0. O DoD fica verde sem verificar nada. |
| `packages/shared` consumido pelo `dist` | `pnpm -r test` falha num clone limpo se o revisor não rodar `build` antes. |
| Árvore de trabalho suja antes da unidade começar | `git diff --stat` do item A3 traz `docs/roadmap.md` e `docs/scope-brief.md` junto com o código. |
| `packageManager` e `engines` confundidos | Alguém acha que `engines` protege. Não protege. Node errado passa. |

## Material bruto

Conteúdo essencial dos arquivos de configuração da árvore que passou nas seis verificações.
Não é o contrato. É o que rodou.

`package.json` da raiz:

```json
{
  "name": "casa-automatica",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@12.4.1",
  "engines": { "node": ">=26.0.0" },
  "scripts": {
    "build": "pnpm -r build",
    "lint": "pnpm -r lint",
    "typecheck": "pnpm -r typecheck",
    "test": "pnpm -r test",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  },
  "devDependencies": {
    "eslint": "10.10.0",
    "prettier": "3.9.6",
    "typescript": "6.0.3"
  }
}
```

`pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
allowBuilds: {}
```

`tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "declaration": true,
    "sourceMap": true,
    "isolatedModules": true
  }
}
```

`packages/shared/tsconfig.json` e `packages/shared/tsconfig.build.json`, o mesmo par usado
em `apps/api`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src", "noEmit": true },
  "include": ["src/**/*"]
}
```

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": { "noEmit": false },
  "exclude": ["src/**/*.test.ts", "src/**/*.test.tsx"]
}
```

`apps/web/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "preserve",
    "moduleResolution": "bundler",
    "noEmit": true,
    "jsx": "react-jsx",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "types": ["vite/client"]
  },
  "include": ["src/**/*", "vite.config.ts"]
}
```

`packages/config/package.json` e `packages/config/eslint.base.js`:

```json
{
  "name": "@casa/config",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": { "./eslint": "./eslint.base.js" },
  "dependencies": {
    "eslint-config-prettier": "10.1.8",
    "globals": "16.5.0",
    "typescript-eslint": "8.70.0"
  }
}
```

```js
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export const base = tseslint.config(
  { ignores: ['dist/**'] },
  ...tseslint.configs.recommended,
  prettier,
);
```

`eslint.config.js` de cada pacote:

```js
import { base } from '@casa/config/eslint';
export default base;
```

`apps/web/vite.config.ts`, com o `defineConfig` vindo de `vitest/config`:

```ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom' },
});
```

`.prettierignore`:

```
pnpm-lock.yaml
dist/
```

Versões usadas, com data de publicação:

| Pacote | Versão | Publicada |
|---|---|---|
| `pnpm` | 12.4.1 | 2026-09-10 |
| `typescript` | 6.0.3 | 2026-04-16 |
| `eslint` | 10.10.0 | 2026-09-04 |
| `typescript-eslint` | 8.70.0 | 2026-09-07 |
| `prettier` | 3.9.6 | 2026-07-21 |
| `vite` | 8.3.0 | 2026-09-10 |
| `vitest` | 5.0.0 | 2026-09-03 |
| `react` | 19.3.0 | 2026-09-09 |
| `@types/node` | 26.5.1 | 2026-09-09 |

Fontes externas consultadas:

| URL | O que devolveu |
|---|---|
| `https://nodejs.org/api/corepack.html` | HTTP 308 para o repositório do Corepack no GitHub |
| `https://github.com/nodejs/corepack#readme` | Corepack distribuído até a versão 25.0.0, exclusive |
| `https://pnpm.io/installation` | script oficial e `npx get-pnpm`. Não menciona Corepack |
| `https://pnpm.io/settings` | só autenticação e registro vêm do `.npmrc` |
| `https://pnpm.io/settings/build` | sintaxe de `allowBuilds` e saída não zero com `strictDepBuilds` |
| `https://typescript-eslint.io/users/dependency-versions/` | faixa `>=4.8.4 <6.1.0`, sem menção à 7 |
| `https://nodejs.org/api/typescript.html` | `strip` estável, `.tsx` não suportado, extensão obrigatória |
| `https://vite.dev/guide/env-and-mode` | prefixo `VITE_` e aviso sobre segredo no bundle |

## Perguntas ao operador

### P1 — O que `apps/api` contém neste marco, e como ele vai ser executado

Por que importa: a forma de execução da API é a interface que o `M1.5-compose-e-caddy` vai
consumir para montar o container. Se o M0 não fixar, o `M1.5` fixa sozinho, fora de um
contrato que o operador aprovou. A escolha também amarra o estilo de import em todo o
código da API daqui para a frente, porque `tsc` e o `strip` do Node querem extensões
diferentes.

Opções:

- **A** — `tsc` emite para `apps/api/dist`, e `start` roda `node dist/index.js`. · custo:
  uma etapa de build antes de rodar ou testar qualquer coisa, e `pnpm -r typecheck`
  passando a depender de `pnpm -r build` se `packages/shared` também for consumido pelo
  build. · consequência: fecha a porta para rodar `.ts` direto. Abre o container mais
  enxuto e o caminho mais curto para o `M1.5`. Import interno usa extensão `.js`.
- **B** — sem emissão, `start` roda `node src/index.ts` com o modo `strip` do Node 26. ·
  custo: `enum`, `namespace` com código, propriedade de parâmetro e decorador ficam
  proibidos para sempre no código da API, e `erasableSyntaxOnly: true` vira obrigatório. O
  container leva o fonte. · consequência: fecha a porta para biblioteca que dependa de
  decorador. Abre a simplificação de não ter etapa de build na API e resolve o acoplamento
  de ordem do `pnpm -r test`. Import interno usa extensão `.ts`.
- **C** — só `src/config.ts` e o teste dele, sem ponto de entrada executável. · custo: o
  `M1.5` não encontra comando de início e fica bloqueado ou inventa um. · consequência:
  adia a escolha entre A e B para o M2, quando o Fastify entrar.

Recomendação do condutor: **A**. O container do `M1.5` fica com o caminho mais curto, e
nenhuma porta se fecha para sempre.

**Decisão do operador, 2026-09-12: A.** O acoplamento de ordem vira sequência escrita no
`README.md` e na verificação do contrato: `build` antes de `typecheck` e de `test`.

### P2 — O `.mcp.json` entra no repositório público, é ignorado, ou entra sem o `project_ref`

Por que importa: o repositório `casa-automatica/casa-automatica` é público, e o arquivo
carrega `project_ref=omgheudterjqrjunpack`, que revela a URL do projeto Supabase. Não é
segredo pela definição do item E1 do DoD, porque não é senha nem chave. Mas é identificador
de infraestrutura, e o item E1 depende de o operador dizer onde está a linha. A unidade
precisa escrever o `.gitignore` e essa é a hora de decidir.

Opções:

- **A** — versionar o `.mcp.json` como está. · custo: o identificador do projeto fica
  público. · consequência: qualquer pessoa do time clona e já tem o MCP do Supabase
  configurado. Fecha a porta de esconder qual projeto é.
- **B** — colocar `.mcp.json` no `.gitignore`. · custo: cada pessoa do time monta o arquivo
  à mão, e isso precisa virar um passo documentado no `README.md` pelo item I2 do DoD. ·
  consequência: nada de identificador no repositório público.
- **C** — versionar um `.mcp.json.example` sem o `project_ref`, e ignorar o real. · custo:
  mais um arquivo de exemplo para manter em sincronia. · consequência: mesma proteção da
  opção B, com menos trabalho de configuração para quem clona.

Recomendação do condutor: **C**.

**Decisão do operador, 2026-09-12: C.** O exemplo entra sem `project_ref`, com
`read_only=true` e sem a feature `branching`, que não existe no plano gratuito.

### P3 — A árvore de trabalho suja é limpa antes da execução começar

Por que importa: `docs/roadmap.md` está apagado sem commit e `docs/scope-brief.md` está
modificado sem commit. O item A3 do DoD compara o diff da unidade com a lista de arquivos
do contrato. Se essas duas mudanças ainda estiverem soltas quando o executor commitar, elas
entram no diff da unidade e o item A3 reprova por um motivo que não tem nada a ver com o
monorepo.

Opções:

- **A** — commitar as duas mudanças antes de abrir a branch da unidade. · custo: um commit
  de documentação fora do ciclo. · consequência: a unidade começa com a árvore limpa.
- **B** — incluir as duas mudanças no escopo da unidade e listá-las no contrato. · custo: o
  contrato do monorepo passa a falar de arquivos de documentação sem relação com ele. ·
  consequência: o item A3 passa, mas a unidade fica mal fatiada.

Recomendação do condutor: **A**.

**Decisão do operador, 2026-09-12: A.** O condutor commitou a documentação pendente antes
de escrever o contrato desta unidade. Sobra `.claude/settings.local.json` sem versionar,
e é o `.gitignore` desta unidade que resolve isso.
