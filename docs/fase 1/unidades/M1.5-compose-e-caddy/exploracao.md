> Unidade: `M1.5-compose-e-caddy` · Marco: `M1 · CI` · Trilha: `dividida`
> Estado: contrato em rascunho
> Explorador · Ferramenta: Claude Code, Sonnet 5 · Data: 2026-09-19 a 2026-09-20

# Exploração — `M1.5-compose-e-caddy`

## Resumo

O relatório original de 2026-09-17, feito na máquina de outro morador, se perdeu e não
existe em nenhuma máquina nem repositório. Esta exploração foi refeita do zero nesta
sessão, em 2026-09-19 e 2026-09-20, com evidência real: comandos dentro da VM
`casa-automatica` e do host Proxmox (P1), dois builds Docker reais medidos na própria VM
(P2), documentação oficial do Caddy, do Compose e da Cloudflare (P3, P5, P6, P7), e o
código de `apps/api` lido diretamente (achado sobre servidor HTTP).

P1 a P8 estão todos respondidos. Dois pontos precisaram do operador, e os dois já foram
decididos nesta conversa:
- **P4**, domínio: `casaautomatica.app` (web) e `api.casaautomatica.app` (API). O domínio
  mudou de `miotto.dev` para este, comprado pelo operador durante a própria exploração,
  em 2026-09-20.
- **Achado bloqueante**, `apps/api` sem servidor HTTP (nasce só no M2): o operador decidiu
  a opção B — o contrato de `M1.5` inclui um stub HTTP mínimo, substituído no M2.

Achado principal de P2: `pnpm deploy --filter=@casa/api --prod` é a única das duas formas
testadas que atende ao pedido de isolar `@casa/api` sem trazer `apps/web` — a alternativa
mais comum (instalar o workspace inteiro sem filtro nem `--prod`) falha nesse requisito,
além de ficar maior e mais lenta.

Nenhuma pergunta ficou em aberto. A unidade está pronta para o contrato.

## Respostas

### P1 — Qual versão de Docker e de Compose a VM tem instalada, e quanto sobra de CPU, memória e disco para os containers depois do sistema?

**Resposta:** A VM `casa-automatica` (VMID 42069, node `pve`) tem Docker Engine 29.8.1
(Community) e Docker Compose v5.5.1 instalados. Ela está alocada com 2 vCPU e 4096 MB de
RAM e 32 GB de disco (`qm config`). Depois do sistema em repouso, sobram os 2 vCPU
inteiros (nada rodando ainda), 3,4 GiB de memória disponível de 3,8 GiB totais (437 MiB em
uso), 1,7 GiB de swap livre, e 25 GiB livres de 30 GiB no `/` (15% usado — a partição
`/dev/sda1` é 30G, não os 32G nominais do disco, provavelmente por reserva de partição na
instalação do Debian).

Por ser VM e não container (LXC), o teto de recursos é o hard limit da própria VM: não há
contenção com outros processos do host nem limite adicional de cgroup imposto por fora, e
o Docker roda com kernel próprio, sem as restrições que apareceriam num LXC (módulos de
kernel faltando, cgroup v1/v2 incompatível). Para o compose isso não muda a forma do
arquivo; muda o orçamento a respeitar no P6 (limite de memória por serviço dentro dos 4
GiB totais, dos quais ~3,4 GiB estão livres antes de subir qualquer container).

**Evidência:**
```
# host Proxmox, node pve
root@pve:~# qm config 42069
agent: enabled=1
boot: order=scsi0;ide2;net0
cores: 2
cpu: x86-64-v2-AES
memory: 4096
name: casa-automatica
scsi0: local-lvm:vm-42069-disk-0,iothread=1,size=32G
...

# dentro da VM casa-automatica, via console noVNC (SSH por senha recusado; root sem
# PasswordAuthentication liberado)
root@casa-automatica:~# nproc
2

root@casa-automatica:~# free -h
              total       usada       livre     compart.  buff/cache  disponível
Mem.:          3,8Gi       437Mi       3,1Gi       648Ki       551Mi       3,4Gi
Swap:          1,7Gi         0B       1,7Gi

root@casa-automatica:~# df -h
Sist. Arq.     Tam.  Usado Disp. Uso% Montado em
/dev/sda1       30G   4,1G   25G  15% /
...

root@casa-automatica:~# docker version
Client: Docker Engine - Community
 Version:           29.8.1
 API version:       1.56
Server: Docker Engine - Community
 Engine:
  Version:          29.8.1
 containerd:
  Version:          v2.3.5
 runc:
  Version:          1.5.1
 docker-init:
  Version:          0.19.0

root@casa-automatica:~# docker compose version
Docker Compose version v5.5.1
```

