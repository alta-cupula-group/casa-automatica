# Estágio 1: builda o monorepo inteiro e isola @casa/api com as dependências de produção.
FROM ghcr.io/pnpm/pnpm:12 AS build
WORKDIR /repo
RUN pnpm runtime set node 26 -g
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm -r build
RUN pnpm deploy --filter=@casa/api --prod /deploy
# Falha o build aqui, e não em runtime, se o deploy sair sem o código compilado.
RUN test -s /deploy/dist/index.js

# Estágio 2: só o pacote isolado, sem apps/web e sem devDependencies.
FROM ghcr.io/pnpm/pnpm:12 AS runtime
WORKDIR /app
RUN pnpm runtime set node 26 -g
COPY --from=build /deploy .
EXPOSE 3000
CMD ["node", "dist/index.js"]
