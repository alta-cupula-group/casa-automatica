> Unidade: `M1.10-endurecer-compose` · Marco: `M1 · CI` · Trilha: `dividida`
> Estado: em exploração
> Emitida por: condutor · Data: 2026-09-20

# Ordem de exploração — `M1.10-endurecer-compose`

## Contexto

A `M1.5-compose-e-caddy` fechou em 2026-09-20 e entregou `docker-compose.yml` com dois
serviços, `apps/api/Dockerfile` e `infra/caddy/Dockerfile`. A pilha sobe, serve o web em
`localhost` e a API em `api.localhost`.

Os dois containers rodam como `root`. Nenhum dos Dockerfiles declara `USER`. O compose
não declara `no-new-privileges`, `cap_drop` nem `read_only`. Os três `pnpm install` do
repositório rodam sem `--ignore-scripts`, então um gancho `postinstall` de qualquer
dependência transitiva executa código na máquina de quem instala e no runner da CI.

Esses três pontos apareceram numa varredura de segurança do condutor em 2026-09-20,
depois do fechamento da `M1.5`. Nenhum deles é bug do que a `M1.5` entregou: o contrato
dela não pedia nada disso.

A aplicação roda numa VM Debian 13 no node `pve` do Proxmox, com 2 vCPU e 4 GiB de RAM,
na rede da casa. Hoje nada está exposto à internet. A `M1.6-deploy-na-casa` é que abre o
Cloudflare Tunnel e coloca a chave SSH de deploy na CI. Esta unidade vem antes dela.

## O que esta unidade deve entregar

Os dois containers sobem sem privilégio de `root`, com o mínimo de capacidades do Linux,
e a instalação de dependências não executa script de pacote.

## Trilha escolhida

`dividida`. A exploração testa combinações que ou quebram a pilha ou não, e quase tudo
que ela produz é material descartável: saída de container que não subiu, permissão
negada, lista de pacote que depende de gancho. Só a combinação que funciona entra no
contrato. Pela regra 02, isso é trilha dividida.

O contrato precisa ser auto-suficiente num ponto específico: ele tem que nomear cada
capacidade mantida e cada caminho que continua gravável, com o motivo de cada um. Um
executor que receba só "endureça o compose" devolve algo que não sobe, ou que sobe porque
afrouxou tudo de novo.

## Perguntas a responder

1. **P1** — Qual usuário não-`root` cada imagem deve usar? Diga se
   `ghcr.io/pnpm/pnpm:12` e `caddy:2` já trazem um usuário comum, ou se é preciso criar.
   Mostre a saída de `id` dentro de cada imagem. Diga quem precisa ser dono de
   `/app` e de `/srv/web` para o processo ler o que precisa.
2. **P2** — O Caddy escuta na porta 80 dentro do container. Porta abaixo de 1024 exige
   `CAP_NET_BIND_SERVICE` num processo não-`root`. Confirme se isso vale para a imagem
   `caddy:2` como ela está hoje, e compare duas saídas: manter a capacidade com
   `cap_add`, ou mudar a porta interna do Caddy e ajustar o mapeamento do compose. Diga
   o que cada uma custa para o Caddyfile e para a `M1.6`.
3. **P3** — Com `cap_drop: ALL`, quais capacidades cada um dos dois containers ainda
   precisa para subir e passar no healthcheck? Chegue na lista por tentativa, e mostre o
   erro de cada capacidade que faltou. Não copie lista de tutorial.
4. **P4** — Com `read_only: true`, quais caminhos cada container ainda precisa escrever?
   Cubra o que o Caddy grava mesmo com `auto_https off`, e o que o Node grava, se grava
   algo. Diga quais viram `tmpfs` e quais viram volume, e por quê. Mostre o erro de cada
   caminho descoberto.
5. **P5** — `no-new-privileges` quebra alguma coisa nesta pilha? Se não quebrar, diga o
   que ele passa a impedir, em uma frase.
6. **P6** — Quais pacotes do `pnpm-lock.yaml` declaram gancho de instalação
   (`preinstall`, `install`, `postinstall`)? Liste-os com o comando que os encontrou.
   Para cada um, diga se o pacote funciona sem o gancho. Depois rode
   `pnpm install --ignore-scripts --frozen-lockfile` seguido de `pnpm -r build`,
   `pnpm -r test` e a subida do compose, e mostre o que passou e o que falhou.
7. **P7** — Se algum pacote precisar do gancho, qual é a forma de liberar só ele, na
   versão do pnpm que o repositório usa? Confirme na documentação oficial da versão
   instalada, com a URL, e não na memória. Diga se a forma encontrada sobrevive a
   `--frozen-lockfile`.
8. **P8** — Como cada item acima é verificado por comando, sem rede externa, para caber
   no `smoke-compose` que já existe em `.github/workflows/ci.yml`? Proponha a verificação
   de cada um: usuário efetivo do processo, capacidades, sistema de arquivos só leitura,
   e ausência de gancho de instalação. Diga o que não dá para verificar assim.

## Limites

- Não altere nada além de
  `docs/fase 1/unidades/M1.10-endurecer-compose/exploracao.md`. Experimento fica em
  diretório temporário fora do repositório, com a saída dos comandos no relatório.
- Não acrescente serviço ao compose. O item J1 do `docs/fase 1/dod.md` limita a dois.
- Não mexa no roteamento do Caddyfile. Domínio, subdomínio e proxy já estão decididos
  pela `M1.5`.
- Não trate cabeçalho HTTP de segurança. Isso é `M1.8-cabecalhos-seguranca`.
- Não trate auditoria de dependência vulnerável. Isso é `M1.9-auditoria-dependencias`.
- Não trate Cloudflare Tunnel, SSH nem deploy. Isso é `M1.6-deploy-na-casa`.
- Não troque imagem base nem versão de runtime. Se a exploração concluir que a troca é
  necessária, isso é pergunta ao operador, não decisão do explorador.

## Fontes a consultar

- `docker-compose.yml`, `apps/api/Dockerfile`, `infra/caddy/Dockerfile`, `.dockerignore`.
- `.github/workflows/ci.yml`, passo `smoke-compose`.
- `docs/fase 1/dod.md`, seções C, E e J.
- `docs/fase 1/unidades/M1.5-compose-e-caddy/exploracao.md`, que já mediu a VM.
- `docs/scope-brief.md`, seção 4, recursos limitados, e seção 3.5, segurança.
- Documentação oficial do Docker Compose sobre `cap_drop`, `cap_add`, `security_opt`,
  `read_only` e `tmpfs`.
- Documentação oficial do pnpm sobre `--ignore-scripts`, na versão do `packageManager`
  do `package.json` da raiz.
- Documentação oficial das imagens `caddy:2` e `ghcr.io/pnpm/pnpm:12` sobre usuário.
- Dentro da VM: `docker compose config`, `docker compose up`, `docker exec <c> id`,
  `docker inspect`, `capsh --print`.

## Branch

`unidade/M1.10-endurecer-compose` para a execução. A `main` está protegida por ruleset,
então nada entra nela direto. O relatório de exploração entra por pull request, de uma
branch `docs/M1.10-exploracao`.

## Depende de

`M1.5-compose-e-caddy`, fechada em 2026-09-20.