**Confiança:** fato verificado, saída de comando dentro da VM e do host Proxmox em
2026-09-19.

### P2 — Como se constrói uma imagem só do `apps/api` num monorepo pnpm, levando `packages/shared` e nada de `apps/web`?

**Resposta:** `pnpm deploy --filter=@casa/api --prod <destino>` é a forma correta. Ela
copia `apps/api` e resolve `@casa/shared` (dependência de workspace, `workspace:*`) para
dentro de um `node_modules` isolado, sem `devDependencies` e sem nenhum arquivo de
`apps/web`. Testado num Dockerfile de dois estágios: o estágio de build roda no monorepo
completo (`pnpm install --frozen-lockfile` + `pnpm --filter @casa/api... run build` +
`pnpm deploy`), e o estágio final da imagem copia só o resultado do `deploy`, descartando
o resto.

Comparado com a alternativa mais comum — instalar o workspace inteiro sem filtro e sem
`--prod`, e rodar a partir dali com `pnpm --filter @casa/api start` —, o `pnpm deploy`
venceu nos dois eixos medidos **e** cumpriu o requisito que a alternativa não cumpre: a
alternativa deixa código-fonte e `devDependencies` de `apps/web` dentro da imagem final,
porque `pnpm install --frozen-lockfile` sem filtro instala o workspace todo e `COPY . .`
leva todo o monorepo. Não é só uma questão de tamanho — é a imagem carregando algo que P2
pediu explicitamente para não carregar.

| | `pnpm deploy --prod` | workspace completo, sem filtro |
|---|---|---|
| Tempo de build (`--no-cache`) | 41,35 s | 50,83 s |
| Tamanho da imagem final | 521 MB | 914 MB |
| Contém `apps/web` | não | sim (código-fonte e deps de dev) |

**Evidência:**
```
# /tmp/m1.5-p2 na VM casa-automatica, repositório clonado de
# https://github.com/alta-cupula-group/casa-automatica (main, commit no momento do clone)

# Opção A — pnpm deploy
$ time docker build --no-cache -f Dockerfile.deploy -t casa-api-deploy .
...
 => [build 5/5] RUN pnpm deploy --filter=@casa/api --prod /prod/api    0.6s
...
real    0m41,352s
$ docker images casa-api-deploy --format "{{.Repository}}: {{.Size}}"
casa-api-deploy: 521MB

# Opção B — workspace completo, sem deploy nem --prod
$ time docker build --no-cache -f Dockerfile.filter -t casa-api-filter .
...
 => [build 3/4] RUN pnpm install --frozen-lockfile                    16.6s
 => [build 4/4] RUN pnpm --filter @casa/api... run build               2.7s
...
real    0m50,834s
$ docker images casa-api-filter --format "{{.Repository}}: {{.Size}}"
casa-api-filter: 914MB
```

Dockerfiles usados (fora do repositório, em `/tmp/m1.5-p2` na VM):
```dockerfile
# Dockerfile.deploy
FROM ghcr.io/pnpm/pnpm:12 AS base
RUN pnpm runtime set node 26 -g

FROM base AS build
WORKDIR /usr/src/app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @casa/api... run build
RUN pnpm deploy --filter=@casa/api --prod /prod/api

FROM base AS app
WORKDIR /prod/api
COPY --from=build /prod/api .
CMD ["node", "dist/index.js"]
```
```dockerfile
# Dockerfile.filter
FROM ghcr.io/pnpm/pnpm:12 AS base
RUN pnpm runtime set node 26 -g

FROM base AS build
WORKDIR /usr/src/app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @casa/api... run build

FROM build AS app
WORKDIR /usr/src/app
CMD ["pnpm", "--filter", "@casa/api", "start"]
```

