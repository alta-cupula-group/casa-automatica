> Unidade: `M1.1-validar-supabase` · Marco: `M1 · Banco` · Trilha: `só exploração`
> Estado: fechada
> Explorador · Data: 2026-09-12
> Condutor aceitou: 2026-09-12 · Operador aprovou: 2026-09-12

# Exploração — `M1.1-validar-supabase`

> Unidade fechada em 2026-09-12. O veredito do operador está no fim do documento.

## Resumo

O limite de dois projetos ativos no plano gratuito está confirmado por fonte oficial,
com texto literal na página de preços e na documentação de billing. O limite é por conta,
não por organização: ele soma os projetos de todas as organizações onde a pessoa é Owner
ou Admin. Projeto pausado não conta. A pausa por inatividade é de 7 dias e a reativação
é um clique no painel, com janela de 1 ano. O que a ordem não previu: as cotas de egress
e de tamanho de banco são avaliadas **por organização**, e a política de uso justo é
aplicada a **todos os projetos da organização restringida**. Isso torna a escolha entre
"uma organização com dois projetos" e "duas organizações com um projeto cada" uma decisão
de isolamento, não de forma. Segundo achado: o desligamento da Data API é um botão só do
painel; não existe campo equivalente na Management API, então o DoD do roadmap não é
verificável por comando hoje. Terceiro achado: no plano gratuito a conexão direta ao
Postgres é IPv6, e o GitHub Actions é IPv4, o que muda o desenho de migração do `M1.2`.
Não consegui olhar a conta do operador: nenhuma ferramenta do MCP `supabase` foi exposta
a esta sessão. Ficam cinco perguntas ao operador no fim do documento.

## Respostas

### P1 — Quantos projetos ativos o plano gratuito permite?

**Resposta:** dois projetos ativos. O número aparece com esse texto na página de preços e
na documentação de billing. Projeto pausado não entra na conta. Consulta em 2026-09-12.

**Evidência:** `https://supabase.com/pricing`, cartão do plano Free, texto extraído do
HTML da página:

```
Get started with:
Unlimited API requests
50,000 monthly active users
500 MB database size
Shared CPU • 500 MB RAM
5 GB egress
5 GB cached egress
1 GB file storage
Community support
Free projects are paused after 1 week of inactivity. Limit of 2 active projects.
```

`https://supabase.com/docs/guides/platform/billing-on-supabase`, seção `Free Plan`,
parágrafo inteiro:

```
The Free Plan helps you get started and explore the platform. You are granted two free
projects. The project limit applies across all organizations where you are an Owner or
Administrator. This means you could have two Free Plan organizations with one project
each, or one Free Plan organization with two projects. Paused projects do not count
towards your free project limit.
```

**Confiança:** `fato verificado`

### P2 — O limite conta por organização ou por conta dona de organizações?

**Resposta:** conta por pessoa, atravessando organizações. A frase é "the project limit
applies across all organizations where you are an Owner or Administrator". Uma conta pode
ter mais de uma organização gratuita, mas o total de projetos ativos gratuitos continua
dois. Criar uma segunda organização não libera vaga nenhuma.

Existe um efeito de segunda ordem que a ordem não perguntou. Dentro de uma organização, o
limite é contado somando a cota de **todos** os membros com papel Owner ou Admin. Se um
morador for promovido a Admin e já tiver gastado a cota dele em projetos pessoais, a
organização deixa de conseguir criar projeto gratuito. Isso importa porque a casa tem três
moradores e o roadmap prevê os três usando o `prod`.

**Evidência:** `https://supabase.com/docs/guides/platform/billing-faq`, pergunta
`How many free projects can I have?`:

```
You are entitled to two active free projects. Paused projects do not count towards your
quota. Note that within an organization, we count the free project limits from all members
that are either Owner or Admin. If you've got another organization member with the Admin
or Owner role that has already exhausted their free project quota, you won't be able to
launch another free project in that organization. You can create another Free Plan
organization or change the role of the affected member in your organization's team
settings.
```

**Confiança:** `fato verificado`

### P3 — Depois de quantos dias sem uso um projeto pausa?

**Resposta:** 7 dias de atividade baixa. "Atividade" é consulta de usuário ao banco;
algumas requisições por dia bastam para não pausar. O dono recebe dois e-mails, um aviso
cerca de uma semana antes e uma confirmação depois da pausa. Os dados e a configuração
permanecem: o projeto volta ao estado anterior ao ser reativado. A reativação é pelo
painel, em `Resume project`, e a janela para reativar é de 1 ano contado da pausa. Depois
de 1 ano o projeto não volta pelo painel. Enquanto está pausado, qualquer requisição HTTP
ao projeto responde `540`.

A documentação **não diz quanto tempo leva** a reativação. Ver `## Não descoberto`.

**Evidência:** `https://supabase.com/docs/guides/platform/free-project-pausing`:

