> Unidade: `M0.1-monorepo-base` · Marco: `M0` · Trilha: `dividida`
> Estado: aprovada
> Condutor aprovou: 2026-09-12 · Operador aprovou: 2026-09-12
> Reaberto em 2026-09-12 depois da rodada 1, e reaprovado na mesma data. Ver `## Alterações`.
> Base: `ordem.md`, `exploracao.md`, `docs/scope-brief.md`, `docs/fase 1/dod.md`

# Contrato — `M0.1-monorepo-base`

Este documento é auto-suficiente. Quem executa não leu a exploração e não vai lê-la.
Tudo que a execução precisa está aqui ou nos arquivos nomeados aqui.

## O que será construído

Um monorepo pnpm com três pacotes de produto e um de configuração. Quem clona o
repositório numa máquina limpa instala, constrói, e roda lint, checagem de tipos, testes e
formatação com cinco comandos, guiado pelo `README.md`. A API é um processo Node que
imprime uma linha e sai. O web é uma página React servida pelo Vite. O pacote compartilhado
tem uma função de formatação de centavos que os dois consomem. Nenhuma rota, nenhum banco,
nenhuma tela de produto.

## Interfaces e formatos

### Versões, todas exatas

Nenhuma dependência entra com `^` ou `~`. As versões abaixo são obrigatórias porque foram
medidas juntas, rodando.

| Pacote | Versão | Onde |
|---|---|---|
| `pnpm` | 12.4.1 | campo `packageManager` da raiz |
| `typescript` | 6.0.3 | `devDependencies` da raiz |
| `eslint` | 10.10.0 | `devDependencies` da raiz |
| `prettier` | 3.9.6 | `devDependencies` da raiz |
| `typescript-eslint` | 8.70.0 | `dependencies` de `packages/config` |
| `eslint-config-prettier` | 10.1.8 | `dependencies` de `packages/config` |
| `vitest` | 5.0.0 | `devDependencies` de cada pacote que tem teste |
| `vite` | 8.3.0 | `devDependencies` de `apps/web` |
| `@vitejs/plugin-react` | 6.1.1 | `devDependencies` de `apps/web` |
| `react` e `react-dom` | 19.3.0 | `dependencies` de `apps/web` |
| `@testing-library/react` | 16.3.0 | `devDependencies` de `apps/web` |
| `@types/node` | 26.5.1 | `devDependencies` de `apps/api`. Só ali: o código de `packages/shared` não usa nada do Node |
| `@types/react` e `@types/react-dom` | a versão que casa com React 19.3.0 | `devDependencies` de `apps/web` |
| `jsdom` | a mais nova estável | `devDependencies` de `apps/web` |

Duas armadilhas verificadas, que o executor não pode repetir:

- `typescript@7` **não serve**. O `typescript-eslint` 8.70.0 declara o par
  `typescript: ">=4.8.4 <6.1.0"` e lança erro duro, não aviso, se a versão estiver fora.
- `pnpm add -D @types/node` sem versão instala a linha 22, três majors atrás do Node 26.
  A versão tem que ser digitada.

### Node e pnpm

Corepack não existe mais no Node 26 e não deve ser mencionado em lugar nenhum. Quem
resolve a versão do pnpm é o campo `packageManager`, lido pelo próprio pnpm. O campo
`engines` entra como documentação, e o contrato assume que ele não trava nada.

```json
"packageManager": "pnpm@12.4.1",
"engines": { "node": ">=26.0.0" }
```

### Scripts

Os três pacotes de produto têm os quatro scripts. `packages/config` tem só `lint`, porque
ele não tem TypeScript nenhum: o único fonte dele é `eslint.base.js`, que é JavaScript e
mora na raiz do pacote. Dar `build` e `typecheck` a ele só produziria verde vazio.

`pnpm -r <script>` sai com código 0 quando alguns pacotes têm o script e outros não. Quem
protege contra pacote esquecido é o item 8 do DoD, que roda os comandos e confere quais
pacotes de fato apareceram na saída.

