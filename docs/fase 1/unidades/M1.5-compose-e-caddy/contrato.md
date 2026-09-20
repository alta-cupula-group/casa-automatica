> Unidade: `M1.5-compose-e-caddy` · Marco: `M1 · CI` · Trilha: `dividida`
> Estado: aprovada
> Condutor aprovou: 2026-09-20 · Operador aprovou: 2026-09-20
> Base: `ordem.md`, `exploracao.md`, `docs/scope-brief.md`, `docs/fase 1/dod.md`

# Contrato — `M1.5-compose-e-caddy`

Este documento é auto-suficiente. Quem executa não leu a exploração e não vai lê-la.
Tudo que a execução precisa está aqui ou nos arquivos nomeados aqui.

## O que será construído

`docker compose up` na raiz do repositório sobe dois serviços, `api` e `caddy`. O Caddy
serve os arquivos estáticos do build de `apps/web` diretamente (sem container próprio
para o web) e faz `reverse_proxy` para `api` num subdomínio. Os dois respondem sob o
mesmo domínio, hoje `localhost` por padrão, e sob `casaautomatica.app` quando a variável
`DOMAIN` for definida, sem qualquer edição do Caddyfile. `apps/api` passa a ficar de pé
como processo de longa duração: ele ganha um servidor HTTP mínimo que responde `200` em
qualquer rota, só para existir algo para o Caddy rotear até o M2 trazer a API real.

## Interfaces e formatos

**Domínio, por variável de ambiente, não por texto fixo no Caddyfile:**
Sintaxe oficial do Caddyfile, com valor padrão: `{$DOMAIN:localhost}`. Sem `DOMAIN`
definida, o site responde em `localhost` e `api.localhost`. Com `DOMAIN=casaautomatica.app`
no ambiente, responde em `casaautomatica.app` e `api.casaautomatica.app`, decisão do
operador registrada em `exploracao.md`, P4.

**`infra/caddy/Caddyfile`** (novo arquivo, `/etc/caddy/Caddyfile` dentro da imagem):
```caddyfile
{
	auto_https off
}

http://{$DOMAIN:localhost} {
	root * /srv/web
	file_server
}

http://api.{$DOMAIN:localhost} {
	reverse_proxy api:{$API_PORT:3000}
}
```
`auto_https off` porque o Caddy nunca é alcançável direto da internet nesta unidade nem
depois do Cloudflare Tunnel (`M1.6`); sem isso, ele tentaria emitir certificado ACME
público e falharia com log de erro em loop (`exploracao.md`, P5). Só `http://`: quem
termina TLS público é a Cloudflare, a partir de `M1.6` — aqui não existe TLS nenhum.

**`infra/caddy/Dockerfile`** (novo arquivo), dois estágios: builda `apps/web` no
monorepo completo e copia só o `dist/` resultante para dentro da imagem `caddy`, junto do
Caddyfile acima. `apps/web/vite.config.ts` não sobrescreve `build.outDir`, então o build
do Vite sai em `apps/web/dist` (confirmado lendo o arquivo).

**`apps/api/Dockerfile`** (novo arquivo), dois estágios: builda o monorepo completo e
roda `pnpm deploy --filter=@casa/api --prod <destino>` para isolar `@casa/api` e
`@casa/shared` sem `apps/web`, testado em `exploracao.md` P2. Base de build:
`ghcr.io/pnpm/pnpm:12` com `pnpm runtime set node 26 -g`.

**Stub HTTP de `apps/api/src/index.ts`** (arquivo alterado), sem dependência nova —
só o módulo nativo `node:http`:
```ts
import { createServer } from 'node:http';
import { formatCents } from '@casa/shared';
import { loadConfig } from './config.js';

const config = loadConfig(process.env);

const server = createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('ok');
});

server.listen(config.port, () => {
  console.log(`api ok port=${config.port} sample=${formatCents(1099)}`);
});
```
Isso muda o comportamento documentado no `README.md`: hoje `pnpm --filter @casa/api start`
imprime uma linha e sai com código `0`; depois desta unidade, ele imprime a mesma linha e
fica escutando até ser interrompido. O `README.md` precisa refletir isso — é consequência
direta da decisão do operador (`exploracao.md`, pergunta ao operador P1, opção B), não uma
ampliação de escopo por conta própria.