```
Supabase pauses Free Plan projects that show low activity over a 7-day period to save
server resources.
[...] Typically a few user requests to the database each day over the previous week is
enough to keep the project from being paused.
[...] You can restore a paused project for up to 1 year after it was paused:
1. Open the Supabase Dashboard
2. Select the organization, followed by the paused project
3. Click Resume project and confirm
The project will return to its previous state, including data and configurations.
```

`https://supabase.com/docs/guides/troubleshooting/http-status-codes`:

```
#### 540 project paused
The project the request was being made against has been paused. The project cannot
process requests until it is un-paused by the owner.
```

**Confiança:** `fato verificado`, com exceção do tempo de reativação.

### P4 — Quais outros limites do plano gratuito podem apertar na Fase 1?

**Resposta:** os números estão na tabela abaixo, todos da página de preços e da
documentação de billing, consultadas em 2026-09-12.

| Limite | Valor no plano gratuito | Escopo | Aperta na Fase 1? |
|---|---|---|---|
| Projetos ativos | 2 | por pessoa Owner ou Admin | sim, é o objeto desta unidade |
| Tamanho do banco | 500 MB por projeto | por projeto para o modo somente leitura | não |
| Tamanho do banco, uso justo | cota do plano somada entre projetos | por organização | sim, se `dev` e `prod` dividirem organização |
| Egress | 5 GB por mês | por organização | provavelmente não, ver abaixo |
| Egress em cache | 5 GB por mês | por organização | não |
| Armazenamento de arquivos | 1 GB | por organização | não, o MVP não guarda arquivo |
| Conexões diretas ao Postgres | 60 | por projeto, compute Nano | não |
| Clientes no pooler | 200 | por projeto, compute Nano | não |
| Compute | Nano, CPU compartilhada, 500 MB de RAM | por projeto | risco de desempenho, não de bloqueio |
| Retenção de log de API e banco | 1 dia | por projeto | sim, para depurar falha de ontem |
| Retenção de log de Auth | 1 hora | por projeto | sim, mesmo motivo |
| Backup automático | não incluído | — | sim, ver riscos |
| Point-in-time recovery | não incluído | — | não, o MVP não exige |
| Branching | não incluído | — | sim, fecha uma opção do `M1.2` |
| MAU do Auth | 50.000 | por organização | não, a casa tem três moradores |
| Session timeouts | não incluído | — | não, o brief já resolveu no cliente |

O que chega perto do uso de três moradores: **nenhum número de volume**. Cinco GB de
egress por mês são cerca de 166 MB por dia de resposta de consulta. Um sistema de
despesas de três pessoas não produz isso. O que aperta de verdade é qualitativo: a
retenção de log de 1 dia e a ausência de backup automático.

Sobre egress, um detalhe que muda a conta. O tráfego do pooler entra na cota. A
arquitetura do brief manda a API falar com o Postgres pelo pooler, então toda linha lida
pela API conta como `Shared Pooler Egress`.

**Evidência:** tabela de cotas em
`https://supabase.com/docs/guides/platform/billing-on-supabase`:

```
| Usage Item            | Free               |
| Egress                | 5 GB               |
| Database Size         | 500 MB per project |
| Monthly Active Users  | 50,000 MAU         |
| Storage Size          | 1 GB               |
| Realtime Peak Connections | 200            |
[...]
The quota is applied to your entire organization, independent of how many projects you
launch within that organization. For billing purposes, we sum the usage across all
projects in a monthly invoice.
```

Conexões, em `https://supabase.com/docs/guides/platform/compute-and-disk`:

```
| Compute instance | Max Replication Slots | Max WAL Senders | Database Max Connections | Connection Pooler Max Clients |
| Nano (free)      | 5                     | 5               | 60                       | 200                           |
```

Egress do pooler, em
`https://supabase.com/docs/guides/platform/manage-your-usage/egress`:

```
Data sent to the client when using the shared connection pooler (Supavisor) to access
your database. When using the shared connection pooler, we do not count database egress,
as this would otherwise count double.
```

Retenção de log e backup, na comparação de planos em `https://supabase.com/pricing`:

```
Log retention (API & Database)   Free: 1 day     Pro: 7 days
Auth Audit Logs                  Free: 1 hour    Pro: 7 days
Automatic backups                Free: Not included
Branching                        Free: Not included
Session timeouts                 Free: Not included
```

Backup no gratuito, em `https://supabase.com/docs/guides/platform/backups`:

```
We recommend that free tier plan projects regularly export their data using the Supabase
CLI `db dump` command and maintain off-site backups.
```

**Confiança:** `fato verificado`

### P5 — A Data API pode ser desligada por projeto?

**Resposta:** pode, e só pelo painel. A documentação descreve dois cliques: abrir a
página de integração da Data API do projeto e desligar `Enable Data API`. Com ela
desligada, nenhum endpoint REST gerado responde, independente de grants e de RLS.

