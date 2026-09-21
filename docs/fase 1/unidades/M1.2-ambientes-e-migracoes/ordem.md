> Unidade: `M1.2-ambientes-e-migracoes` · Marco: `M1 · Banco` · Trilha: `dividida`
> Estado: em exploração
> Emitida por: condutor · Data: 2026-09-20 · Explorador: o operador

# Ordem de exploração — `M1.2-ambientes-e-migracoes`

## Contexto

Os dois projetos Supabase existem desde 2026-09-16, com a Data API desligada nos dois. O
operador criou tudo pelo painel. Nomes, organizações e regiões estão em
`docs/scope-brief.md`, seção 4. Por isso esta unidade não cria projeto nem mexe no
painel. Ela documenta os ambientes, prova o que o operador fez, e entrega o caminho de
migração.

O `apps/api` não tem nenhuma dependência de banco hoje: nem Drizzle, nem driver
Postgres, nem pasta `apps/api/drizzle`. Tudo nasce do zero.

A `M1.1-validar-supabase` já provou duas coisas que valem aqui. A conexão direta ao
Postgres no plano gratuito é só IPv6, e o runner do GitHub Actions não tem IPv6. O modo
transação do pooler não aceita prepared statement. As duas estão no achado 3 de
`docs/fase 1/unidades/M1.1-validar-supabase/exploracao.md`, com a fonte oficial.

Esta unidade é o caminho crítico da fase. A `M1.3-house-e-auditoria` depende dela, e o
M2 em diante depende das duas. A `M1.3` vai criar Row Level Security por `house`, como
exige a seção 3.5 do `docs/scope-brief.md`. O RLS só protege alguma coisa se a API
conectar com um papel do Postgres que obedeça às políticas. **Quem decide esse papel é
esta unidade, não a `M1.3`.** A pergunta P3 existe por causa disso.

## O que esta unidade deve entregar

Um comando único aplica as migrações versionadas de `apps/api/drizzle` num Postgres
local, no `dev` ou no `prod`. Ele recusa o `prod` sem confirmação explícita, e os testes
rodam contra um Postgres local sem acesso à rede.

## Trilha escolhida

`dividida`. A unidade é fundacional: a `M1.3` e todo o M2 consomem o caminho de conexão,
o comando de migração e o papel do Postgres que ela fixar. A exploração também é
investigação externa pesada, entre documentação do Drizzle, do Supabase e do Postgres.

O contrato precisa ser auto-suficiente em três pontos: o papel de cada conexão, a porta e
o modo do pooler de cada uso, e a trava do `prod`. Um executor que precise adivinhar
qualquer um dos três entrega uma migração que funciona na máquina de alguém e falha na
CI, ou um RLS que não protege nada.

## Perguntas a responder

1. **P1** — Quais versões de `drizzle-orm`, `drizzle-kit` e do driver Postgres entram, e
   qual driver: `postgres` ou `pg`? Mostre a saída de `pnpm view` de cada pacote na data
   da exploração. Diga se cada um declara suporte ao Node e ao TypeScript que o
   repositório usa, com o campo do `package.json` publicado. Compare os dois drivers só
   no que muda para este projeto: prepared statement no pooler e integração com o Drizzle.
2. **P2** — Qual endereço e qual modo do pooler cada uso precisa? Separe três usos: a
   migração rodando da CI, a migração rodando da máquina de um morador, e a API em
   execução no servidor da casa. Parta do achado 3 da `M1.1` e confirme só o que mudou
   desde 2026-09-12. Prove a rota com um `select 1` contra o pooler do `dev`, de uma
   máquina sem IPv6, e mostre a saída.
3. **P3** — Com qual papel do Postgres a migração roda, e com qual papel a API conecta em
   execução? Esta é a pergunta mais importante da ordem. Hipótese do condutor, que vem da
   memória e não foi conferida: o dono de uma tabela e o superusuário ignoram as políticas
   de RLS, a não ser que a tabela use `FORCE ROW LEVEL SECURITY`. Confirme ou derrube a
   hipótese na documentação oficial do Postgres, com a URL. Diga se o plano gratuito do
   Supabase deixa criar um papel sem `BYPASSRLS` e sem ser dono das tabelas, e se esse
   papel nasce por migração versionada ou só pelo painel. Diga o que esta unidade precisa
   deixar pronto para o teste de RLS da `M1.3` rodar com o papel da API, e não com o do
   dono. **Traga as opções com custo. A escolha é do operador.**
4. **P4** — Como o comando único recebe o ambiente alvo sem duplicar configuração? Compare
   um `drizzle.config.ts` só, lendo a URL de uma variável, com um arquivo por ambiente.
   Mostre o `--help` de `drizzle-kit migrate` de um binário instalado num diretório
   temporário, não da documentação.
5. **P5** — Como o comando recusa o `prod` sem confirmação explícita? O Drizzle Kit não
   parece ter trava nativa; confirme isso na documentação da versão de P1. Diga também
   como a exportação do `prod` antes de cada migração, que o `docs/scope-brief.md` exige,
   acontece: se o próprio comando exporta, ou se é passo manual escrito no README. Mostre
   se `pg_dump` funciona pelo pooler em modo sessão, contra o `dev`. **Traga as opções
   com custo. A escolha é do operador.**
