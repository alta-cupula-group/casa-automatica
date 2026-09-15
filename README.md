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
curl -fsSL https://deb.nodesource.com/setup_26.x | sudo -E bash -   # uma vez por máquina
sudo apt-get install -y nodejs                                     # uma vez por máquina
curl -fsSL https://get.pnpm.io/install.sh | sh -                   # uma vez por máquina
source ~/.bashrc
git clone https://github.com/alta-cupula-group/casa-automatica.git
cd casa-automatica
pnpm install --frozen-lockfile
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
pnpm -r build && pnpm -r lint && pnpm -r typecheck && pnpm -r test && pnpm format:check
```

As duas primeiras linhas instalam o Node 26 no Debian e no Ubuntu. Em outro sistema, instale o
Node 26 pelo pacote oficial de https://nodejs.org e siga da terceira linha em diante.

O `pnpm install` também ativa o hook de pré-commit, descrito na seção "CI, hook e entrega".

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

## CI, hook e entrega

O GitHub Actions roda o workflow `CI` a cada push e a cada pull request com alvo na `main`. O
job se chama `verificar`, e o check que aparece no pull request se chama `CI / verificar`. Ele
roda os cinco comandos da tabela acima, na mesma ordem.

Pull request que altera só arquivos dentro de `docs/` ou só arquivos `.md` fecha verde sem
rodar os cinco comandos. Qualquer outro caminho roda tudo.

A `main` não aceita push direto nem force push. Código entra por pull request com o check
`CI / verificar` verde.

O `pnpm install` ativa o husky num clone novo, sem passo manual. O hook de pré-commit roda:

```bash
pnpm -r lint && pnpm -r typecheck
```

Commit com erro de lint ou de tipo é recusado na sua máquina. `git commit --no-verify` pula o
hook, porque isso é comportamento do git. Quem garante a verificação é a CI, que roda os
mesmos comandos no pull request e barra o merge.

Entrega de uma mudança, em um comando por linha:

```bash
git switch -c <tipo>/<assunto>
git push -u origin HEAD
gh pr create --fill && gh pr merge --squash --auto
```

O merge automático entra sozinho assim que o check fica verde.

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
