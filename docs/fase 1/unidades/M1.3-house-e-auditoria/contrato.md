> Unidade: `M1.3-house-e-auditoria` · Marco: `M1 · Banco` · Trilha: `dividida`
> Estado: aprovada
> Condutor aprovou: 2026-09-22 · Operador aprovou: 2026-09-22
> Base: `ordem.md`, `exploracao.md` com o veredito do operador de 2026-09-22, `docs/scope-brief.md`, `docs/fase 1/dod.md`

# Contrato — `M1.3-house-e-auditoria`

Este documento é auto-suficiente. Quem executa não leu a exploração e não vai lê-la.
Tudo que a execução precisa está aqui ou nos arquivos nomeados aqui.

## O que será construído

Três migrações novas criam a tabela `house`, a tabela `audit_log` e o trigger que alimenta
a auditoria. O Row Level Security prende o papel `api_app` à casa corrente. A casa corrente
chega por uma variável de transação. Os papéis padrão do Supabase perdem todo privilégio
nos objetos novos. Um comando novo, `db:create-house`, cria a única casa de cada ambiente:
a casa de teste no `local` e no `dev`, e a casa real no `prod`. Esse modelo de RLS e de
auditoria é o que toda tabela do M3 em diante vai copiar.

Decisões que sustentam isto: `docs/scope-brief.md`, seções 3.4 e 3.5, e o veredito do
operador de 2026-09-22 no fim de `exploracao.md`.

## Interfaces e formatos

### Tabela `house`

| Coluna | Tipo |
|---|---|
| `id` | `uuid primary key default gen_random_uuid()` |
| `name` | `text not null` |
| `created_at` | `timestamptz not null default now()` |

### Tabela `audit_log`

| Coluna | Tipo | Conteúdo |
|---|---|---|
| `id` | `bigint generated always as identity primary key` | ordem de gravação |
| `house_id` | `uuid not null`, FK para `house(id)` sem cascata | casa da linha auditada |
| `table_name` | `text not null` | nome da tabela auditada |
| `row_id` | `text not null` | valor da coluna `id` da linha, como texto |
| `operation` | `text not null`, `check` em `'INSERT'`, `'UPDATE'`, `'DELETE'` | a operação |
| `old_data` | `jsonb`, nulo | veja a regra do conteúdo abaixo |
| `new_data` | `jsonb`, nulo | veja a regra do conteúdo abaixo |
| `actor_user_id` | `uuid`, nulo, sem FK | valor de `app.actor_user_id`, ou nulo |
| `db_role` | `text not null` | `session_user` de quem disparou o trigger |
| `occurred_at` | `timestamptz not null default now()` | quando |
| `transaction_id` | `bigint not null` | id da transação corrente. Igual em todas as linhas de uma transação |

Sem FK em `actor_user_id`: `auth.users` não existe no banco de teste.

### Casa corrente

- A API grava a casa com `set_config('app.house_id', <uuid>, true)`, dentro de uma
  transação. O terceiro argumento é sempre `true`, escopo de transação.
- `public.current_house_id()` devolve `uuid`. Ela lê `app.house_id` com
  `current_setting(..., true)`, troca texto vazio por nulo com `nullif(..., '')` e faz cast
  para `pg_catalog.uuid`. É `language sql`, `stable`, `SECURITY INVOKER`, sem cláusula
  `SET`. Toda função e todo tipo no corpo levam o schema `pg_catalog`.
- O `nullif` é obrigatório. Depois de um `set_config` local, a variável volta como texto
  vazio numa transação seguinte da mesma conexão, e não como nulo.
- Nenhuma política usa `auth.uid()` nem `request.jwt.claims`.

### Políticas

| Tabela | Política | Comando | Papel | Regra |
|---|---|---|---|---|
| `house` | `house_isolation` | `all` | `api_app` | `using` e `with check` em `id = public.current_house_id()` |
| `audit_log` | `audit_log_read` | `select` | `api_app` | `using` em `house_id = public.current_house_id()` |

RLS ligado nas duas tabelas. Sem `FORCE ROW LEVEL SECURITY`.

### Função do trigger `public.audit_row()`

- `language plpgsql`, `SECURITY DEFINER`, dono `postgres`,
  `SET search_path = pg_catalog, pg_temp`. Nunca `search_path = ''`: com o caminho vazio,
  o `pg_temp` de `api_app` é buscado primeiro para tipo, e código dele roda como
  `postgres`.
