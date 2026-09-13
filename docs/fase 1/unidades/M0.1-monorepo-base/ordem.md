> Unidade: `M0.1-monorepo-base` · Marco: `M0` · Trilha: `dividida`
> Estado: em exploração
> Emitida por: condutor · Data: 2026-09-12

# Ordem de exploração — `M0.1-monorepo-base`

## Contexto

O repositório hoje só tem documentos. Não existe nenhum arquivo de código, nenhum
`package.json` e nenhuma dependência. O `docs/scope-brief.md` fixa a stack: monorepo
com pnpm workspaces, `apps/api` em Node com Fastify e Zod, `apps/web` em React com Vite,
e `packages/*` para tipos e schemas compartilhados. O marco M0 do `docs/fase 1/roadmap.md`
pede a fundação desse monorepo. Esta é a primeira unidade da fase, e todas as outras
constroem em cima dela.

O repositório `casa-automatica/casa-automatica` é público no GitHub. A máquina do
operador tem Node 26.8.2 e Docker 29.7.2, e não tem `pnpm` instalado.

## O que esta unidade deve entregar

Um clone limpo instala, constrói, passa lint, checagem de tipos, formatação e um teste de
fumaça por app, guiado por um README que leva alguém do zero até rodar em cinco minutos.

## Trilha escolhida

`dividida`. A unidade é fundacional e define a interface que todas as outras consomem:
os nomes dos scripts, a árvore de pastas e a versão das ferramentas. O DoD geral cobra
`pnpm -r lint`, `pnpm -r typecheck`, `pnpm -r test`, `pnpm format:check` e `pnpm -r build`,
e o CI do `M1.4-ci-verificacao` vai rodar esses mesmos comandos.

A auto-suficiência do contrato é crítica aqui porque o executor vai criar a árvore inteira
do zero. Ele não tem convenção de repositório para imitar, já que ainda não existe código.
Tudo que ele precisa decidir tem que estar escrito no contrato: versão fixada, nome de
cada arquivo, conteúdo essencial de cada configuração.

## Perguntas a responder

1. **P1** — Qual versão de Node e qual versão de pnpm o repositório fixa, e por qual
   mecanismo? Compare `packageManager` com Corepack, `engines` e `.nvmrc`. Diga o que
   acontece numa máquina com Node 26.8.2 e sem `pnpm` instalado, passo a passo, e cite a
   documentação oficial com URL.
2. **P2** — Qual é a árvore mínima de arquivos que faz `pnpm install --frozen-lockfile`
   e `pnpm -r build` passarem num clone limpo? Liste arquivo por arquivo, com o conteúdo
   essencial de cada `package.json`, do `pnpm-workspace.yaml` e de cada `tsconfig`.
3. **P3** — Como os scripts `build`, `lint`, `typecheck`, `test` e `format:check` se
   dividem entre a raiz e cada pacote? Mostre o que `pnpm -r <script>` faz quando um
   pacote do workspace não tem aquele script: falha ou ignora? Evidência de comando.
4. **P4** — ESLint e Prettier compartilhados: qual formato de configuração, e como um
   pacote de configuração dentro de `packages/` é consumido por `apps/api` e `apps/web`?
   Diga as versões que funcionam juntas e os conflitos conhecidos entre elas.
5. **P5** — Qual runner de teste cobre os três casos com um comando único na raiz:
   `apps/api` em Node, `apps/web` com DOM, e `packages/shared`? O item C4 do DoD proíbe
   rede externa nos testes. Compare pelo menos duas opções, com custo de cada uma.
6. **P6** — O que `apps/api` contém neste marco, já que o servidor HTTP com Fastify só
   aparece no M2? Descreva o mínimo que permite um `build` e um teste de fumaça. Diga
   também o que o `M1.5-compose-e-caddy` vai precisar encontrar aqui para ter um container
   de API que sobe. **Esta é decisão do operador. Traga opções com custo, não escolha.**
7. **P7** — O que `apps/web` contém neste marco, dado que o PWA é o M8? Diga o que a
   escolha de hoje já fixa para o M8.
8. **P8** — `packages/shared`: qual o mínimo que justifica o pacote existir já no M0, e
   como os apps o consomem? Compare consumir o código-fonte direto com consumir um build,
   e mostre o efeito na ordem de build do `pnpm -r build`.
9. **P9** — Quais variáveis de ambiente já existem neste marco, e como cada app lê a
   configuração sem antecipar o M2? Os itens E2, E3 e E4 do DoD dizem o que o
   `.env.example` e o `.gitignore` precisam ter. Verifique também se algo que hoje está no
   repositório não deveria estar versionado.
10. **P10** — README de cinco minutos: qual é a sequência de comandos, e quanto tempo ela
    leva de verdade num clone limpo? Meça e mostre a saída.

## Limites

- Não altere nada no repositório além de `docs/fase 1/unidades/M0.1-monorepo-base/exploracao.md`.
- Não instale dependência dentro do repositório. Para experimentar, use um diretório
  temporário fora dele e mostre a saída dos comandos.
- Não antecipe o M2: nada de Fastify com rotas, autenticação, Zod de API ou OpenAPI.
- Não antecipe o M8: nada de manifest, service worker ou tela.
- Não trate CI, Docker, Caddy nem deploy. Isso é `M1.4`, `M1.5` e `M1.6`.
- Não escolha o conteúdo do `apps/api` deste marco. A pergunta P6 é do operador.

## Fontes a consultar

- `docs/scope-brief.md`, seção 4, para a stack já decidida.
- `docs/fase 1/roadmap.md`, marco M0, para a entrega e o critério de pronto.
- `docs/fase 1/dod.md`, seções B, C, E, F e I, que valem a partir desta unidade.
- Documentação do pnpm sobre workspaces, `packageManager` e Corepack.
- Documentação do Vite, do ESLint em configuração achatada e do typescript-eslint.
- `node -v`, `git ls-files`, e experimentos num diretório temporário.

## Branch

`unidade/M0.1-monorepo-base`. A execução cria a árvore inteira do repositório e é longa
o bastante para atrapalhar qualquer outra coisa na `main`.

## Depende de

—