Sintaxe de `pnpm deploy` e o padrão de Dockerfile confirmados na documentação oficial do
pnpm em 2026-09-19: https://pnpm.io/cli/deploy e https://pnpm.io/docker.

**Confiança:** fato verificado, build real na VM `casa-automatica` em 2026-09-19.

### P3 — Como o web estático é servido dentro do limite de três serviços do J1: o próprio Caddy servindo os arquivos do build, ou um container separado?

**Resposta:** As duas formas são tecnicamente válidas e o J1 não obriga usar as três
entradas nomeadas — ele proíbe serviço **fora** da lista, não exige que todas apareçam.
`docker compose config --services`, o comando do J1, aceita tanto duas quanto três saídas
sem violar a regra, desde que os nomes estejam entre `api`, `web` e `caddy`. Ficam duas
opções, com custo diferente:

**Opção A — Caddy serve os arquivos do build direto (2 containers: `api` e `caddy`)**
O Caddyfile usa `root` + `file_server` no bloco do domínio do web, e `reverse_proxy` no
bloco do domínio da API:
```
casaautomatica.app {
    root * /srv/web
    file_server
}

api.casaautomatica.app {
    reverse_proxy api:<porta>
}
```
Os arquivos de `apps/web/dist` precisam estar dentro da imagem do Caddy. A forma que a
própria documentação do Docker Hub do Caddy recomenda para produção é basear uma imagem
própria em `caddy` e copiar os arquivos com `COPY` em vez de montar volume — um Dockerfile
de dois estágios (build do Vite, depois `FROM caddy` com `COPY --from=build`).

Custo: um container a menos rodando o tempo todo, o que importa nos ~3,4 GiB livres
medidos em P1. Ônus: atualizar o web exige reconstruir a imagem do Caddy (ou repovoar um
volume e recarregar), acoplando o ciclo de deploy do web ao do proxy.

**Opção B — container próprio para o estático (3 containers: `api`, `web`, `caddy`)**
O Caddy só faz `reverse_proxy` nos dois blocos, sem `file_server`:
```
casaautomatica.app {
    reverse_proxy web:<porta>
}

api.casaautomatica.app {
    reverse_proxy api:<porta>
}
```
O serviço `web` roda algum servidor de arquivo próprio (outra instância de `caddy` em
modo só `file_server`, por exemplo) e recebe a imagem com `apps/web/dist` do mesmo jeito.

Custo: mais um container residente o tempo todo, disputando os mesmos ~3,4 GiB livres.
Ganho: atualizar o web não toca no container do Caddy principal, e o nome `web` aparece
de fato em `docker compose config --services`, batendo literalmente com a lista do
roadmap e do J1.

Nenhuma das duas exige decisão do operador — é escolha de desenho que cabe no contrato.

**Evidência:**
```
Diretiva file_server e combinação com reverse_proxy em blocos de site separados,
documentação oficial do Caddy, consultada em 2026-09-19:
https://caddyserver.com/docs/caddyfile/directives/file_server

"Most users deploying production sites will not want to rely on mounting files into
a container, but will instead base their own images on `caddy`"
— Docker Hub, imagem oficial do Caddy, consultada em 2026-09-19:
https://hub.docker.com/_/caddy
```

**Confiança:** fato verificado para a sintaxe do Caddyfile e a recomendação de imagem
própria (documentação oficial, com URL). A leitura de que o J1 aceita menos de três
serviços é interpretação da explorada sobre o texto do DoD, não teste automatizado.

### P4 — Como API e web dividem o mesmo domínio no Caddy: prefixo de caminho para a API, ou subdomínio?