- Trigger `after insert or update or delete`, `for each row`, de nome `audit`.
- Argumento 1: nome da coluna que guarda a casa. Obrigatório. Sem ele, a função lança erro.
- Argumentos 2 em diante: colunas sensíveis. Opcionais.
- `house` entra com `audit_row('id')`, sem coluna sensível. Uma tabela do M3 entra com uma
  linha, como `audit_row('house_id', 'phone')`.

Regra do conteúdo, decisão PO4 opção E do operador:

| Operação | `old_data` | `new_data` |
|---|---|---|
| `INSERT` | nulo | a linha inteira, sem as colunas sensíveis |
| `DELETE` | a linha inteira, sem as colunas sensíveis | nulo |
| `UPDATE` | só as colunas que mudaram, com o valor antigo | só as colunas que mudaram, com o valor novo |

- No `UPDATE`, coluna sensível que mudou aparece nos dois lados com o texto `[sensível]`.
- `UPDATE` que não muda nenhuma coluna não grava linha.
- `house_id` vem da linha nova no `INSERT` e no `UPDATE`, e da antiga no `DELETE`.

### Privilégios

| Objeto | `api_app` | `anon`, `authenticated`, `service_role` | `PUBLIC` |
|---|---|---|---|
| `house` | `SELECT`, e `UPDATE` só em `name` | nenhum | nenhum |
| `audit_log` | `SELECT` | nenhum | nenhum |
| sequência de identidade de `audit_log.id` | nenhum | nenhum | nenhum |
| `public.current_house_id()` | `EXECUTE` | nenhum | nenhum |
| `public.audit_row()` | nenhum | nenhum | nenhum |

Todo `GRANT` vai direto para `api_app`. O papel é `NOINHERIT`, e grant dado a um grupo não
chega a ele. O revoke dos três papéis do Supabase é obrigatório mesmo com a Data API
desligada. O Supabase concede a eles todo privilégio em objeto novo de `public`, e
`service_role` ignora o RLS.

### Migrações, nesta ordem

| Arquivo | Como nasce | O que tem |
|---|---|---|
| `0001_current_house_id.sql` | `db:generate -- --custom --name=current_house_id` | a função `current_house_id` |
| `0002_house_and_audit_log.sql` | `db:generate -- --name=house_and_audit_log` | as duas tabelas, RLS e políticas, geradas de `schema.ts` |
| `0003_audit_trigger_and_grants.sql` | `db:generate -- --custom --name=audit_trigger_and_grants` | `audit_row`, o trigger de `house`, e os `GRANT` e `REVOKE` da tabela acima |

A `0001` vem antes porque a política gerada chama a função, e o `drizzle-kit` não confere
isso. Uma migração `--custom` gerada com a tabela já em `schema.ts` sai com snapshot sem
tabela. Por isso a ordem de geração é: gerar a `0001` com `schema.ts` ainda vazio, depois
declarar as tabelas, gerar a `0002`, e só então gerar a `0003`. Depois de gerar, rode
`pnpm format`.

`schema.ts` declara `house`, `audit_log`, as duas políticas com `pgPolicy`, e `api_app` com
`pgRole('api_app').existing()`. Os tipos de `drizzle-orm` 0.45.2 em `node_modules` têm
`pgPolicy`, `pgRole`, `check`, `uuid().defaultRandom()` e `generatedAlwaysAsIdentity`.
Função, trigger, `GRANT` e `REVOKE` não existem no Drizzle e ficam nas migrações
`--custom`.

### Banco de teste com a ACL do Supabase

`createTestDatabase` passa a aplicar, no banco novo e antes das migrações, os privilégios
padrão que o `dev` tem para objetos que `postgres` cria em `public`:

| Tipo de objeto | Privilégio | Para |
|---|---|---|
| tabela | todos | `anon`, `authenticated`, `service_role` |
| sequência | todos | os mesmos |
| função | `EXECUTE` | os mesmos |

Sem isso, o teste de revoke passa mesmo sem o revoke. Um banco criado por
`create database` não herda essa ACL. Os três papéis existem no cluster da imagem
`supabase/postgres:17.6.1.173`.

### Comando `db:create-house`

Script em `apps/api/package.json`, rodado como `node src/db/create-house-cli.ts`, como o
`db:migrate`.

- Lê `MIGRATION_DATABASE_URL`, `MIGRATION_DATABASE_PASSWORD`, `PROD_DUMP_DIR` e a variável
  nova `HOUSE_NAME`. Conecta como `postgres`. Resolve o alvo com `parseDatabaseUrl` de
  `apps/api/src/db/target.ts`.
- `local` e `dev`: cria a casa de nome `Casa de teste`. `HOUSE_NAME` preenchida é recusada,
  para o nome da casa real nunca ir para o `dev`.
