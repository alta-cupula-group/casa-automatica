> Unidade: `M1.5-compose-e-caddy` · Marco: `M1 · CI` · Trilha: `dividida`
> Estado: em exploração
> Emitida por: condutor · Data: 2026-09-15

# Ordem de exploração — `M1.5-compose-e-caddy`

## Contexto

O monorepo existe desde `M0.1-monorepo-base`. O `apps/api` constrói para `dist/` e sobe
com `node dist/index.js`, lendo `PORT` do ambiente. O `apps/web` constrói com Vite para
arquivos estáticos. Não existe Dockerfile, Caddyfile nem `docker-compose.yml`.

O `docs/scope-brief.md`, seção 4, fixa a hospedagem: servidor em casa com Docker
Compose, Caddy como proxy reverso com TLS, Cloudflare Tunnel para expor o domínio, API e
frontend no mesmo domínio. O servidor é um notebook antigo, e o brief proíbe qualquer
coisa que exija GPU ou muita memória. O item J1 do `docs/fase 1/dod.md` limita o compose
a três serviços: API, web estático e Caddy.

Esta exploração pode acontecer agora. A execução espera `M1.4-ci-verificacao` fechar,
por decisão do operador em 2026-09-15: código novo só nasce com CI e proteção da `main`.

## O que esta unidade deve entregar

`docker compose up` numa máquina com Docker sobe API, web estático e Caddy, e o web
responde em `localhost` com a API atrás do mesmo domínio.

## Trilha escolhida

`dividida`. É a base do deploy, e `M1.6-deploy-na-casa` consome o que ela define:
nomes de serviço, de imagem e de arquivo. A exploração mede a máquina real, e isso é
material que não entra no contrato.

## Perguntas a responder

1. **P1** — Quanto o servidor tem de CPU, memória, disco e qual versão de Docker e de
   Compose está instalada? Rode os comandos no próprio notebook e mostre a saída. Diga o
   que sobra para a API e o Caddy depois do sistema.
2. **P2** — Como se constrói uma imagem só do `apps/api` num monorepo pnpm, levando
   `packages/shared` e nada de `apps/web`? Compare `pnpm deploy` com outras formas da
   documentação oficial do pnpm. Meça o tamanho da imagem e o tempo de build de cada
   opção viável, num diretório temporário fora do repositório.
3. **P3** — Como o web estático é servido dentro do limite de três serviços do J1: o
   próprio Caddy servindo os arquivos do build, ou um container separado? Diga o custo
   de cada forma e o que ela exige do Caddyfile.
4. **P4** — Como API e web dividem o mesmo domínio no Caddy: prefixo de caminho para a
   API, ou subdomínio? Isso fixa o caminho de toda rota do M2 em diante. **Decisão do
   operador. Traga as opções com consequência para o M2 e para o Cloudflare Tunnel.**
5. **P5** — O que muda no Caddy entre servir `localhost` nesta unidade e ficar atrás do
   Cloudflare Tunnel em `M1.6`? Diga quem termina o TLS em cada caso e o que precisa
   ficar preparado aqui para `M1.6` não reescrever o Caddyfile.
6. **P6** — O que o compose precisa ter para o notebook: política de reinício, limite de
   memória, healthcheck, e como as variáveis de `apps/api/.env.example` chegam ao
   container sem entrar na imagem. Cite os itens E1 a E3 do `docs/fase 1/dod.md`.
7. **P7** — Quais itens do critério de pronto dão para automatizar em teste sem rede,
   como manda o item C4 do DoD, e quais ficam como verificação manual do item C3? Diga
   como se testa que o compose sobe e responde, e se isso cabe no CI de `M1.4`.
8. **P8** — O que `M1.6-deploy-na-casa` vai precisar daqui: onde o compose fica, como a
   imagem chega ao servidor, o que o deploy por SSH executa. Diga só o que não pode ser
   fechado aqui. Não desenhe o deploy.

## Limites

- Não altere nada além de `docs/fase 1/unidades/M1.5-compose-e-caddy/exploracao.md`.
- Não crie Dockerfile, Caddyfile nem compose no repositório. Experimentos ficam num
  diretório temporário, com a saída dos comandos no relatório.
- Não trate Cloudflare Tunnel, SSH ou deploy além do que P5 e P8 pedem. Isso é `M1.6`.
- Não trate CI. Isso é `M1.4`.
- Não decida P4. É do operador.

## Fontes a consultar

- `docs/scope-brief.md`, seção 4, hospedagem e recursos limitados.
- `docs/fase 1/roadmap.md`, marco M1 · CI, e a tabela de riscos.
- `docs/fase 1/dod.md`, seções C, E e J.
- `apps/api/package.json`, `apps/api/.env.example`, `apps/web/vite.config.ts`, `README.md`.
- Documentação oficial do pnpm sobre `deploy` e Docker, do Caddy e do Docker Compose.
- Os comandos do próprio notebook: `nproc`, `free -h`, `df -h`, `docker version`,
  `docker compose version`.

## Branch

`unidade/M1.5-compose-e-caddy` para a execução. A exploração entra direto na `main`,
porque é só documento. Se a `main` já estiver protegida quando o relatório ficar pronto,
ele entra por PR.

## Depende de

`M0.1-monorepo-base`, fechada, para explorar. `M1.4-ci-verificacao` fechada para
executar, por decisão do operador em 2026-09-15.