**Resposta:** Subdomínio. Decisão original, em 2026-09-19: a API responderia em
`api.casa-automatica.miotto.dev` e o web em `casa-automatica.miotto.dev`, até o operador
comprar o domínio definitivo. Em 2026-09-20 o operador confirmou a compra de
`casaautomatica.app` e decidiu usá-lo desde já nesta unidade: o web responde em
`casaautomatica.app` e a API em `api.casaautomatica.app`. O padrão de subdomínio para a
API se mantém, só muda o domínio raiz.

**Evidência:**
```
Decisão do operador, registrada nesta conversa em 2026-09-19:
"A api vai rodar em api.casa-automatica.miotto.dev e o frontend em
casa-automatica.miotto.dev até eu não comprar o dominio casaautomatica.app"

Atualização do operador, registrada nesta conversa em 2026-09-20:
domínio casaautomatica.app comprado; usar casaautomatica.app (web) e
api.casaautomatica.app (API) como domínio definitivo desta unidade em diante.
```

**Confiança:** decisão do operador, não fato técnico verificado por comando ou documentação.

### P5 — O que muda no Caddy entre servir `localhost` nesta unidade e ficar atrás do Cloudflare Tunnel em M1.6?

**Resposta:**

**Quem termina o TLS.** Nesta unidade, o próprio Caddy termina TLS: para nomes não
públicos (`localhost`, `127.0.0.1`, `.local`), ele emite certificado da sua própria CA
interna, automaticamente, sem tocar a internet. Em `M1.6`, quem termina o TLS público que
o navegador vê passa a ser a Cloudflare, na borda. O túnel entre `cloudflared` e a
Cloudflare já é uma conexão de saída autenticada e criptografada por si só; dali até o
Caddy dentro da rede local, o tráfego roteado pelo `ingress` do túnel pode ser HTTP puro
ou HTTPS — as duas formas são aceitas, a documentação mostra exemplos com `http://` e
`https://` no mesmo arquivo de configuração.

**Por que isso importa agora.** Se o Caddyfile desta unidade já usar os nomes de produção
(`casaautomatica.app`, `api.casaautomatica.app`, decididos em P4) em vez
de `localhost` puro, o Caddy vai tentar emitir certificado público via ACME
automaticamente, porque esses nomes parecem domínios públicos. Essa tentativa falha
enquanto a VM não for alcançável da internet nesta unidade — e continua falhando depois,
atrás do túnel, porque o `cloudflared` não abre porta de entrada nenhuma (só conexão de
saída), então o desafio HTTP-01 do ACME nunca completa. O Automatic HTTPS do Caddy tenta
de novo com backoff exponencial até 30 dias, gerando log de erro constante à toa.

**O que fica preparado aqui para `M1.6` não reescrever o Caddyfile.** Desligar o
Automatic HTTPS já nesta unidade, com a opção global `auto_https off` (ou prefixando os
blocos com `http://`), e manter os blocos de site amarrados aos nomes de produção desde
já, testados localmente via entrada em `/etc/hosts` apontando esses nomes para
`127.0.0.1`. Assim `M1.6` só acrescenta o `cloudflared` apontando para a mesma porta que
o Caddy já publica para `localhost`, sem tocar nos blocos de roteamento.

**Sobre a disputa das portas 80/443 da rede local.** O Cloudflare Tunnel remove essa
disputa por desenho: o `cloudflared` não abre porta de entrada, e o `ingress` roteia por
nome de host para qualquer combinação de endereço e porta interna, inclusive em outras
máquinas da mesma rede (`http://192.168.x.x:porta`). A disputa por 80/443 só existiria com
port-forward tradicional no roteador para um único destino — o que deixa de ser
necessário ao adotar o túnel, decisão já fixada no `docs/scope-brief.md`, seção 4. O que
isso exige do Caddyfile desta unidade é só manter os blocos amarrados a hostname (já é o
caso, por causa de P4), em vez de um bloco genérico `:80 { }` que assumisse posse
exclusiva da porta — isso deixa espaço para outro serviço da casa usar a mesma porta local
por hostname diferente, se um dia entrar nesta mesma VM.