**`docker-compose.yml`** (novo arquivo, raiz):
```yaml
services:
  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    env_file:
      - path: .env
        required: false
    mem_limit: 512m
    restart: unless-stopped
    healthcheck:
      test:
        [
          "CMD",
          "node",
          "-e",
          "require('node:http').get('http://localhost:' + (process.env.PORT || 3000) + '/', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))",
        ]
      interval: 10s
      timeout: 3s
      retries: 3
      start_period: 5s

  caddy:
    build:
      context: .
      dockerfile: infra/caddy/Dockerfile
    environment:
      DOMAIN: ${DOMAIN:-localhost}
      API_PORT: ${PORT:-3000}
    ports:
      - "80:80"
    mem_limit: 256m
    restart: unless-stopped
    depends_on:
      api:
        condition: service_healthy
    healthcheck:
      test:
        [
          "CMD-SHELL",
          'wget --no-verbose --tries=1 --spider --header="Host: ${DOMAIN:-localhost}" http://localhost/ || exit 1',
        ]
      interval: 10s
      timeout: 3s
      retries: 3
      start_period: 5s
```
O teste manda o cabeçalho `Host` certo porque o Caddy roteia por `Host`, não por IP. Com
`CMD` simples e `wget --spider http://localhost/`, o `Host` da requisição seria
`localhost` sempre — bate com o bloco de site só enquanto `DOMAIN` for `localhost`. Com
`DOMAIN=casaautomatica.app`, esse `Host` fixo não bate com nenhum bloco, o Caddy devolve
404, e o serviço nunca fica `healthy`. `${DOMAIN:-localhost}`, com o valor padrão, porque
quem interpola essa variável dentro do texto do `test` é o próprio Compose, ao resolver o
`docker-compose.yml` — não o shell dentro do container — e o Compose não herda o valor do
bloco `environment:` de baixo. Sem o `:-localhost` aqui, rodar `docker compose up` sem
`DOMAIN` no ambiente (o caso padrão, testado pelo item 3 do DoD) resolveria a variável
para string vazia, e o `wget` mandaria `Host: ` vazio — quebrando exatamente do jeito que
esta correção deveria consertar.
`env_file` com `required: false` porque o `.env` real não é versionado (E2); sem essa
flag, `docker compose up` falha em qualquer máquina limpa, inclusive no CI. A imagem
`wget` do healthcheck do `caddy` existe porque a imagem oficial `caddy` é baseada em
Alpine e traz `wget` via busybox, mas não traz `curl` — confirmado na documentação e no
Dockerfile oficial da imagem.

**`.dockerignore`** (novo arquivo, raiz): exclui `node_modules/`, `dist/`, `.git/`,
`.env` e `.env.*`, para nenhum dos dois builds enviar isso ao contexto do Docker.

**`.env.example`** (novo arquivo, raiz): documenta `DOMAIN`, com comentário em pt-BR,
igual ao padrão que `apps/api/.env.example` já usa.

Decisão de produto que sustenta o domínio: `docs/scope-brief.md`, seção 4. Decisão de
arquitetura de hospedagem (Caddy + Cloudflare Tunnel): mesma seção.

## Dependências novas

Nenhuma dependência nova de pacote pnpm — o stub usa só `node:http`, módulo nativo. As
três linhas abaixo são imagens-base de container, não pacotes do workspace:

| Imagem | Versão | De onde saiu a versão |
|---|---|---|
| `ghcr.io/pnpm/pnpm` | `12` | `packageManager: "pnpm@12.4.1"` do `package.json` raiz; já usada e testada nesta VM em `exploracao.md` P2 |
| `caddy` | `2` | Docker Hub, tag `2` rastreia a série estável (2.11.4 no momento da exploração, 2026-09-19) |
| `node`, via `pnpm runtime set node 26 -g` dentro da imagem `pnpm` | `26` | `engines.node: ">=26.0.0"` do `package.json` raiz |

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `docker-compose.yml` | criar |
| `.dockerignore` | criar |
| `.env.example` | criar |
| `apps/api/Dockerfile` | criar |
| `apps/api/src/index.ts` | alterar |
| `apps/api/src/index.test.ts` | criar |
| `infra/caddy/Dockerfile` | criar |
| `infra/caddy/Caddyfile` | criar |
| `.github/workflows/ci.yml` | alterar |
| `README.md` | alterar |

## Fora deste contrato

- Cloudflare Tunnel, chave SSH de deploy, e qualquer coisa que rode fora desta VM.
  Isso é `M1.6-deploy-na-casa`.
- Servidor real de `apps/api`: rotas, framework, banco. O stub só existe para o Caddy ter
  o que rotear; o M2 substitui.
- Container próprio para `apps/web` (Opção B de `exploracao.md` P3). Esta unidade usa a
  Opção A porque a VM tem só ~3,4 GiB livres (P1) e um container a menos pesa mais que a
  conveniência de atualizar o web sem tocar na imagem do Caddy. Decisão técnica local do
  condutor, dentro do que a regra 04 permite decidir sem o operador.
- Qualquer certificado TLS público, mesmo autoassinado além do que o Caddy gera sozinho
  para `localhost`. Quem cuida de TLS público é a Cloudflare, a partir de `M1.6`.
- Teste de carga ou de memória sob uso real prolongado. O `mem_limit` desta unidade é uma
  estimativa a partir de P1; confirmar na VM real fica para depois do deploy.

## Definition of Done