Pelo CLI ou pela Management API, **não**. A Management API expõe
`PATCH /v1/projects/{ref}/postgrest`, e o corpo aceito tem só `db_schema`,
`db_extra_search_path`, `max_rows`, `db_pool` e `db_pool_acquisition_timeout`. Não existe
campo booleano de ligado ou desligado. A equipe do Supabase confirma isso numa discussão
pública e sugere, como aproximação, restringir `db_schema`.

Desligar **não afeta** o Supabase Auth nem o acesso direto ao Postgres pelo pooler. Auth
e PostgREST são serviços distintos atrás do mesmo gateway, e o pooler não passa por
PostgREST. A própria documentação de segurança recomenda desligar a Data API justamente
para quem só usa conexão direta, que é o caso do brief.

**Evidência:** `https://supabase.com/docs/guides/database/hardening-data-api`:

```
### Disable the Data API
If your app never uses Supabase client libraries, REST, or GraphQL data endpoints, turn
the Data API off:
1. Open the Data API integration overview in the Dashboard.
2. Turn Enable Data API off.
With the Data API disabled, none of the auto-generated REST endpoints respond, regardless
of grants or RLS.
```

`https://supabase.com/docs/guides/database/secure-data`:

```
### Direct database connections
Connect to Postgres with a connection string from trusted servers, workers, or tools.
[...] You can disable the Data API if your app only uses direct connections.
```

`https://supabase.com/docs/guides/auth/architecture`, sobre os serviços serem separados:

```
There are four major layers to Supabase Auth:
1. Client layer.
2. Envoy API gateway. This is shared between all Supabase products.
3. Auth service (formerly known as GoTrue).
4. Postgres database.
```

Corpo aceito pela Management API, lido do OpenAPI oficial em
`https://api.supabase.com/api/v1-json`, schema `V1UpdatePostgrestConfigBody`:

```json
{"type":"object","properties":{
  "db_extra_search_path":{"type":"string"},
  "db_schema":{"type":"string"},
  "max_rows":{"type":"integer"},
  "db_pool":{"type":"integer"},
  "db_pool_acquisition_timeout":{"type":"integer"}}}
```

Resposta da equipe em `https://github.com/orgs/supabase/discussions/42744`:

```
The "Enable Data API" toggle (which controls the underlying PostgREST service) is
currently a UI-only feature in the dashboard and is not yet explicitly exposed as a
boolean property in the Management API or the Terraform provider.
```

**Confiança:** `fato verificado` para o botão do painel, para a ausência do campo na
Management API e para a separação entre Auth e PostgREST. `hipótese` para o código HTTP
exato devolvido pelo endpoint REST depois de desligado: não testei, porque testar exigiria
desligar a Data API de um projeto, o que a ordem proíbe.

### P6 — Quais são os caminhos possíveis para ter `dev` e `prod`?

**Resposta:** seis caminhos. Estão na seção `## Opções`, com custo e consequência. Não
escolho nenhum, como a ordem determina.

Antes deles, três fatos que restringem a escolha.

Primeiro, o projeto `omgheudterjqrjunpack` está **ativo** hoje, então já ocupa uma das
duas vagas. Um pedido HTTP sem chave devolve `401` do gateway, e não `540`, que é o código
de projeto pausado.

Segundo, `create_branch` não é caminho. Branching não existe no plano gratuito.

Terceiro, o projeto está numa organização cuja identidade eu não conheço, e a vaga
depende de quem é Owner ou Admin dela. Ver `## Não descoberto`.

**Evidência:** verificação do estado do projeto, em 2026-09-12:

```
$ getent hosts omgheudterjqrjunpack.supabase.co
104.18.38.10    omgheudterjqrjunpack.supabase.co
172.64.149.246  omgheudterjqrjunpack.supabase.co

$ curl -s -o body -w "%{http_code}" https://omgheudterjqrjunpack.supabase.co/rest/v1/
401 | {"hint":"No `apikey` request header or url param was found.","message":"No API key found in request"}

$ curl -s -o body -w "%{http_code}" https://omgheudterjqrjunpack.supabase.co/auth/v1/health
401 | {"hint":"No `apikey` request header or url param was found.","message":"No API key found in request"}
```

Branching no plano gratuito, na comparação de planos em `https://supabase.com/pricing`:

```
Branching   Free: Not included   Pro: $0.01344 per branch, per hour
```

**Confiança:** `fato verificado` para branching e para o projeto responder pelo gateway.
`hipótese` para "o projeto está ativo": o `401` prova que o gateway atende, e a
documentação diz que projeto pausado responde `540`, mas não confirmei pelo painel.

## Superfície

Esta unidade não toca código. A superfície é documental e de conta.

