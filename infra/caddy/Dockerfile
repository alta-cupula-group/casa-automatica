# Estágio 1: builda o monorepo inteiro e produz os estáticos de apps/web.
FROM ghcr.io/pnpm/pnpm:12 AS build
WORKDIR /repo
RUN pnpm runtime set node 26 -g
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm -r build
# Falha o build aqui, e não em runtime, se o Vite não gerar os estáticos.
RUN test -s apps/web/dist/index.html

# Estágio 2: só o Caddy, os estáticos do web e o Caddyfile.
FROM caddy:2
COPY --from=build /repo/apps/web/dist /srv/web
COPY infra/caddy/Caddyfile /etc/caddy/Caddyfile
EXPOSE 80