6. **P6** — Como sobe o Postgres local dos testes? O item C4 do `docs/fase 1/dod.md`
   deixou essa forma para o contrato desta unidade. Compare Supabase CLI, imagem oficial
   do Postgres e serviço do GitHub Actions. Para cada um, diga se roda na CI da
   `M1.4-ci-verificacao` sem rede externa durante o teste, e quanto de memória usa. Diga
   qual versão maior do Postgres o `dev` roda, com `select version()` pelo MCP somente
   leitura, e se a forma escolhida consegue a mesma versão.
7. **P7** — Onde vivem as URLs de conexão de cada ambiente, e de onde o comando roda? Diga
   o que vai para `apps/api/.env.example`, como manda o item E3 do DoD, e o que vira
   segredo do GitHub. Diga se a migração do `dev` e do `prod` roda da CI ou da máquina de
   um morador, e o que cada caminho exige da proteção da `main` e da `M1.6`. **A escolha
   de onde roda é do operador.**
8. **P8** — Como o DoD prova esta unidade sem o schema da `M1.3`? Proponha como se prova
   o comando num Postgres local vazio, como pede o item G1 do DoD, sem criar tabela de
   domínio. A `M1.1` concluiu que "Data API desligada" não se verifica pela Management
   API. Diga se existe outra prova por comando, por exemplo uma requisição ao endpoint
   REST do projeto, e mostre a resposta contra o `dev`.

## Limites

- Não altere nada além de
  `docs/fase 1/unidades/M1.2-ambientes-e-migracoes/exploracao.md`.
- Não instale dependência no repositório. Experimento com Drizzle fica em diretório
  temporário fora dele, com a saída dos comandos no relatório.
- No `dev`, só leitura: `select 1`, `select version()`, `pg_dump` e consulta a catálogo.
  Nada de DDL, papel novo ou migração. Experimento de migração e de papel roda em
  Postgres local.
- No `prod`, nada. Nenhuma ferramenta de IA se conecta a ele, pela regra 06. Se precisar
  do host do pooler ou da região do `prod`, peça ao operador.
- Não desenhe `house`, auditoria nem política de RLS. Isso é `M1.3`. A P3 pergunta só o
  que esta unidade precisa deixar pronto.
- Não ponha Postgres no `docker-compose.yml`. O item J1 do DoD limita o compose aos
  serviços do roadmap. O Postgres de teste vive fora dele.
- Não trate deploy nem Cloudflare Tunnel. Isso é `M1.6`.
- Não decida P3, P5 nem onde a migração roda, em P7. São do operador.

## Fontes a consultar

- `docs/scope-brief.md`, seções 3.5 e 4.
- `docs/fase 1/roadmap.md`, marco M1 · Banco e a tabela de riscos.
- `docs/fase 1/dod.md`, seções C, E e G.
- `docs/fase 1/unidades/M1.1-validar-supabase/exploracao.md`, respostas sobre a Data API
  e achado 3.
- `apps/api/package.json`, `apps/api/.env.example`, `.github/workflows/ci.yml`,
  `README.md`.
- Documentação oficial do Drizzle, do Supabase sobre conexão e pooler, e do Postgres
  sobre Row Level Security, `CREATE ROLE` e `pg_dump`.
- O MCP do Supabase apontado para o `dev`, somente leitura, conforme `.mcp.json.example`.

### Material bruto de 2026-09-15

Existe um relatório de exploração desta unidade, de 2026-09-15, feito sem ordem e fora do
ciclo. Ele não está no repositório, por decisão do operador em 2026-09-17, registrada na
pendência 11 de `docs/fase 1/estado.md`. Você pode citá-lo como pista. Não pode tratá-lo
como resposta: tudo que vier dele se verifica de novo, com a evidência de hoje.

O que ainda serve como pista: a separação entre `drizzle-kit generate` e
`drizzle-kit migrate`, o mecanismo `--config`, a ausência de trava nativa para o `prod`, e
as duas perguntas que ele deixou ao operador.

O que está velho e não vale:

- ele diz que o projeto `prod` não existe. Existe desde 2026-09-16;
- ele trata criar os projetos e desligar a Data API como trabalho da unidade. O operador
  já fez as duas coisas;
- as versões de pacote dele são de 2026-09-15 e vieram só do registro;
- ele estranha a falta do `.mcp.json` no repositório. Isso é intencional hoje: só o
  `.mcp.json.example` é versionado;
- ele não conhecia o RLS, que entrou no roadmap em 2026-09-20. Não há nada nele sobre P3.

## Branch

`unidade/M1.2-ambientes-e-migracoes` para a execução. A `main` está protegida por ruleset,
então nada entra nela direto. O relatório de exploração entra por pull request, de uma
branch `docs/M1.2-exploracao`.

## Depende de

`M0.1-monorepo-base` e `M1.1-validar-supabase`, as duas fechadas.