**Evidência:**
```
Automatic HTTPS, CA interna para nomes locais, e falha com backoff quando a porta
80/443 pública é inalcançável — documentação oficial do Caddy, consultada em 2026-09-19:
https://caddyserver.com/docs/automatic-https

Regras de ingress do Cloudflare Tunnel aceitando http:// e https://, por hostname,
apontando para endereços e portas diferentes (inclusive outra máquina da rede local),
e cloudflared descrito como conexão de saída — documentação oficial da Cloudflare,
consultada em 2026-09-19:
https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/local-management/configuration-file/

Exemplo do próprio documento:
ingress:
  - hostname: example.com
    service: https://localhost:8000
  - hostname: static.example.com
    path: \.(jpg|png|css|js)$
    service: https://localhost:8001
  - hostname: "*.example.com"
    service: https://localhost:8002
  - service: https://localhost:8003
```

**Confiança:** fato verificado para o comportamento do Automatic HTTPS do Caddy e para a
forma das regras de `ingress` do Cloudflare Tunnel, as duas com URL da documentação
oficial. A conclusão de que isso elimina a disputa de porta 80/443 da rede local é
inferência da exploradora sobre esses dois fatos, não uma frase literal da documentação.

### P6 — O que o compose precisa ter para esse guest: política de reinício, limite de memória dentro dos 4 GB, healthcheck, e como as variáveis de `apps/api/.env.example` chegam ao container sem entrar na imagem?

**Resposta:** Parte desta resposta depende da pergunta ao operador registrada no fim
deste documento — `apps/api` hoje não sobe servidor HTTP, então restart e healthcheck do
serviço `api` não têm o que verificar ainda. O que segue vale sem depender disso.

**Limite de memória.** P1 mediu 3,4 GiB disponíveis de 3,8 GiB totais antes de subir
qualquer container, e 1,7 GiB de swap livre. Compose (fora de Swarm) aceita `mem_limit`
direto no serviço:
```yaml
services:
  api:
    mem_limit: 512m
  caddy:
    mem_limit: 256m
```
Um orçamento como 512m para `api`, 256m para `caddy`, e o que sobrar para `web` (se for
container separado, por P3) cabe com folga nos 3,4 GiB livres, deixando margem para o
sistema e para o Cloudflare Tunnel que chega em `M1.6`.

**Healthcheck.** Para `caddy`, um teste HTTP contra o próprio domínio local funciona; para
`api`, só faz sentido depois que a pergunta ao operador definir se existe algo escutando.
Sintaxe confirmada na especificação do Compose:
```yaml
healthcheck:
  test: ["CMD", "wget", "-qO-", "http://localhost/"]
  interval: 10s
  timeout: 3s
  retries: 3
  start_period: 5s
```
Falta confirmar, no contrato, se a imagem do Caddy escolhida traz `wget` ou `curl`
instalado — não verifiquei isso nesta exploração.

**Política de reinício.** Para `caddy` (processo de longa duração, sem saída esperada),
`restart: unless-stopped` é o padrão razoável. Para `api`, a mesma política só faz
sentido depois de existir um processo que realmente fica de pé; hoje, com o script
terminando sozinho, `unless-stopped` criaria um container reiniciando em loop silencioso.

**Variáveis de ambiente sem entrar na imagem.** `env_file` aponta para um arquivo `.env`
que fica só na VM (fora do repositório, fora da imagem), nunca copiado por `COPY` nem
`ARG`/`ENV` do Dockerfile:
```yaml
services:
  api:
    env_file:
      - .env
```
Isso atende E1 (nenhum segredo no repositório — o `.env` real não é versionado), E2 (só
`.env.example` é versionado) e E3 (toda variável lida pelo código aparece documentada no
`.env.example`), porque o `.env.example` de `apps/api` continua sendo a lista de
referência; o `.env` real na VM só precisa ter as mesmas chaves, com valor de verdade.
Hoje `apps/api/.env.example` só declara `PORT` e `NODE_ENV`, nenhuma delas secreta — o
E1 não tem o que vazar ainda nesta unidade.