- `prod`: exige `HOUSE_NAME` não vazia depois de `trim`, e recusa antes de pedir
  confirmação. Depois passa por `guardProdAndMigrate` de `apps/api/src/db/prod-guard.ts`,
  sem alterá-la, com a criação da casa no lugar da migração. Por isso a exportação do
  `prod` acontece antes do `insert`.
- A criação roda numa transação e só insere se `house` está vazia. Se já existe casa,
  recusa, não insere nada e sai com 1. No `prod`, a exportação já terá sido gravada. Isso
  é aceito.
- Sucesso imprime `db:create-house alvo=<alvo> casa=<nome> id=<uuid>` e sai com 0. Falha
  escreve `db:create-house falhou: <mensagem>` em `stderr` e sai com 1. A mensagem nunca
  contém a senha.
- O id gerado não vai para nenhum arquivo versionado. Isso inclui `execucao.md`: a
  evidência troca o id por `<id>`.

Interface do módulo, em `apps/api/src/db/create-house.ts`:

```ts
export const TEST_HOUSE_NAME = 'Casa de teste';

/** Nome da casa do alvo. Lança erro em pt-BR nos casos de recusa. */
export function houseNameFor(target: Target, houseNameEnv: string | undefined): string;

/** Insere a casa se `house` está vazia. Lança erro se já existe casa. */
export async function createHouseIfEmpty(options: {
  url: string;
  password: string;
  name: string;
}): Promise<{ id: string }>;
```

O `create-house-cli.ts` repete o hook de resolução de `.js` para `.ts` e o código que roda
o `pg_dump`, que hoje moram dentro de `migrate-cli.ts`. O veredito do operador proíbe
alterar `migrate-cli.ts`. A cópia é aceita, e a unificação fica na linha 10 do backlog.

### Onde cada casa nasce

| Ambiente | Quem roda | Quando |
|---|---|---|
| `local` | quem desenvolve, se quiser | a qualquer momento, depois do `db:migrate` |
| `dev` | o operador, da própria máquina, com a URL do `dev` | uma vez, depois que o workflow `Migrar o dev` aplicou as migrações desta unidade |
| `prod` | o operador, da própria máquina | uma vez, depois do `db:migrate` do `prod` |
| testes | o próprio teste, como `postgres`, depois de `createTestDatabase` | em cada arquivo de teste. Os testes não usam o comando |

## Dependências novas

Nenhuma.

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `apps/api/src/db/schema.ts` | alterar |
| `apps/api/drizzle/0001_current_house_id.sql` | criar |
| `apps/api/drizzle/0002_house_and_audit_log.sql` | criar |
| `apps/api/drizzle/0003_audit_trigger_and_grants.sql` | criar |
| `apps/api/drizzle/meta/_journal.json` | alterar |
| `apps/api/drizzle/meta/0001_snapshot.json`, `0002_snapshot.json`, `0003_snapshot.json` | criar |
| `apps/api/src/db/test-database.ts` | alterar |
| `apps/api/src/db/create-house.ts` | criar |
| `apps/api/src/db/create-house-cli.ts` | criar |
| `apps/api/package.json` | alterar, só o script `db:create-house` |
| `apps/api/.env.example` | alterar, só `HOUSE_NAME` |
| `apps/api/src/db/house.test.ts` | criar |
| `apps/api/src/db/audit.test.ts` | criar |
| `apps/api/src/db/create-house.test.ts` | criar |
| `README.md` | alterar, seção `Banco de dados` |

## Fora deste contrato

- `person`, `residency`, `user_profile` e qualquer tabela do M3 em diante, inclusive em
  migração. Tabela de exemplo só existe dentro do banco de teste.
- Código da API, conexão da API ao banco e escolha de como o driver prende a transação.
  Isso é M2.
- Alterar `migrate-cli.ts`, `migrate.ts`, `prod-guard.ts`, `target.ts`, o workflow
  `migrate-dev.yml`, o `ci.yml` ou a migração `0000_api_role.sql`.
- `revoke temporary on database`, `FORCE ROW LEVEL SECURITY` e qualquer extensão.
- Função de uuid v7 ou outro gerador de id. A troca futura está na linha 9 do backlog.
- `UPDATE` de `house` em coluna que não seja `name`. Colunas de configuração da casa são
  do M5.
- Rodar `db:create-house` na CI.
- Qualquer escrita no `dev` ou no `prod` antes do merge na `main`.

## Definition of Done

Os itens 1 a 8 se provam na branch. Os itens 9 e 10 se provam depois do merge na `main`.
A unidade fica `em revisão` até os dois terem evidência.