| Script | Onde | Comando |
|---|---|---|
| `build` | `api`, `web`, `shared` | `tsc -p tsconfig.build.json` em `api` e `shared`. Em `web`: `tsc -p tsconfig.json --noEmit && vite build` |
| `lint` | os quatro pacotes | `eslint .` |
| `typecheck` | `api`, `web`, `shared` | `tsc -p tsconfig.json --noEmit` |
| `test` | `api`, `web`, `shared` | `vitest run` |
| `format` e `format:check` | só a raiz | `prettier --write .` e `prettier --check .` |

A raiz reexporta `build`, `lint`, `typecheck` e `test` como `pnpm -r <script>`. A
reexportação é conveniência: `pnpm -r` não executa o script da raiz, então não há recursão.

### Ordem de verificação

`pnpm -r build` roda **antes** de `typecheck` e de `test`. Isto é consequência da decisão
do operador de a API emitir `dist`: `apps/api` e `apps/web` consomem `@casa/shared` pelo
`dist`, que não existe num clone limpo. Essa ordem entra no `README.md` e no DoD abaixo.

### `pnpm-workspace.yaml`

No pnpm 12 o `.npmrc` só vale para autenticação e registro. Toda outra configuração mora
aqui. A chave `allowBuilds` entra vazia desde já, porque `pnpm install` **sai com código 1**
na primeira dependência com script de instalação, e a sintaxe é mapa, não lista.

```yaml
packages:
  - "apps/*"
  - "packages/*"
allowBuilds: {}
```

### TypeScript

`tsconfig.base.json` na raiz, com `strict: true`, exigido pelo item B3 do DoD da fase.

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

Cada pacote tem **dois** arquivos. O `tsconfig.json` inclui os testes e não emite. O
`tsconfig.build.json` estende o primeiro, emite, e exclui os testes. Um arquivo só, que
exclua os testes, deixa erro de tipo dentro de teste passar despercebido.

```json
// <pacote>/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src", "noEmit": true },
  "include": ["src/**/*"]
}
```

```json
// <pacote>/tsconfig.build.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": { "noEmit": false },
  "exclude": ["src/**/*.test.ts", "src/**/*.test.tsx"]
}
```

`apps/api` acrescenta `"types": ["node"]` ao `tsconfig.json`. O TypeScript 6 não inclui
mais sozinho os pacotes de `node_modules/@types`, e sem esse campo `process` e o espaço de
nomes `NodeJS` não existem para o compilador.

```json
// apps/api/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "noEmit": true,
    "types": ["node"]
  },
  "include": ["src/**/*"]
}
```

`apps/web` é exceção, porque quem constrói é o Vite:

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

### ESLint e Prettier

`packages/config` exporta a configuração base. Cada pacote tem um `eslint.config.js` de
duas linhas e declara `"@casa/config": "workspace:*"` em `devDependencies`.

```js
// packages/config/eslint.base.js
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export const base = tseslint.config(
  { ignores: ['dist/**'] },
  ...tseslint.configs.recommended,
  prettier,
);
```

```js
// <pacote>/eslint.config.js
import { base } from '@casa/config/eslint';
export default base;
```

O `.prettierignore` é obrigatório, e os documentos ficam fora dele. O `pnpm-lock.yaml` é
gerado. Os arquivos `.md` são escritos à mão, em pt-BR, e o Prettier reescreve as tabelas
deles. O `format:check` governa código, não documento.

```
pnpm-lock.yaml
dist/
*.md
```

O `prettier.config.js` fixa o estilo. Aspas simples no código, aspas duplas no YAML, que é
o que os blocos deste contrato usam.

```js
export default {
  singleQuote: true,
  overrides: [{ files: ['*.yaml', '*.yml'], options: { singleQuote: false } }],
};
```

### Código dos pacotes

`packages/shared` exporta uma função pura e o teste dela. A assinatura é fixa:

```ts
// packages/shared/src/index.ts
export function formatCents(cents: number): string;
// formatCents(1099) === '10,99'   formatCents(5) === '0,05'   formatCents(-1099) === '-10,99'
```

O `package.json` de `packages/shared` aponta `exports` para o `dist`:

```json
"exports": { ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" } }
```

`apps/api` tem três arquivos em `src`. Import interno usa extensão `.js`, que é o que o
`tsc` com `module: nodenext` espera.