| Arquivo ou recurso | Existe hoje | O que muda |
|---|---|---|
| `docs/scope-brief.md` seção 4 | sim | o `[A VALIDAR]` do limite de dois projetos pode sair, depois do veredito do operador |
| `docs/fase 1/estado.md` | sim | pendência 4 passa de aberta a resolvida, e a unidade muda de estado |
| `docs/fase 1/roadmap.md` marco `M1 · Banco` | sim | "Data API desligada em ambos" precisa de um critério de verificação, ver PO5 |
| `docs/fase 1/dod.md` item `G1` | sim | nada. `G1` já manda verificar migração em Postgres local |
| `docs/fase 1/unidades/M1.2-ambientes-e-migracoes/` | não | consome este relatório |
| Projeto Supabase `omgheudterjqrjunpack` | sim, ativo | nada nesta unidade. Papel definido pelo operador |
| Segundo projeto Supabase | desconhecido | pode precisar ser criado pelo operador |
| `.mcp.json` | sim | nada nesta unidade. Ver achado 4 |

## Achados não previstos

### 1. As cotas são da organização, e a punição também

A cota de egress, de armazenamento e de MAU vale para a organização inteira, somando os
projetos. Pior: a restrição por uso justo é aplicada a todos os projetos da organização.

```
The quota is applied to your entire organization, independent of how many projects you
launch within that organization.
[...]
The Fair Use Policy is generally applied to all projects of the restricted organization.
```
`https://supabase.com/docs/guides/platform/billing-on-supabase` e
`https://supabase.com/docs/guides/platform/billing-faq`

O mesmo vale para tamanho de banco sob uso justo:

```
Separate from the per-project read-only mode above, your organization can be placed under
a Fair Use service restriction (requests return a 402 status code) when its database size
exceeds the plan quota. This quota is evaluated per organization, summing the database
size across all of your projects.
```
`https://supabase.com/docs/guides/platform/database-size`

Consequência prática: com `dev` e `prod` na mesma organização gratuita, um teste de carga
em `dev` pode derrubar o `prod` da casa. Com `dev` e `prod` em organizações gratuitas
separadas, cada uma tem a própria cota e a própria restrição. O total de dois projetos
não muda nos dois arranjos. A escolha é de isolamento, não de quantidade. Ela virou a
pergunta PO2.

### 2. "Data API desligada" não é verificável por comando

O roadmap pede a Data API desligada nos dois ambientes, e o DoD da fase exige critério
verificável. O botão só existe no painel e a Management API não tem o campo. Então o item
não tem comando que prove o estado. Ele precisa virar verificação manual com evidência, ou
trocar de forma. Virou a pergunta PO5.

### 3. No plano gratuito a conexão direta é IPv6, e o GitHub Actions é IPv4

A documentação de conexão traz a tabela abaixo. O host direto do projeto só tem registro
`AAAA`, o que confirmei por DNS.

```
| Mode                            | Host:Port                                       | Free |
| Direct connection               | db.[PROJECT-REF].supabase.co:5432               | IPv6 |
| Shared pooler, session mode     | aws-[INDEX]-[REGION].pooler.supabase.com:5432   | IPv4 |
| Shared pooler, transaction mode | aws-[INDEX]-[REGION].pooler.supabase.com:6543   | IPv4 |
| Dedicated pooler                | db.[PROJECT-REF].supabase.co:6543               | -    |
```
`https://supabase.com/docs/guides/database/connecting-to-postgres`

```
$ getent ahosts db.omgheudterjqrjunpack.supabase.co
2600:1f14:2c31:7603:2dc0:5856:3f3d:f301 STREAM
```

Nenhum endereço IPv4 aparece. A mesma página recomenda conexão direta justamente para
migrações:

```
| Migrations, pg_dump, backup and restore, or replication | Direct connection | These are
single sessions and Postgres native commands. |
```

O roadmap manda a migração inicial aplicar em `dev` e em `prod` sem intervenção manual, e
o marco `M1 · CI` põe o pipeline no GitHub Actions. Runner do GitHub não tem saída IPv6.
Então a migração automatizada tem que sair pelo pooler em modo sessão, não pela conexão
direta. Isso é desenho do `M1.2` e do `M1.6`, mas nasce aqui.

Um segundo detalhe da mesma página, que o `M1.2` vai precisar com Drizzle:

```
Caution: Transaction mode does not support prepared statements. To avoid errors, turn
them off in your connection library.
```

### 4. O MCP configurado tem ferramentas de escrita e nenhuma trava de leitura

`.mcp.json` aponta para o MCP hospedado com as features `database`, `development`,
`functions` e `branching` ligadas, sem `read_only`:

```json
{"mcpServers":{"supabase":{"type":"http",
"url":"https://mcp.supabase.com/mcp?project_ref=omgheudterjqrjunpack&features=docs%2Caccount%2Cdatabase%2Cdebugging%2Cdevelopment%2Cfunctions%2Cbranching"}}}
```

