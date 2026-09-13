> Unidade: `M0.1-monorepo-base` · Marco: `M0` · Trilha: `dividida`
> Estado: aprovada
> Condutor aprovou: 2026-09-12 · Operador aprovou: 2026-09-12
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
| `globals` | 16.5.0 | `dependencies` de `packages/config` |
| `vitest` | 5.0.0 | `devDependencies` de cada pacote que tem teste |
| `vite` | 8.3.0 | `devDependencies` de `apps/web` |
| `@vitejs/plugin-react` | 6.1.1 | `devDependencies` de `apps/web` |
| `react` e `react-dom` | 19.3.0 | `dependencies` de `apps/web` |
| `@testing-library/react` | 16.3.0 | `devDependencies` de `apps/web` |
| `@types/node` | 26.5.1 | `devDependencies` de `apps/api` e `packages/shared` |
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

Os quatro scripts ficam em **todos** os quatro pacotes, `packages/config` incluído. Isto
não é zelo: `pnpm -r <script>` sai com código 0 quando alguns pacotes têm o script e
outros não, então um pacote sem `test` deixa o DoD verde sem testar nada.

| Script | Onde | Comando |
|---|---|---|
| `build` | cada pacote | `tsc -p tsconfig.build.json` em `api`, `shared` e `config`. Em `web`: `tsc -p tsconfig.json --noEmit && vite build` |
| `lint` | cada pacote | `eslint .` |
| `typecheck` | cada pacote | `tsc -p tsconfig.json --noEmit` |
| `test` | cada pacote | `vitest run`. Em `packages/config`, que não tem teste, use `vitest run --passWithNoTests` |
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

O `.prettierignore` é obrigatório. Sem ele, `pnpm format:check` reprova por causa do
`pnpm-lock.yaml`, que é arquivo gerado.

```
pnpm-lock.yaml
dist/
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
// port vem de PORT, padrão 3000. nodeEnv vem de NODE_ENV, padrão 'development'.
// port inválido, como '' ou 'abc', é erro lançado com mensagem em pt-BR.

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

A API lê o `.env` com `--env-file-if-exists`, recurso do próprio Node 26. Nada de
`dotenv`. O web lê por `import.meta.env.VITE_*`, e o Vite lê `apps/web/.env`, nunca o
`.env` da raiz.

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
| `docs/fase 1/unidades/M0.1-monorepo-base/execucao.md` | criar |

Nomes dos pacotes: `@casa/api`, `@casa/web`, `@casa/shared`, `@casa/config`. Todos com
`"private": true` e `"type": "module"`.

## Fora deste contrato

- Fastify, rota, servidor HTTP, validação Zod, OpenAPI, autenticação. Tudo isso é o M2.
- Drizzle, migração, qualquer conexão com banco. Isso é o `M1.2` e o `M1.3`.
- Dockerfile, `docker-compose.yml`, Caddy, GitHub Actions, deploy. Isso é `M1.4`, `M1.5` e
  `M1.6`.
- Manifest, service worker, ícone, roteamento, i18n, qualquer tela de produto. Isso é o M8.
- `.mcp.json` real. Ele fica fora do repositório.
- Alterar `docs/`, `.claude/` ou qualquer documento de outra unidade.
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
| 8 | Nenhum pacote fica de fora do `pnpm -r` | O bloco de verificação abaixo sai com 0 |
| 9 | Erro de tipo dentro de teste reprova | Inserir `const x: number = 'texto';` em `packages/shared/src/index.test.ts`, rodar `pnpm --filter @casa/shared typecheck`, ver o erro `TS2322`, desfazer. A saída dos dois passos vai para `execucao.md` |
| 10 | Árvore limpa depois do build | `git status --porcelain` não imprime nada depois de `pnpm install` e `pnpm -r build` |
| 11 | Nada de segredo nem de configuração local versionada | `git ls-files` não lista `.env`, `.env.local` nem `.mcp.json`, e lista `apps/api/.env.example`, `apps/web/.env.example` e `.mcp.json.example` |
| 12 | O exemplo de MCP não carrega o projeto | `grep -c "omgheudterjqrjunpack" .mcp.json.example` devolve 0, e `grep -c "read_only=true" .mcp.json.example` devolve 1 |
| 13 | O web não lê variável sem prefixo | `grep -rn "import.meta.env" apps/web/src` só mostra nomes que começam com `VITE_` |
| 14 | O README funciona | Rodar a sequência do README num clone limpo e colar a saída real com os tempos em `execucao.md`. O clone é **do próprio repositório local**, com `git clone . "$(mktemp -d)/ca"`, porque a branch desta unidade não está no GitHub. O passo do `curl` que instala o pnpm não precisa ser repetido se o pnpm já estiver na máquina |

```bash
for p in apps/api apps/web packages/shared packages/config; do
  node -e '
    const fs = require("fs");
    const p = process.argv[1];
    const s = JSON.parse(fs.readFileSync(p + "/package.json", "utf8")).scripts || {};
    for (const k of ["build", "lint", "typecheck", "test"]) {
      if (!s[k]) { console.error(p + " sem script " + k); process.exit(1); }
    }
  ' "$p" || exit 1
done
echo "os quatro pacotes têm os quatro scripts"
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
