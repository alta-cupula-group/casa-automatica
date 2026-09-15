# Casa Automática

Software da casa de três moradores. Este repositório é um monorepo pnpm com três pacotes de
produto e um de configuração.

| Pacote         | Caminho           | O que é                                  |
| -------------- | ----------------- | ---------------------------------------- |
| `@casa/api`    | `apps/api`        | processo Node da API                     |
| `@casa/web`    | `apps/web`        | aplicação React servida pelo Vite        |
| `@casa/shared` | `packages/shared` | código compartilhado entre `api` e `web` |
| `@casa/config` | `packages/config` | configuração de ESLint compartilhada     |

O processo de trabalho está em `AGENTS.md` e em `docs/processo/`, e vale para qualquer ferramenta de IA. O escopo do produto está
em `docs/scope-brief.md`.

## Requisitos

| Ferramenta | Versão          |
| ---------- | --------------- |
| Node       | 26 ou mais nova |
| pnpm       | 12.4.1          |

O Corepack não existe mais no Node 26. Quem resolve a versão do pnpm é o campo
`packageManager` do `package.json` da raiz.

## Como rodar em cinco minutos

```bash
curl -fsSL https://get.pnpm.io/install.sh | sh -   # uma vez por máquina
source ~/.bashrc
git clone https://github.com/alta-cupula-group/casa-automatica.git
cd casa-automatica
pnpm install --frozen-lockfile
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
pnpm -r build && pnpm -r lint && pnpm -r typecheck && pnpm -r test && pnpm format:check
```

## Comandos de verificação

`pnpm -r build` roda antes de `pnpm -r typecheck` e de `pnpm -r test`. A razão é o
`@casa/shared`: `apps/api` e `apps/web` o consomem pelo `dist`, que não existe num clone
recém-instalado.

| Comando             | O que faz                                         |
| ------------------- | ------------------------------------------------- |
| `pnpm -r build`     | compila todos os pacotes                          |
| `pnpm -r lint`      | roda o ESLint em todos os pacotes                 |
| `pnpm -r typecheck` | roda o TypeScript sem emitir, incluindo os testes |
| `pnpm -r test`      | roda o Vitest em todos os pacotes                 |
| `pnpm format:check` | confere a formatação com o Prettier               |
| `pnpm format`       | aplica a formatação com o Prettier                |

Para rodar a API depois do build:

```bash
pnpm --filter @casa/api start
```

A saída esperada é uma linha e código de saída 0:

```
api ok port=3000 sample=10,99
```

## Variáveis de ambiente

Cada app tem o seu `.env.example`. O arquivo `.env` real nunca é versionado.

| Arquivo         | Variável       | O que é                                      |
| --------------- | -------------- | -------------------------------------------- |
| `apps/api/.env` | `PORT`         | porta HTTP que a API vai usar a partir do M2 |
| `apps/api/.env` | `NODE_ENV`     | modo de execução                             |
| `apps/web/.env` | `VITE_API_URL` | endereço da API que o app consome            |

Nesta etapa nada lê arquivo `.env`. A API lê `process.env` e nada mais. Os dois `cp` da
seção anterior preparam os arquivos para as etapas seguintes.

O Vite lê `apps/web/.env`, nunca o `.env` da raiz. O `apps/web` só enxerga variáveis com
prefixo `VITE_`, e nenhuma delas guarda segredo.

## Passo manual: o `.mcp.json`

O `.mcp.json` real fica fora do repositório. Quem precisar do servidor MCP do Supabase
copia o exemplo e preenche o identificador do projeto:

```bash
cp .mcp.json.example .mcp.json
```

Depois troque `SEU_PROJECT_REF` pelo identificador do projeto no Supabase. O exemplo já vem
com `read_only=true` e sem a feature `branching`.