Cada teste de RLS abre a transação, grava `app.house_id` com `set_config(..., true)` e
consulta sem filtro de casa. Os testes com `api_app` usam `connectAsApiRole`, que abre uma
conexão só. Por isso a transação seguinte reaproveita a mesma conexão.

Os itens 3 e 5 usam uma tabela `audit_probe`, criada pelo teste dentro do banco de teste e
nunca em migração. Ela tem `id uuid`, `house_id uuid` com FK para `house`, `label text` e
`secret text`. Tem RLS com uma política `for all` para `api_app`, com `using` e
`with check` em `house_id = public.current_house_id()`. Tem `SELECT`, `INSERT`, `UPDATE` e
`DELETE` para `api_app`, e o trigger `audit_row('house_id', 'secret')`.

| # | Item | Como verificar | Teste |
|---|---|---|---|
| 1 | Num banco vazio, as migrações criam `house` e `audit_log` com as colunas, tipos e restrições da seção de interfaces, e as duas funções. `db:generate` rodado depois não cria migração nova | `pnpm --filter @casa/api test`. depois de `pnpm --filter @casa/api db:generate -- --name=vazio`, `git status --short apps/api/drizzle` não mostra arquivo novo | `house.test.ts` |
| 2 | Com `api_app`, sem `app.house_id`, `house` e `audit_log` devolvem zero linhas. Com a casa A, só a casa A aparece. Na transação seguinte da mesma conexão, sem `set_config`, zero linhas e nenhum erro. Com valor que não é uuid, erro `invalid input syntax for type uuid`. Com uuid inexistente, zero linhas | idem | `house.test.ts` |
| 3 | Com `api_app` na casa A: `UPDATE` de `name` da casa A altera 1 linha. O mesmo `UPDATE` na casa B altera 0. `UPDATE` de `id` ou `created_at`, `INSERT` e `DELETE` em `house` dão `permission denied`. `INSERT`, `UPDATE`, `DELETE` e `TRUNCATE` em `audit_log` dão `permission denied`. `select public.audit_row()` dá `permission denied`. `INSERT` em `audit_probe` com `house_id` da casa B, e `UPDATE` que muda `house_id` para a casa B, dão `new row violates row-level security policy` | idem | `house.test.ts` |
| 4 | O banco de teste reproduz a ACL do Supabase: uma tabela que o teste cria em `public` como `postgres` dá `SELECT` a `anon`. Mesmo assim, `has_table_privilege`, `has_sequence_privilege` e `has_function_privilege` dão `false` para `anon`, `authenticated` e `service_role` em todos os objetos da tabela de privilégios | idem | `house.test.ts` |
| 5 | A auditoria segue a regra do conteúdo. `INSERT`, `UPDATE` e `DELETE` em `house` gravam uma linha cada, com `table_name`, `row_id`, `operation` e `house_id` certos. No `UPDATE`, só a coluna alterada. `UPDATE` sem mudança não grava linha. Em `audit_probe`, `secret` não aparece no `INSERT` nem no `DELETE`, e aparece como `[sensível]` no `UPDATE`. `db_role` é `api_app` na ação de `api_app` e `postgres` na do admin. `actor_user_id` recebe `app.actor_user_id` quando gravado, e fica nulo quando não. `api_app` lê só a auditoria da própria casa | idem | `audit.test.ts` |
| 6 | Como `api_app`, com um domínio `pg_temp.jsonb` e um `pg_temp.uuid`, cada um com um `check` que chama uma função de `pg_temp` que lança erro quando `current_user` é `postgres`, o `UPDATE` de `name` termina, grava a auditoria, e a leitura de `house` continua filtrando pela casa | idem | `audit.test.ts` |
| 7 | `delete` de uma casa que tem linha em `audit_log`, rodado como `postgres`, falha com violação da FK `audit_log_house_id_fkey` | idem | `audit.test.ts` |
| 8 | `db:create-house`: `houseNameFor` devolve `Casa de teste` no `local` e no `dev`, recusa `HOUSE_NAME` preenchida neles, e no `prod` recusa `HOUSE_NAME` ausente ou em branco. `createHouseIfEmpty` num banco de teste cria a casa e grava a linha de auditoria com `db_role = postgres`. A segunda chamada lança erro e não insere. O comando rodado como processo contra um banco de teste imprime a linha de sucesso e sai com 0. Na segunda vez, escreve em `stderr` e sai com 1 | idem | `create-house.test.ts` |
| 9 | Depois do merge: o workflow `Migrar o dev` aplicou as migrações. No `dev`, `__drizzle_migrations` tem 4 linhas, os três papéis não têm privilégio nenhum em `house` e `audit_log`, e `house` tem uma linha só, `Casa de teste`, criada pelo comando. Pelo pooler, `api_app.<ref>` vê `session_user = api_app`, zero linhas sem `app.house_id`, e uma com o id da casa de teste | log do run. Consulta pelo MCP somente leitura. Saída do `psql` rodado pelo operador, com o id trocado por `<id>` | verificação manual |
| 10 | O operador migrou o `prod` e rodou `db:create-house` nele. As duas exportações existem, cada uma com horário anterior à ação que a seguiu. `house` do `prod` tem uma linha só, com o nome dado pelo operador | saídas dos dois comandos e `ls -l` das exportações, coladas pelo operador, com o id trocado por `<id>` | verificação manual |

