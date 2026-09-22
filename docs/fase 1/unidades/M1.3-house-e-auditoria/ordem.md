> Unidade: `M1.3-house-e-auditoria` · Marco: `M1 · Banco` · Trilha: `dividida`
> Estado: em exploração
> Emitida por: condutor · Data: 2026-09-21 · Explorador: uma sessão de IA, com apoio do operador

# Ordem de exploração — `M1.3-house-e-auditoria`

## Contexto

A `M1.2-ambientes-e-migracoes` fechou em 2026-09-21. Ela entregou o comando
`db:migrate`, que migra `local`, `dev` e `prod`, com exportação do `prod` antes. Entregou
também a migração `0000_api_role`, que cria o papel `api_app` sem `BYPASSRLS` e sem ser
dono de nada. Os testes de banco rodam contra `supabase/postgres:17.6.1.173` local, com
`createTestDatabase` e `connectAsApiRole` de `apps/api/src/db/test-database.ts`. O
`apps/api/src/db/schema.ts` ainda não tem tabela.

Esta unidade cria a primeira tabela de domínio e fecha o M1 · Banco. O M2 inteiro espera
por ela. O `docs/scope-brief.md`, seção 3.5, exige Row Level Security por casa no
próprio Postgres, além do filtro da API. No Supabase o papel `postgres` tem `BYPASSRLS`,
então só o `api_app` fica preso ao RLS. A API ainda não existe e não conecta ao banco.

## O que esta unidade deve entregar

Uma migração cria `house`, a tabela de auditoria e o trigger que a alimenta. O RLS por
`house` vale para o `api_app` nessas tabelas. A migração roda em local, `dev` e `prod`,
nessa ordem. O `dev` passa a ter uma casa de teste, e o `prod` a casa real. Um teste
prova a linha de auditoria. Outro prova que o `api_app`, sem filtro na query, não vê
linha de outra casa.

## Trilha escolhida

`dividida`. A unidade define schema de entidade central e o modelo de RLS e de auditoria
que toda tabela do M3 em diante vai copiar. Pela regra 02, isso basta. A exploração ainda
testa comportamento do Postgres e do Supabase que gera material descartável. E há
decisões do operador no caminho, então o GATE 1 pode demorar.

O contrato precisa ser auto-suficiente em três pontos: o mecanismo exato que diz ao
Postgres qual é a casa corrente, a lista de `GRANT` do `api_app` tabela por tabela, e o
caminho que cria cada casa em cada ambiente.

## Perguntas a responder

1. **P1** — Como a política de RLS sabe qual é a casa corrente? A API conecta como
   `api_app` pelo pooler em modo sessão, porta `5432`, e não repassa o JWT ao Postgres.
   Compare ao menos a variável de sessão por `set_config` com escopo de transação e o
   uso de claims no estilo `auth.uid()`. Para cada opção, mostre por teste no Postgres
   local o que acontece em três casos: variável ausente, variável com valor inválido, e
   conexão reaproveitada depois de uma transação de outra casa. Diga o custo de cada
   opção para o M2.
2. **P2** — O que o `api_app` pode fazer em `house` e na auditoria? Proponha a lista de
   `GRANT` de cada tabela, e diga como o RLS trata `INSERT` e `UPDATE` com `house_id` de
   outra casa. Mostre por teste que a auditoria não aceita `UPDATE` nem `DELETE` do
   `api_app`. Lembre que o papel é `NOINHERIT`.
3. **P3** — Qual forma a tabela de auditoria precisa ter para cumprir o
   `docs/scope-brief.md`, seção 3.4: quem alterou o quê e quando? Proponha as colunas. A
   tabela `person` só nasce no M3. Diga como o trigger registra "quem" até lá e como isso
   muda no M3 sem editar migração antiga. O item G2 do `docs/fase 1/dod.md` proíbe editar
   migração que já está na `main`.
4. **P4** — Como o trigger fica reaproveitável? Toda tabela auditada do M3 em diante tem
   que entrar na auditoria com uma linha de migração. Mostre a função, se ela precisa de
   `SECURITY DEFINER`, e como fica o `search_path` dela. Diga se `house` é auditada, à luz
   do item G4.