**Evidência:**
```
mem_limit, restart e healthcheck — especificação oficial do Compose, consultada em
2026-09-19:
https://docs.docker.com/reference/compose-file/services/

"mem_limit configures a limit on the amount of memory a container can allocate"
"Environment variables declared in the environment section override these values"
(referente a env_file vs environment)

apps/api/.env.example (lido nesta sessão):
# porta HTTP que a API vai usar a partir do M2
PORT=
# modo de execução
NODE_ENV=

docs/fase 1/dod.md, linhas 68-70 (E1 a E3).
```

**Confiança:** fato verificado para a sintaxe do Compose (documentação oficial, com URL)
e para o conteúdo do `.env.example` (arquivo lido). A recomendação de orçamento de
memória (512m/256m) é proposta da exploradora a partir dos números de P1, não um valor
fixado em documentação.

### P7 — Quais itens do critério de pronto dão para automatizar em teste sem rede (C4), e quais ficam como verificação manual (C3)? Como se testa que o compose sobe e responde, e isso cabe no CI de M1.4?

**Resposta:** C4 proíbe o teste de acessar rede **externa** (Supabase na nuvem, SEFAZ),
não proíbe rede local entre containers. Como o domínio já existe (P4) e a rota é só por
nome de host (Caddy não olha IP nem precisa de DNS real), dá para simular a chegada pelo
domínio de produção sem internet nenhuma, só forçando o cabeçalho `Host` contra
`localhost`:
```bash
curl -H "Host: casaautomatica.app" http://localhost/
curl -H "Host: api.casaautomatica.app" http://localhost/
```
Isso torna automatizável quase tudo que o DoD desta unidade pede:

**Automatizável, sem rede externa:**
- `docker compose config --services` devolve exatamente os serviços do contrato (J1) —
  checagem estática, sem subir nada.
- `docker compose up --wait` sobe os serviços e só retorna quando eles chegam a
  `healthy` pelos healthchecks de P6, com `--wait-timeout` para não travar o CI para
  sempre se algo não subir. Documentado oficialmente: `--wait` "Wait for services to be
  running|healthy. Implies detached mode."
- O `curl` com `Host` forjado contra `web` e `api` responde o esperado (o stub da
  pergunta ao operador, decidida como opção B, entra aqui — sem ele não haveria o que
  checar do lado da API).
- Que nenhuma variável de `.env` real vaza para dentro da imagem — checagem estática na
  imagem construída (`docker image inspect`/`docker history`), sem subir container.
- `docker compose down` limpa tudo ao final, sem deixar estado.

**Fica como verificação manual (C3), com a evidência que o contrato deve pedir:**
- O domínio respondendo de verdade pela internet, atrás do Cloudflare Tunnel — isso é
  `M1.6`, mas mesmo dentro desta unidade, o teste automatizado só prova a rota local, não
  que o mundo externo chega até ela. Evidência esperada: print ou `curl` externo já em
  `M1.6`.
- Comportamento sob o limite real de memória da VM (2 vCPU, 4 GiB, medidos em P1) por um
  período mais longo — o runner do GitHub Actions tem outra CPU e outra memória, então
  não prova que os `mem_limit` de P6 são suficientes na máquina real. Evidência esperada:
  a VM rodando o compose por um tempo, com `docker stats`, depois do deploy de `M1.6`.

**Cabe no CI de `M1.4`.** O `ci.yml` atual roda em `ubuntu-24.04`, que já vem com Docker
instalado — não precisa de runner novo. Dá para acrescentar um passo (ou um job) depois
do build que roda `docker compose up --wait`, os dois `curl`, e `docker compose down`.
Como a unidade não decidiu ainda o Dockerfile final (isso é execução, não exploração),
o contrato precisa decidir se esse passo entra dentro do job `verificar` existente ou
num job novo em paralelo — construir as imagens Docker é mais lento que o `pnpm build`
atual, e isso é escolha de desenho, não da exploração.