```ts
// src/config.ts
export type Config = { port: number; nodeEnv: string };
export function loadConfig(env: NodeJS.ProcessEnv): Config;
// port vem de PORT. Ausente ou vazio vira 3000, porque o .env.example vai sem valor e o
// README manda copiá-lo. Valor não numérico é erro lançado com mensagem em pt-BR.
// nodeEnv vem de NODE_ENV. Ausente ou vazio vira 'development'.

// src/index.ts
// chama loadConfig(process.env), imprime uma linha e sai com código 0:
// api ok port=3000 sample=10,99      onde sample é formatCents(1099)

// src/config.test.ts
// cobre: padrão, valor vindo do ambiente, e o erro de port inválido.
```

`apps/api` também declara `"start": "node dist/index.js"`. O `M1.5-compose-e-caddy` vai
consumir esse script e esse caminho.

`apps/web` tem `index.html`, `src/main.tsx` montando a raiz com `createRoot` e
`StrictMode`, `src/App.tsx` que chama `formatCents` de `@casa/shared`, e
`src/App.test.tsx` que renderiza `App` e afirma que o texto formatado aparece. O
`vite.config.ts` importa `defineConfig` de `vitest/config`, não de `vite`, senão a chave
`test` não passa na checagem de tipos.

```ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom' },
});
```

### Ambiente

Nesta unidade nada lê arquivo `.env`. A API lê `process.env`, e só. Carregar `.env` é
assunto do M2, e o Node 26 já traz `--env-file-if-exists` para isso, sem `dotenv`. O web lê
por `import.meta.env.VITE_*`, e o Vite lê `apps/web/.env`, nunca o `.env` da raiz.

Os dois `cp` do README existem para preparar o M2 e para provar que o exemplo é copiável.

| Arquivo | Variável | Comentário em pt-BR |
|---|---|---|
| `apps/api/.env.example` | `PORT` | porta HTTP que a API vai usar a partir do M2 |
| `apps/api/.env.example` | `NODE_ENV` | modo de execução |
| `apps/web/.env.example` | `VITE_API_URL` | endereço da API que o app consome |

Nenhum valor real entra nesses arquivos.

### `.gitignore` e `.mcp.json.example`

```
node_modules/
dist/
.env
.env.*
!.env.example
*.local
*.tsbuildinfo
.mcp.json
.claude/settings.local.json
```

O `.mcp.json` real fica fora do repositório, por decisão do operador de 2026-09-12. Entra
no lugar dele um `.mcp.json.example` **sem** `project_ref`, com `read_only=true` e sem a
feature `branching`:

```json
{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp?project_ref=SEU_PROJECT_REF&read_only=true&features=docs%2Cdatabase%2Cdebugging%2Cdevelopment"
    }
  }
}
```

Copiar esse arquivo e preencher o `project_ref` vira passo documentado no `README.md`,
como manda o item I2 do DoD da fase.

### `README.md`

Uma seção "Como rodar em cinco minutos" com esta sequência, nesta ordem, mais uma seção
com os comandos de verificação e outra com o passo do `.mcp.json`.

```bash
curl -fsSL https://get.pnpm.io/install.sh | sh -   # uma vez por máquina
source ~/.bashrc
git clone https://github.com/casa-automatica/casa-automatica.git
cd casa-automatica
pnpm install --frozen-lockfile
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
pnpm -r build && pnpm -r lint && pnpm -r typecheck && pnpm -r test && pnpm format:check
```

## Arquivos afetados

Lista fechada. O executor não escreve fora dela, com uma exceção: `pnpm-lock.yaml` é
gerado pelo gerenciador e entra versionado.