| # | Item | Como verificar | Teste |
|---|---|---|---|
| 1 | `docker-compose.yml` só declara os serviços `api` e `caddy`, nada além disso (J1) | `docker compose config --services` devolve exatamente `api` e `caddy`, em qualquer ordem | passo `smoke-compose` do `ci.yml` |
| 2 | O stub HTTP de `apps/api` responde `200` em qualquer rota, na porta de `PORT` | `pnpm --filter @casa/api test` | `apps/api/src/index.test.ts` |
| 3 | `docker compose up --wait` sobe `api` e `caddy` a `healthy`, sem `DOMAIN` definida, sem acessar rede externa (C4) | comando retorna código `0` dentro do `--wait-timeout` | passo `smoke-compose` do `ci.yml` |
| 4 | O web estático responde na raiz do domínio padrão | `curl -f http://localhost/` devolve o `index.html` do build de `apps/web` | passo `smoke-compose` do `ci.yml` |
| 5 | A API responde no subdomínio do mesmo domínio | `curl -f -H "Host: api.localhost" http://localhost/` devolve `200` e corpo `ok` | passo `smoke-compose` do `ci.yml` |
| 6 | Trocar o domínio não exige editar `Caddyfile` nem `docker-compose.yml` | Rodar de novo com `DOMAIN=casaautomatica.app` no ambiente e repetir os dois `curl` acima trocando `Host` | verificação manual — evidência: saída dos dois `curl`, antes e depois da troca |
| 7 | O orçamento de memória dos dois serviços cabe no que P1 mediu livre na VM | `docker compose config` mostra `mem_limit` em `api` e `caddy`, somando no máximo `1g` | passo `smoke-compose` do `ci.yml` (grep na saída) |
| 8 | Nenhum segredo do `.env` real entra na imagem (E1, E2) | `grep` em `apps/api/Dockerfile` e `infra/caddy/Dockerfile` não acha `COPY .env` nem `ARG` de variável de `.env` | passo `smoke-compose` do `ci.yml` |
| 9 | `docker compose down` não deixa nada residual | `docker compose down` seguido de `docker compose ps -a` vazio para o projeto | passo `smoke-compose` do `ci.yml` |

O DoD geral em `docs/fase 1/dod.md` vale por cima deste e não precisa ser repetido aqui.

## Riscos

| Risco | Sinal de que aconteceu | O que fazer |
|---|---|---|
| O runner do GitHub Actions tem CPU e memória diferentes da VM real (2 vCPU, 4 GiB) | CI passa, mas na VM real (depois de `M1.6`) o `docker compose up` trava ou é morto por falta de memória | Não reprovar esta unidade por isso; registrar para `M1.6` revisar os `mem_limit` na VM real |
| `pnpm install` dentro do build da imagem depende do registro do pnpm, que é rede externa ao **build**, não ao teste (C4 fala de teste) | Build falha por timeout ou erro de rede, sem relação com o código | Repetir o build; não é falha de comportamento |
| Alguém remove `auto_https off` ou o prefixo `http://` do endereço do site | Log do `caddy` mostra tentativa de ACME e erro de certificado em loop | Conferir a diretiva global e o esquema do endereço no `Caddyfile` |
| O build de `apps/web` falha silenciosamente e o estágio final copia uma pasta vazia | `curl http://localhost/` devolve `404` ou corpo vazio em vez do `index.html` | Conferir a saída do estágio de build no `infra/caddy/Dockerfile` antes do `COPY --from=build` |

## Depende de

`M0.1-monorepo-base`, fechada. `M1.4-ci-verificacao`, fechada.

## Teste de auto-suficiência

Aplicado pelo condutor antes do GATE 1.

> Um executor que leu só este contrato, as regras do repositório e os arquivos nomeados
> acima consegue entregar sem fazer nenhuma pergunta?

Resposta: `sim` · Verificado em: `2026-09-20`

## Perguntas ao operador

Nenhuma. As duas decisões que exigiam o operador já estão registradas em
`exploracao.md`: domínio (`casaautomatica.app`, P4) e o stub HTTP de `apps/api`
(pergunta ao operador P1, opção B). A escolha entre as opções de P3 (Caddy servindo o
web direto, ou container próprio) foi proposta pelo condutor como Opção A e confirmada
pelo operador em 2026-09-20, nesta mesma conversa de aprovação.

## Alterações

Só para contrato já aprovado que mudou. Cada linha exige novo GATE 1.

| Data | O que mudou | Motivo | Reaprovado em |
|---|---|---|---|
| 2026-09-20 | Healthcheck do `caddy` passa de `CMD wget --spider http://localhost/` para `CMD-SHELL` com `--header="Host: $DOMAIN"` | Achado do executor na rodada 1: o teste antigo fixa `Host: localhost`, que não bate com o bloco de site quando `DOMAIN` é outro valor, e o serviço nunca fica `healthy` fora do domínio padrão | 2026-09-20 |
| 2026-09-20 | O `$DOMAIN` da linha acima ganha valor padrão: `${DOMAIN:-localhost}` | Achado do executor ao aplicar a correção anterior: quem interpola essa variável é o Compose, não o shell do container, e sem `:-localhost` o `Host` sai vazio quando ninguém define `DOMAIN` — exatamente o caso padrão que o item 3 do DoD testa | 2026-09-20 |