**Evidência:**
```
--wait e --wait-timeout do `docker compose up` — documentação oficial, consultada em
2026-09-19:
https://docs.docker.com/reference/cli/docker/compose/up/

.github/workflows/ci.yml (lido nesta sessão): job "verificar" roda em ubuntu-24.04,
já instala Node e pnpm, builda, linta, testa e formata — sem nenhum passo de Docker
ainda.

docs/fase 1/dod.md, linhas 53-54 (C3 e C4).
```

**Confiança:** fato verificado para a flag `--wait` (documentação oficial) e para o
conteúdo do `ci.yml` (arquivo lido). A divisão entre automatizável e manual é análise da
exploradora sobre o texto de C3/C4, não um teste que rodou de fato.

### P8 — O que `M1.6-deploy-na-casa` vai precisar daqui: onde o compose fica, como a imagem chega ao servidor, o que o deploy por SSH executa? Diga só o que não pode ser fechado aqui.

**Resposta:** Isto não desenha o deploy — só separa o que esta unidade já deixa fixado do
que fica em aberto para o contrato de `M1.6` decidir.

**Já fica fixado por esta exploração, `M1.6` pode contar com isso:**
- Os três nomes de serviço possíveis são `api`, `web` e `caddy` (J1); quantos deles
  existem de fato depende da opção de P3 que o contrato escolher.
- Os domínios são `casaautomatica.app` (web) e `api.casaautomatica.app` (API), decisão do
  operador em P4 — e eles precisam vir de variável de ambiente, não de texto solto, pelo
  achado já registrado.
- O Caddy é o único ponto de entrada HTTP da VM, publicando as portas que hoje respondem
  em `localhost` — é nele que o `cloudflared` de `M1.6` vai apontar depois, sem precisar
  que outro serviço abra porta própria.
- As variáveis de `apps/api` chegam por `env_file` a um `.env` que mora só na VM, fora do
  repositório e da imagem (P6) — `M1.6` estende esse mesmo `.env`, não inventa um
  mecanismo novo, quando outras unidades (`M1.2`, `M1.3`) adicionarem variáveis de banco.
- `pnpm deploy --filter=@casa/api --prod` constrói a imagem da API dentro do orçamento de
  disco e tempo da própria VM (P2, medido de verdade nela) — prova que construir a imagem
  ali dentro é uma opção viável, não só teórica.

**Não dá para fechar aqui, fica para o contrato de `M1.6`:**
- Onde o `docker-compose.yml` e o(s) `Dockerfile(s)` finais vão morar no repositório —
  ainda não escrito, é o próprio contrato desta unidade que vai fixar isso, e `M1.6` só
  pode referenciar o caminho depois que ele existir.
- Se a imagem é construída direto na VM (`git pull` + `docker compose build` por SSH,
  like testado em P2) ou construída fora (CI, registry) e só enviada pronta — P2 mediu
  que construir na VM cabe no orçamento, não que essa é a forma escolhida.
- Como o `cloudflared` chega à VM e fala com o Caddy: container dentro do mesmo compose
  (o que esbarraria no limite de três serviços do J1) ou processo fora do Docker — fora
  do escopo desta unidade pelo limite da própria ordem.
- Onde ficam a credencial do túnel e a chave SSH de deploy — segredo do GitHub Actions,
  arquivo só na VM, ou outra forma.
- O que dispara o deploy e o que fazer se `docker compose up` falhar no meio — nenhum
  documento até agora define disparo ou reversão.
- Se a Opção A de P3 (Caddy servindo o web direto) for a escolhida, atualizar o web exige
  reconstruir a imagem do Caddy inteira a cada deploy — `M1.6` herda esse custo de tempo,
  ainda não medido para esse caso específico.

**Evidência:**
```
Síntese das respostas de P1 a P7 deste mesmo documento e dos limites e dependências
descritos em docs/fase 1/unidades/M1.5-compose-e-caddy/ordem.md, seção "Limites" e
"Depende de".
```

**Confiança:** análise da exploradora sobre o que já foi decidido neste documento; não é
fato novo verificado por comando ou documentação externa.

## Achados não previstos