| Arquivo | Ação |
|---|---|
| `.gitignore` | criar |
| `.prettierignore` | criar |
| `.mcp.json.example` | criar |
| `README.md` | criar |
| `package.json` | criar |
| `pnpm-workspace.yaml` | criar |
| `pnpm-lock.yaml` | criar |
| `prettier.config.js` | criar |
| `tsconfig.base.json` | criar |
| `apps/api/package.json` | criar |
| `apps/api/tsconfig.json` | criar |
| `apps/api/tsconfig.build.json` | criar |
| `apps/api/eslint.config.js` | criar |
| `apps/api/.env.example` | criar |
| `apps/api/src/config.ts` | criar |
| `apps/api/src/config.test.ts` | criar |
| `apps/api/src/index.ts` | criar |
| `apps/web/package.json` | criar |
| `apps/web/tsconfig.json` | criar |
| `apps/web/eslint.config.js` | criar |
| `apps/web/vite.config.ts` | criar |
| `apps/web/index.html` | criar |
| `apps/web/.env.example` | criar |
| `apps/web/src/main.tsx` | criar |
| `apps/web/src/App.tsx` | criar |
| `apps/web/src/App.test.tsx` | criar |
| `packages/shared/package.json` | criar |
| `packages/shared/tsconfig.json` | criar |
| `packages/shared/tsconfig.build.json` | criar |
| `packages/shared/eslint.config.js` | criar |
| `packages/shared/src/index.ts` | criar |
| `packages/shared/src/index.test.ts` | criar |
| `packages/config/package.json` | criar |
| `packages/config/eslint.base.js` | criar |
| `packages/config/eslint.config.js` | criar |
| `docs/fase 1/unidades/M0.1-monorepo-base/execucao.md` | criar |

Nomes dos pacotes: `@casa/api`, `@casa/web`, `@casa/shared`, `@casa/config`. Todos com
`"private": true` e `"type": "module"`.

## Rodada 2

A rodada 1 criou todos os arquivos da lista acima, no commit `bf241ad` da branch
`unidade/M0.1-monorepo-base`, e parou porque o contrato tinha três defeitos. Os defeitos
foram corrigidos neste documento e estão na seção `## Alterações`.

A rodada 2 parte do que já está lá e muda exatamente isto:

| # | Arquivo | Mudança |
|---|---|---|
| 1 | `packages/config/package.json` | Fica só com o script `lint`. Saem `build`, `typecheck` e `test`. Saem as dependências `globals` e `vitest` |
| 2 | `packages/config/eslint.config.js` | Criar, com as duas linhas do modelo |
| 3 | `apps/api/tsconfig.json` | Acrescentar `"types": ["node"]` |
| 4 | `apps/api/package.json` | Nada muda. `@types/node` continua aqui |
| 5 | `packages/shared/package.json` | Remover `@types/node`, que não é usado |
| 6 | `.prettierignore` | Acrescentar `*.md` |
| 7 | `prettier.config.js` | Deixar igual ao bloco fixado neste contrato |
| 8 | `apps/api/src/config.ts` | `PORT` e `NODE_ENV` ausentes **ou vazios** caem no padrão. Só valor não numérico em `PORT` é erro |
| 9 | `apps/api/src/config.test.ts` | Cobrir o valor vazio, além do ausente, do válido e do inválido |
| 10 | `README.md` | Tirar a menção a `--env-file-if-exists`, porque nesta unidade nada lê arquivo `.env` |

Nenhum outro arquivo muda. O `pnpm-lock.yaml` acompanha a remoção das dependências.

## Fora deste contrato

- Fastify, rota, servidor HTTP, validação Zod, OpenAPI, autenticação. Tudo isso é o M2.
- Drizzle, migração, qualquer conexão com banco. Isso é o `M1.2` e o `M1.3`.
- Dockerfile, `docker-compose.yml`, Caddy, GitHub Actions, deploy. Isso é `M1.4`, `M1.5` e
  `M1.6`.
- Manifest, service worker, ícone, roteamento, i18n, qualquer tela de produto. Isso é o M8.
- `.mcp.json` real. Ele fica fora do repositório.
- Alterar `docs/`, `.claude/` ou qualquer documento de outra unidade.
- Manter `docs/fase 1/estado.md`. Quem faz isso é o condutor. O executor escreve o
  cabeçalho do próprio `execucao.md` e para por aí. O item A4 do DoD da fase não é dele.
- Reformatar documento existente com o Prettier.
- Trocar qualquer versão da tabela por uma mais nova, mesmo que exista.

## Definition of Done