Qualquer agente desta casa pode aplicar migração ou rodar SQL de escrita no projeto sem
passar pelo ciclo. A ordem desta unidade proibiu isso por texto, mas a proibição é
processo, não configuração. `branching` inclusive não serve para nada no plano gratuito.
Não proponho mudança, porque configuração não é minha; registro o fato.

### 5. Um confirma o brief, e vale registrar

O brief decidiu logout por inatividade no cliente porque o recurso nativo é pago. A
comparação de planos confirma: `Session timeouts — Free: Not included`.

## Opções

As seis opções para P6. Todas partem do fato de que o projeto `omgheudterjqrjunpack` está
ativo e já ocupa uma das duas vagas.

### Opção A — duas vagas gratuitas na mesma organização

`dev` e `prod` como dois projetos da mesma organização gratuita. O projeto existente vira
um dos dois; o operador cria o outro.

Custo: zero em dinheiro. Um projeto novo a criar no painel.
Consequência: fecha as duas vagas gratuitas da conta. Abre o arranjo mais simples de
operar, com uma organização e um lugar para olhar. Deixa `prod` exposto à cota e à
restrição de uso justo compartilhadas com `dev`. Os dois pausam em 7 dias sem uso.

### Opção B — duas vagas gratuitas em duas organizações separadas

Uma organização para `dev`, outra para `prod`, um projeto em cada.

Custo: zero em dinheiro. Uma organização a criar, mais um lugar para configurar membros.
Consequência: cada organização tem 5 GB de egress, 1 GB de arquivos e cota própria de
tamanho de banco. Restrição por uso justo em `dev` não atinge `prod`. Continua fechando as
duas vagas gratuitas da conta. Exige atenção a quem é Owner ou Admin em cada organização,
pela regra da cota somada entre administradores.

### Opção C — só `prod` na nuvem, `dev` local pelo CLI

Um projeto gratuito na nuvem como `prod`. O ambiente de desenvolvimento roda em Docker na
máquina de cada morador, pelo Supabase CLI.

Custo: Docker e o CLI na máquina de cada um. O notebook velho do brief aguenta Postgres,
mas o stack completo do Supabase local sobe vários contêineres. Muda o brief seção 4, que
decidiu `dev` compartilhado na nuvem e Supabase local como opcional.
Consequência: deixa uma vaga gratuita livre para o que vier. Elimina a pausa por
inatividade do `dev`. Casa com o item `C4` do DoD da fase, que já proíbe teste tocando
rede externa, e com `G1`, que exige a migração rodando em Postgres local. Tira o ambiente
compartilhado: dois moradores deixam de ver o mesmo dado de desenvolvimento. Exige o
operador, porque contraria uma decisão do brief.

### Opção D — um projeto só, `dev` e `prod` separados por schema

Um projeto gratuito, dois schemas no mesmo banco.

Custo: zero em dinheiro.
Consequência: deixa uma vaga livre. Quebra o isolamento: migração errada em `dev` roda no
mesmo servidor de `prod`, e o Auth é um só, então usuário de teste e morador real
compartilham a mesma tabela de usuários. Contraria o brief seção 4. Registro por
completude, não por mérito.

### Opção E — plano Pro numa organização

Organização de `prod` no Pro, a 25 dólares por mês, `dev` numa organização gratuita.

Custo: 25 dólares por mês, mais consumo. Exige o operador, por ser gasto recorrente.
Consequência: `prod` nunca pausa, ganha backup diário de 7 dias e retenção de log de 7
dias. Libera branching por hora, se um dia servir. Some o principal risco operacional do
plano gratuito, que é a ausência de backup. É a única opção que compra isso.

### Opção F — três projetos, um sempre pausado

Dois ativos e um pausado de reserva, já que projeto pausado não conta na cota.

Custo: zero em dinheiro. Um passo manual toda vez que se troca qual projeto está ativo.
Consequência: só faz sentido se a casa precisar de um terceiro ambiente eventual, por
exemplo um `staging` de véspera de corte. Reativar exige vaga livre no momento da
reativação, então trocar significa pausar outro antes. Não resolve nada sozinha; é um
complemento de A ou de B.

### Fora de cogitação

Branching do Supabase como `dev`. A comparação de planos diz `Branching — Not included in
free`. A feature está ligada no `.mcp.json`, mas não funciona nesta conta enquanto ela for
gratuita.

## Não descoberto

1. **Quantos projetos gratuitos a conta do operador já tem, e em qual organização mora o
   `omgheudterjqrjunpack`.** Nenhuma ferramenta do MCP `supabase` foi exposta a esta
   sessão de exploração: as ferramentas disponíveis foram apenas leitura de arquivo,
   shell, busca e leitura na web. Sem `list_organizations` e `list_projects`, e sem
   credencial de painel, não dá para contar as vagas já gastas. Só o operador responde.
2. **Quem são os Owners e Admins da organização.** Importa pela regra da cota somada entre
   administradores. Mesma limitação do item 1.