O DoD geral em `docs/fase 1/dod.md` vale por cima deste. Os itens G3 e G4 passam a valer
com esta unidade. Pelo G4, `house` é auditada porque é cadastro, e `audit_log` não é
auditada porque ninguém a altera.

O `README.md`, seção `Banco de dados`, ganha: como cada casa nasce, na tabela acima; o
comando `db:create-house` com as variáveis de cada ambiente; e a regra para a tabela nova
do M3, em uma linha de trigger e uma política com `using` e `with check`. Isso cobre I1 e
I2.

## Riscos

| Risco | Sinal de que aconteceu | O que fazer |
|---|---|---|
| a `0003` esquece um revoke | item 4 falha | corrigir na `0003`, que ainda não está na `main` |
| a ordem de geração sai errada | a `0001` tem snapshot com tabela, ou o item 1 gera migração nova | apagar as migrações da branch e gerar de novo na ordem do contrato |
| `alter default privileges` no banco de teste falha porque um dos três papéis não existe no cluster | erro em `createTestDatabase` | parar e reportar ao condutor. Não remover a ACL do teste |
| o driver `postgres` não expõe transação que prenda `set_config` e consulta na mesma conexão | o teste do item 2 não consegue montar o caso | usar `begin` e `commit` pelo `unsafe`, como `connectAsApiRole` já faz. Se nem isso servir, parar e reportar |
| o linter muda na `M1.7-lint` durante a execução | `pnpm -r lint` roda outra ferramenta depois de um rebase | seguir o que a `main` tiver. Não mexer em configuração de lint |
| `session_user` pelo pooler não é `api_app` | item 9 mostra outro papel | parar. É pergunta ao operador, porque `db_role` perde o sentido |
| já existe casa no `dev` antes do comando | item 9 mostra mais de uma linha, ou o comando recusa | parar e reportar. Nada se apaga à mão |

## Depende de

`M1.2-ambientes-e-migracoes`, fechada em 2026-09-21.

## Teste de auto-suficiência

> Um executor que leu só este contrato, as regras do repositório e os arquivos nomeados
> acima consegue entregar sem fazer nenhuma pergunta?

Resposta: `sim` · Verificado em: `2026-09-22`

## Decisões do condutor

O veredito do operador deixou três pontos para o condutor. A exploração deixou mais dois.

| Ponto | Decisão | Consequência |
|---|---|---|
| comando rodado com casa já existente | recusa, sem inserir, e sai com 1 | rodar de novo é seguro. Trocar a casa de um ambiente é trabalho manual e fora do escopo |
| exportar o `prod` antes do `insert` | sim, porque o comando reusa `guardProdAndMigrate` sem mudá-la | o `prod` ganha uma segunda exportação, minutos depois da do `db:migrate` |
| de onde o comando roda no `dev` | da máquina do operador, uma vez | nenhum workflow novo. Nenhum segredo novo na CI |
| como o teste vê a ACL do Supabase, opção A da exploração | `createTestDatabase` aplica a ACL padrão do `dev` | três linhas de ACL copiadas para o teste. Se o Supabase mudar a ACL, o item 9 mostra a diferença |
| onde fica a expressão da casa corrente | numa função auxiliar, `current_house_id` | o M2 troca o mecanismo com um `create or replace`, sem tocar em política |

## Perguntas ao operador

Nenhuma. As sete perguntas da exploração estão decididas no veredito de 2026-09-22.

## Aprovação

O operador aprovou o contrato inteiro em 2026-09-22, sem ressalva. A aprovação inclui as
cinco decisões do condutor da seção anterior.

## Alterações

Só para contrato já aprovado que mudou. Cada linha exige novo GATE 1.

| Data | O que mudou | Motivo | Reaprovado em |
|---|---|---|---|