`apps/api/src/index.ts` não sobe servidor HTTP: ele loga uma linha
(`api ok port=... sample=...`) e o processo termina. Não há `express`, `fastify` nem
qualquer framework HTTP no `apps/api/package.json`, e o próprio `.env.example` comenta
`# porta HTTP que a API vai usar a partir do M2`. Isso significa que, com o código de
hoje, o container `api` não fica de pé — ele roda, imprime a linha, e sai com código 0.
O DoD desta unidade ("o web responde em `localhost` com a API atrás do mesmo domínio")
não fecha sem alguma forma de a API continuar escutando. Isso muda o desenho de P6 (
restart e healthcheck do serviço `api` não têm o que verificar) e possivelmente o de P7.
Virou pergunta ao operador, no fim deste documento.

O domínio mudou de dono durante a própria exploração: começou como `miotto.dev`
(subdomínio de terceiro) e virou `casaautomatica.app`, comprado pelo operador em
2026-09-20 (P4). Isso é evidência de que o Caddyfile e o compose desta unidade não podem
fixar o domínio em texto solto mesmo agora que ele é definitivo — continuar sem hardcode,
com o domínio vindo de variável de ambiente, evita reescrever o Caddyfile se a casa um dia
tiver domínio de teste separado do de produção, e é o mesmo cuidado que P5 já pede para a
chegada do Cloudflare Tunnel.

## Não descoberto

P1 a P8 estão todos respondidos. O que não se recuperou foi o relatório original de
2026-09-17: ele se perdeu de verdade, não existe em nenhuma máquina nem repositório, e
esta versão foi refeita do zero a partir de P1, sem reaproveitar nada dele.

Um detalhe que ficou aberto dentro de P6: não verifiquei se a imagem do Caddy escolhida
para o healthcheck traz `wget` ou `curl` instalado. Fica para o contrato confirmar.

## Perguntas ao operador

P4 já foi respondida acima, pelo operador, diretamente nesta conversa.

### P1 — `apps/api` não sobe servidor HTTP (nasce no M2). Como esta unidade lida com isso?

Por que importa: sem processo escutando, o container `api` roda, imprime uma linha e
termina. O Caddy não tem para onde fazer `reverse_proxy`, e o DoD desta unidade ("o web
responde em `localhost` com a API atrás do mesmo domínio") não fecha. Trava também a
resposta completa de P6 (restart e healthcheck do serviço `api`) e talvez a de P7.

Opções:
- **A — Esperar o M2 fechar** antes de executar `M1.5`. Custo: atrasa toda a onda de CI e
  deploy (`M1.5` e `M1.6`, que dependem dela) até o esqueleto da API existir, sem previsão
  de quando o M2 será fatiado. Consequência: o roadmap de infraestrutura para de andar.
- **B — Contrato de `M1.5` inclui um stub HTTP mínimo em `apps/api`**, só para o container
  ficar de pé e o Caddy ter algo para rotear (por exemplo, um servidor que responde 200 em
  qualquer rota). Custo: pequena ampliação do código de `apps/api` fora do que o roadmap
  descreveu para esta unidade, decidida agora em vez de esperar o M2. Consequência: o M2
  substitui o stub pelo servidor real; o contrato precisa deixar explícito que é só um
  placeholder, não a base do endpoint definitivo.
- **C — Ajustar o DoD desta unidade**: o compose sobe e o Caddy roteia para o serviço
  `api`, mas o critério de pronto vira "o container `api` existe e o Caddyfile tem a rota
  configurada", sem exigir resposta de verdade via `reverse_proxy`. Custo: a prova de
  ponta a ponta do domínio único (P4) fica incompleta até o M2. Consequência: `M1.6`
  herda essa lacuna.

Recomendação da exploradora: **B**. Mantém `M1.5` e `M1.6` andando sem esperar o M2, o
stub é pequeno e descartável, e o DoD da unidade permanece verificável de ponta a ponta
como o roadmap descreveu.

**Decisão do operador, 2026-09-20: opção B.** O contrato de `M1.5` inclui um stub HTTP
mínimo em `apps/api`, só para o container ficar de pé e o Caddy ter o que rotear. O M2
substitui o stub pelo servidor real; o contrato precisa deixar isso explícito.