3. **Quanto tempo leva reativar um projeto pausado.** A documentação descreve o clique e
   diz que o projeto volta ao estado anterior, mas não dá número. Relatos de comunidade
   falam em minutos; não trato relato de comunidade como fato.
4. **O código HTTP devolvido pelo endpoint REST com a Data API desligada.** Testar exigiria
   desligar a Data API de um projeto real, o que a ordem proíbe. O `M1.2` mede e registra.
5. **Se o `omgheudterjqrjunpack` está mesmo ativo, pelo painel.** O `401` do gateway
   indica que sim, já que projeto pausado responde `540`, mas a confirmação direta depende
   do painel.
6. **Se a região do projeto existente serve.** Não consegui ler a região sem o MCP. Latência
   entre a casa e a região escolhida entra no `M1.2`.

## Riscos vistos daqui

| Risco | Sinal de que aconteceu |
|---|---|
| Perda de dados do `prod` sem backup automático. O plano gratuito não faz backup e a recomendação oficial é `supabase db dump` periódico e cópia fora da plataforma. | Não há sinal. Descobre-se no dia em que se precisa restaurar. Mitigação vira passo de operação no `M11`, que o roadmap já prevê. |
| `dev` pausa no meio de uma unidade e trava a execução por alguns minutos. | Requisição responde `540`. |
| `dev` e `prod` na mesma organização, e uma restrição de uso justo derruba os dois. | Todas as requisições respondem `402`. |
| Banco passa de 500 MB e o projeto entra em somente leitura. | Erro `cannot execute INSERT in a read-only transaction`. Improvável com três moradores. |
| Migração no CI falha por IPv6. | `Network is unreachable` ao conectar em `db.<ref>.supabase.co`. |
| Prepared statement no pooler em modo transação. | Erro de prepared statement já existente ao repetir a consulta. |
| Falha de ontem sem log, porque a retenção é de 1 dia e a de Auth é de 1 hora. | O painel não mostra o evento procurado. |
| Um agente escreve no projeto pelo MCP fora do ciclo. | Migração ou tabela que nenhum `execucao.md` registra. |

## Perguntas ao operador

As recomendações abaixo foram escritas pelo condutor em 2026-09-12, depois de ler o
relatório. Responda a PO3 primeiro: PO1 e PO2 só fazem sentido depois dela.

O condutor verificou o projeto `omgheudterjqrjunpack` pelo MCP em 2026-09-12, antes de
emitir a ordem. Ele não tem nenhuma tabela no schema `public` e nenhuma migração
registrada. O projeto está vazio.

### PO1 — O projeto `omgheudterjqrjunpack` é o `dev`, o `prod` ou descartável?

Por que importa: ele está ativo e ocupa uma das duas vagas. Enquanto o papel dele não
estiver escrito, o `M1.2` não sabe onde aplica a migração inicial.
Opções:
- **A** — é o `prod` · custo: zero · consequência: a segunda vaga vira o `dev`, e o `prod`
  nasce com histórico de testes anteriores, se houver.
- **B** — é o `dev` · custo: zero · consequência: o `prod` nasce limpo, o que é melhor para
  dinheiro real.
- **C** — é descartável, apagar e criar os dois do zero · custo: dois projetos a criar no
  painel · consequência: nomes e regiões escolhidos de propósito, sem herança.
Recomendação do condutor: B, se a PO3 mantiver o `dev` na nuvem. O projeto está vazio, e o
`prod` que vai guardar dinheiro real nasce melhor limpo e com nome escolhido de propósito.
Se a PO3 levar o `dev` para a máquina de cada um, este projeto vira o `prod`, porque não há
nada nele para herdar.

### PO2 — `dev` e `prod` na mesma organização gratuita ou em duas organizações separadas?

Por que importa: a cota de egress e de tamanho de banco é da organização, e a restrição
por uso justo atinge todos os projetos da organização. Na mesma organização, um erro em
`dev` pode parar o `prod` da casa. O número de vagas gratuitas é o mesmo nos dois casos.
Opções:
- **A** — uma organização com dois projetos · custo: zero · consequência: operação mais
  simples, um lugar só para olhar. `prod` fica acoplado ao `dev` em cota e em punição.
- **B** — duas organizações com um projeto cada · custo: criar e manter uma organização a
  mais, com atenção a quem é Owner e Admin em cada uma · consequência: `prod` isolado de
  `dev` em cota e em restrição. Mais um lugar para configurar membro.
Recomendação do condutor: B. O custo é uma organização criada uma vez, e o que ela compra é
o `prod` da casa não parar por causa de um teste feito no `dev`.

### PO3 — O `dev` continua na nuvem ou vira Supabase local?

Por que importa: o brief seção 4 decidiu `dev` compartilhado na nuvem e local como
opcional. Trocar isso é mudar o brief, e só o operador muda. A resposta define se as duas
vagas gratuitas ficam gastas ou se sobra uma.
Opções:
- **A** — manter `dev` na nuvem, como o brief decidiu · custo: zero · consequência: as
  duas vagas ficam gastas. Ambiente de desenvolvimento compartilhado entre os moradores.