O DoD geral em `docs/fase 1/dod.md` vale por cima deste e não é repetido aqui. Todo comando
roda a partir da raiz de um clone limpo, com `pnpm install --frozen-lockfile` feito antes.

| # | Item | Como verificar |
|---|---|---|
| 1 | Instalação reproduzível | `pnpm install --frozen-lockfile` sai com 0 |
| 2 | Build completo | `pnpm -r build` sai com 0. Existem `apps/api/dist/index.js`, `packages/shared/dist/index.js` e `apps/web/dist/index.html` |
| 3 | Lint | `pnpm -r lint` sai com 0 |
| 4 | Tipos | `pnpm -r typecheck` sai com 0 |
| 5 | Testes | `pnpm -r test` sai com 0, com um arquivo de teste passando em `apps/api`, um em `apps/web` e um em `packages/shared` |
| 6 | Formatação | `pnpm format:check` sai com 0 |
| 7 | A API roda | `node apps/api/dist/index.js` imprime `api ok port=3000 sample=10,99` e sai com 0. `pnpm --filter @casa/api start` faz o mesmo |
| 8 | Nenhum pacote fica de fora do `pnpm -r` | O bloco de verificação abaixo sai com 0. Ele roda os comandos e confere quais pacotes apareceram na saída, em vez de contar scripts no `package.json` |
| 9 | Erro de tipo dentro de teste reprova | Inserir `const x: number = 'texto';` em `packages/shared/src/index.test.ts`, rodar `pnpm --filter @casa/shared typecheck`, ver o erro `TS2322`, desfazer. A saída dos dois passos vai para `execucao.md` |
| 10 | Árvore limpa depois do build | `git status --porcelain` não imprime nada depois de `pnpm install` e `pnpm -r build` |
| 11 | Nada de segredo nem de configuração local versionada | `git ls-files` não lista `.env`, `.env.local` nem `.mcp.json`, e lista `apps/api/.env.example`, `apps/web/.env.example` e `.mcp.json.example` |
| 12 | O exemplo de MCP não carrega o projeto | `grep -c "omgheudterjqrjunpack" .mcp.json.example` devolve 0, e `grep -c "read_only=true" .mcp.json.example` devolve 1 |
| 13 | O web não lê variável sem prefixo | `grep -rn "import.meta.env" apps/web/src` só mostra nomes que começam com `VITE_` |
| 14 | O README funciona | Rodar a sequência do README num clone limpo e colar a saída real com os tempos em `execucao.md`. O clone é **do próprio repositório local e da branch da unidade**: `git clone -b unidade/M0.1-monorepo-base . "$(mktemp -d)/ca"`. Sem o `-b`, o clone traz a `main`, que não tem este código. O passo do `curl` que instala o pnpm não precisa ser repetido se o pnpm já estiver na máquina |

```bash
check() {                       # $1 = script, $2... = pacotes que têm que aparecer
  local script="$1"; shift
  local saida
  saida="$(pnpm -r "$script" 2>&1)" || { echo "$script falhou"; return 1; }
  for pacote in "$@"; do
    grep -q "$pacote $script" <<< "$saida" || { echo "$script nao rodou em $pacote"; return 1; }
  done
  echo "$script rodou em: $*"
}

check build apps/api apps/web packages/shared || exit 1
check lint apps/api apps/web packages/shared packages/config || exit 1
check typecheck apps/api apps/web packages/shared || exit 1
check test apps/api apps/web packages/shared || exit 1
```

## Riscos