5. **P5** — O Drizzle `0.45.2` instalado declara RLS, política e trigger no `schema.ts`, e
   o `drizzle-kit` `0.31.10` gera isso? Responda com o arquivo de tipos em
   `node_modules` ou a documentação oficial da versão. Diga o que precisa de migração
   escrita à mão com `--custom` e em que ordem as migrações ficam.
6. **P6** — Como cada casa nasce no seu ambiente? A mesma migração roda em local, `dev` e
   `prod`, mas o `dev` só guarda a casa de teste e o `prod` só a casa real. Compare ao
   menos: migração que insere, script separado por ambiente, e passo manual no
   `README.md`. Diga como o teste local e a CI ganham suas casas. Diga quais dados da casa
   real dependem do operador.
7. **P7** — O que o Supabase concede sozinho a papéis como `anon`, `authenticated` e
   `service_role` numa tabela nova de `public`? Confira no `dev` pelo MCP somente leitura
   e na imagem local. Diga se a migração precisa revogar algo, mesmo com a Data API
   desligada.
8. **P8** — Algo desta migração passa no Postgres local e falha no `dev` ou no `prod`?
   Cubra criação de função e trigger, extensão, e dono dos objetos quando quem migra é
   `postgres`. Diga o que só se prova depois do merge, como os itens 9 e 10 da `M1.2`.

## Limites

- Não altere nada além de
  `docs/fase 1/unidades/M1.3-house-e-auditoria/exploracao.md`. Experimento roda num
  diretório temporário fora do repositório, contra um Postgres local, com a saída no
  relatório.
- No `dev`, só leitura, pelo MCP. Nenhuma escrita no `dev`. Nenhum acesso ao `prod`.
- Não crie `person`, `residency`, `user_profile` nem nenhuma outra tabela do M3 em
  diante. Se a auditoria parecer precisar delas, isso é resposta da P3, não tabela nova.
- Não escreva código da API nem conexão da API ao banco. Isso é M2.
- Não mexa em `db:migrate`, na trava do `prod` nem na migração `0000_api_role`. Se algo
  nelas precisar mudar, isso é pergunta ao operador.
- Decisões do operador, que o explorador propõe e não toma: o tipo da chave de `house`,
  o nome e os dados da casa real, o que o `api_app` pode alterar em `house`, e o que a
  auditoria guarda de dado pessoal.
- Dependência nova só como proposta, com a versão tirada do registro por comando.

## Fontes a consultar

- `apps/api/drizzle/0000_api_role.sql`, `apps/api/src/db/schema.ts`,
  `apps/api/src/db/test-database.ts` e `apps/api/drizzle.config.ts`.
- `docs/fase 1/unidades/M1.2-ambientes-e-migracoes/contrato.md`, seções do papel
  `api_app` e do Postgres de teste.
- `docs/fase 1/unidades/M1.2-ambientes-e-migracoes/exploracao.md`, que já testou RLS com
  dono, papel comum e papel com `BYPASSRLS`.
- `docs/scope-brief.md`, seções 3.4, 3.5 e 4.
- `docs/fase 1/dod.md`, seção G.
- Documentação oficial do Postgres 17 sobre `CREATE POLICY`, `set_config`,
  `current_setting` e `CREATE TRIGGER`.
- Documentação oficial do Supabase sobre RLS e sobre os papéis padrão.
- Os tipos instalados de `drizzle-orm` e `drizzle-kit` em `node_modules`.
- MCP do Supabase no `dev`: `list_tables`, `list_extensions`, `execute_sql` só com
  `select`.

## Branch

`unidade/M1.3-house-e-auditoria` para a execução. A `main` está protegida por ruleset,
então nada entra nela direto. O relatório de exploração entra por pull request, de uma
branch `docs/M1.3-exploracao`.

## Depende de

`M1.2-ambientes-e-migracoes`, fechada em 2026-09-21.