- **B** — `dev` local pelo CLI, só `prod` na nuvem · custo: Docker e CLI na máquina de cada
  morador, mais a edição do brief · consequência: sobra uma vaga gratuita, `dev` não pausa
  mais, e cada morador passa a ter o próprio banco de desenvolvimento, sem dado comum.
Recomendação do condutor: A, que é manter o brief. O item C4 do DoD já exige um Postgres
local para os testes, então o `dev` na nuvem não serve para testar: ele serve para ensaiar
contra o Supabase Auth de verdade antes de mexer no `prod`, e isso o banco local não cobre.
A segunda vaga gratuita não tem outro uso previsto na Fase 1.

### PO4 — Os outros dois moradores entram na organização como Owner, Admin ou Developer?

Por que importa: dentro de uma organização, o limite de projetos gratuitos soma a cota de
todos os membros Owner e Admin. Se um morador com cota própria esgotada virar Admin, a
organização perde a capacidade de criar projeto gratuito.
Opções:
- **A** — Developer · custo: zero · consequência: não consome cota alheia. Papel com menos
  poder de administração.
- **B** — Owner ou Admin · custo: risco de bloquear a criação de projeto novo na
  organização · consequência: os três administram tudo, inclusive faturamento.
Recomendação do condutor: A. Developer dá acesso ao projeto sem gastar a cota de projeto
gratuito de quem entra, e o brief já decidiu que não há hierarquia de admin no produto.

### PO5 — Como o DoD vai provar que a Data API está desligada?

Por que importa: o roadmap do `M1 · Banco` exige Data API desligada nos dois ambientes, e
o DoD da fase exige critério verificável. O botão só existe no painel e a Management API
não tem o campo equivalente. Sem uma resposta, o `M1.2` fecha com item não verificável, o
que a regra 02 proíbe.
Opções:
- **A** — verificação manual com evidência · custo: uma captura de tela e uma linha em
  `execucao.md` por ambiente, refeita a cada auditoria · consequência: cumpre o roadmap ao
  pé da letra. Ninguém detecta se alguém religar o botão depois.
- **B** — verificação por sonda HTTP · custo: um comando `curl` com a chave publicável
  contra `/rest/v1/`, cuja saída exata só se conhece depois de desligar uma vez ·
  consequência: vira comando repetível e cabe no CI. Depende de descobrir a resposta real
  do endpoint desligado.
- **C** — `db_schema` vazio pela Management API, além do botão · custo: um segredo de
  token de gerenciamento no CI · consequência: estado legível por `GET` e automatizável.
  Não é o mesmo que desligar o serviço, então o texto do roadmap teria que mudar.
Recomendação do condutor: B, com A como plano B. O desligamento continua sendo o botão do
painel, porque não existe outro caminho. A `M1.2` desliga uma vez, registra a resposta real
do `/rest/v1/` em `execucao.md` e transforma essa resposta no comando de verificação. Se a
resposta do endpoint desligado for igual à de um projeto ligado sem chave, a opção B morre
por falta de sinal e o item vira verificação manual.

## Material bruto

Tudo consultado em 2026-09-12.

| Fonte | O que devolveu |
|---|---|
| `https://supabase.com/pricing` | limite de 2 projetos ativos, pausa em 1 semana, tabela completa de comparação dos planos |
| `https://supabase.com/docs/guides/platform/billing-on-supabase` | texto do limite por pessoa, tabela de cotas, cota por organização |
| `https://supabase.com/docs/guides/platform/billing-faq` | cota somada entre Owners e Admins, uso justo aplicado a todos os projetos da organização |
| `https://supabase.com/docs/guides/platform/free-project-pausing` | 7 dias, dois e-mails, `Resume project`, janela de 1 ano |
| `https://supabase.com/docs/guides/platform/going-into-prod` | pausa por baixa atividade em 7 dias, ausência de backup para download |
| `https://supabase.com/docs/guides/platform/backups` | recomendação de `supabase db dump` para o plano gratuito |
| `https://supabase.com/docs/guides/platform/database-size` | somente leitura acima de 500 MB, uso justo somando o banco de todos os projetos da organização |
| `https://supabase.com/docs/guides/platform/compute-and-disk` | 60 conexões diretas e 200 clientes no pooler no compute Nano |
| `https://supabase.com/docs/guides/platform/manage-your-usage/egress` | egress do pooler conta na cota |
| `https://supabase.com/docs/guides/database/connecting-to-postgres` | tabela de IP por modo, prepared statement no modo transação |
| `https://supabase.com/docs/guides/database/hardening-data-api` | passos para desligar a Data API |
| `https://supabase.com/docs/guides/database/secure-data` | recomendação de desligar quando só se usa conexão direta |
| `https://supabase.com/docs/guides/auth/architecture` | Auth e PostgREST como serviços distintos |
| `https://supabase.com/docs/guides/troubleshooting/http-status-codes` | `540` para projeto pausado, `402` para restrição de serviço |
| `https://api.supabase.com/api/v1-json` | `V1UpdatePostgrestConfigBody` sem campo de ligar ou desligar |
| `https://github.com/orgs/supabase/discussions/42744` | resposta da equipe dizendo que o botão é só do painel |