| Risco | Sinal de que aconteceu | O que fazer |
|---|---|---|
| Alguma versão da tabela foi despublicada ou não existe | `pnpm install` falha com `ERR_PNPM_NO_MATCHING_VERSION` | Parar e reportar no `execucao.md`. Não trocar por outra versão sozinho |
| `pnpm@12` se comporta diferente do medido | `pnpm install` ou `pnpm -r` falha por motivo de ferramenta, não de código | Parar e reportar. A linha anterior é `pnpm@11.27.0`, mas nela a chave `allowBuilds` pode não existir, e isso muda o contrato |
| Alguma dependência traz script de instalação | `pnpm install` sai com `ERR_PNPM_IGNORED_BUILDS` | Registrar o pacote em `allowBuilds` no `pnpm-workspace.yaml`, com a sintaxe de mapa, e anotar em `execucao.md` |
| `pnpm -r typecheck` falha por falta de `dist` | `TS2307: Cannot find module '@casa/shared'` | Rodar `pnpm -r build` antes. Se o README não disser isso, o README está errado e tem que mudar |
| `@types/react` da versão errada | Erro de tipo em `main.tsx` ou `App.tsx` | Fixar a versão que casa com React 19.3.0 e anotar qual foi |
| O contrato está incompleto ou errado em algum ponto | Qualquer pergunta que este documento não responda | Parar, escrever o bloqueio em `execucao.md` e devolver ao condutor. Não decidir sozinho |

## Depende de

—

## Teste de auto-suficiência

Aplicado pelo condutor antes do GATE 1.

> Um executor que leu só este contrato, as regras do repositório e os arquivos nomeados
> acima consegue entregar sem fazer nenhuma pergunta?

Resposta: `sim` · Verificado em: 2026-09-12

Três pontos foram escritos aqui justamente porque a exploração descobriu que eles quebram
em silêncio: a ordem `build` antes de `typecheck`, o par de `tsconfig` por pacote, e os
quatro scripts em todos os pacotes.

## Perguntas ao operador

Nenhuma. As três perguntas da exploração foram decididas em 2026-09-12: a API emite `dist`,
o `.mcp.json` fica fora do repositório com um exemplo sem `project_ref`, e a documentação
pendente foi commitada antes desta unidade começar.

## Alterações

Só para contrato já aprovado que mudou. Cada linha exige novo GATE 1.

| Data | O que mudou | Motivo | Reaprovado em |
|---|---|---|---|
| 2026-09-12 | Item 14 do DoD passa a dizer que o clone limpo é do repositório local | A branch da unidade não está no GitHub, e o comando do DoD geral clona de lá. Sem isso o executor trava num item impossível | 2026-09-12, na mesma aprovação do operador |
| 2026-09-12 | `packages/config` fica só com o script `lint`, e ganha `eslint.config.js` na lista de arquivos | O contrato mandava o pacote rodar quatro scripts e não lhe dava os arquivos que os scripts invocam. Pior: o pacote não tem TypeScript, então `build` e `typecheck` nele só produziriam verde vazio. Reproduzido pelo condutor: `error TS5058: The specified path does not exist: 'tsconfig.build.json'` | 2026-09-12 |
| 2026-09-12 | `apps/api/tsconfig.json` ganha `"types": ["node"]`, e `@types/node` sai de `packages/shared` | O TypeScript 6 não inclui mais sozinho os pacotes de `node_modules/@types`. Reproduzido pelo condutor: `TS2503: Cannot find namespace 'NodeJS'` e `TS2591: Cannot find name 'process'` | 2026-09-12 |
| 2026-09-12 | `.prettierignore` ganha `*.md`, e o `prettier.config.js` passa a ter conteúdo fixado | `prettier --check .` reprovava 23 documentos escritos antes desta unidade, todos em `.claude/`, `docs/` e `CLAUDE.md`. O item 6 do DoD era inatingível. Reformatar documento aprovado está fora do contrato, e o Prettier reescreve tabela de markdown | 2026-09-12 |
| 2026-09-12 | Item 8 do DoD passa a executar os scripts em vez de contá-los no `package.json` | A verificação antiga deu verde num pacote que não construía. Ela contava scripts declarados, não scripts que rodam | 2026-09-12 |
| 2026-09-12 | Item 14 do DoD ganha `-b unidade/M0.1-monorepo-base` no clone | `git clone .` sozinho traz a `main`, que não tem o código da unidade | 2026-09-12 |
| 2026-09-12 | Sai `globals` da tabela de versões. Sai a menção a `--env-file-if-exists`. `loadConfig` passa a tratar valor vazio como padrão | `globals` entrou sem ser usado por ninguém. A API desta unidade não lê arquivo `.env`, e o `.env.example` vai sem valor, então `PORT=` vazio tem que cair no padrão em vez de virar erro | 2026-09-12 |