## Veredito do operador

Aprovado em 2026-09-12. O operador aceitou as cinco recomendações do condutor. Registrado
pelo condutor na mesma data, a partir da resposta do operador.

| Pergunta | Decisão |
|---|---|
| PO1 | **B**. O projeto `omgheudterjqrjunpack` é o `dev` |
| PO2 | **B**. `dev` e `prod` ficam em organizações gratuitas separadas |
| PO3 | **A**. O `dev` continua na nuvem, como o brief decidiu |
| PO4 | **A**. Os outros dois moradores entram como Developer |
| PO5 | **B**, com **A** de reserva. A `M1.2` desliga a Data API pelo painel, registra a resposta real de `/rest/v1/` em `execucao.md` e transforma essa resposta no comando de verificação. Se a resposta não distinguir ligado de desligado, o item vira verificação manual |

O `[A VALIDAR]` do limite de dois projetos saiu do `docs/scope-brief.md` em 2026-09-12.

O que este veredito fixa para as próximas unidades:

- `M1.2` aplica a migração inicial no `dev` `omgheudterjqrjunpack` e no `prod` novo.
- `M1.2` e `M1.6` conectam pelo pooler em modo sessão para migrar, por causa do IPv6.
- `M1.2` desliga a Data API nos dois ambientes e mede a resposta do endpoint desligado.

### Decisão posterior do operador, 2026-09-13

PO1, PO2 e PO3 foram substituídas. A Fase 1 usa **um projeto Supabase só**. O dado de teste
fica numa casa de teste, no mesmo banco da casa real. Motivo do operador: dois projetos na
mesma organização não protegem o dado real, e a casa já é a fronteira dos dados. PO4 e PO5
continuam valendo. A decisão está em `docs/scope-brief.md`, seção 4.

A tabela de ações abaixo ficou parcialmente sem efeito: não há segunda organização nem
segundo projeto a criar.

### Decisão posterior do operador, 2026-09-15

A decisão de 2026-09-13 foi revertida. Voltam PO1, PO2 e PO3 do veredito de 12/09: o
projeto que já existia é o `dev`, o `prod` nasce limpo numa organização gratuita separada,
e o `dev` fica na nuvem. PO4 e PO5 seguem valendo. Decisões novas da mesma data: a casa de
teste existe só no `dev`; migração passa por Postgres local, `dev` e `prod`, com exportação
do `prod` antes; o MCP do Supabase aponta só para o `dev`. A decisão está em
`docs/scope-brief.md`, seção 4.

A tabela de ações abaixo volta a valer inteira.

Ações do operador no painel, registradas em 2026-09-12:

| # | Ação | Trava o quê |
|---|---|---|
| 1 | Criar a segunda organização gratuita e, nela, o projeto `prod` | `M1.2` |
| 2 | Desligar `Enable Data API` nos dois projetos | `M1.2` |
| 3 | Informar a região de cada projeto | `M1.2` |
| 4 | Adicionar os outros dois moradores como Developer | nada. Pode esperar |

### Decisão posterior do operador, 2026-09-16

O operador apagou o projeto `omgheudterjqrjunpack` e qualquer outro projeto Supabase
anterior. A decisão de 2026-09-15 continua inteira: dois projetos gratuitos, `dev` e
`prod`, em organizações separadas, `dev` na nuvem, moradores como Developer, MCP só no
`dev`. Muda só o ponto de partida. A PO1 perde o referente: não há projeto herdado, e
`dev` e `prod` nascem os dois limpos.

Evidência de que o projeto não existe mais, colhida em 2026-09-16:

```
$ getent hosts supabase.com
216.150.1.193   supabase.com

$ getent hosts omgheudterjqrjunpack.supabase.co
$ echo $?
2
```

Em 2026-09-12 esse mesmo comando devolvia dois IPs da Cloudflare, como está registrado
acima no material bruto.

A tabela de ações do operador no painel volta a valer, com a linha 1 ampliada: agora são
duas organizações e dois projetos a criar, não um.

### Ações concluídas em 2026-09-16

O operador criou as duas organizações gratuitas e os dois projetos no mesmo dia, desligou a
Data API nos dois e adicionou os outros moradores. O `prod` nasceu primeiro no Canadá e foi
recriado em São Paulo, com o banco ainda vazio, depois que o condutor apontou o custo de
latência. Nomes e regiões estão em `docs/scope-brief.md`, seção 4. Nenhuma ação de painel
fica pendente.
