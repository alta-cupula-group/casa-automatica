> Unidade: `M1.3-house-e-auditoria` · Marco: `M1 · Banco` · Trilha: `dividida`
> Estado: contrato em rascunho
> Explorador · Ferramenta: `Claude Code, modelo claude-opus-5` · Data: `2026-09-22`

# Exploração — `M1.3-house-e-auditoria`

## Resumo

1. A casa corrente chega pela variável `app.house_id`, gravada com `set_config(..., true)` dentro da transação. Os três casos da ordem falham fechados: ausente, inválido e conexão reaproveitada. O estilo `auth.uid()` não serve ao `api_app`, porque `postgres` não consegue lhe conceder o schema `auth`.
2. Os grants, o `WITH CHECK` e a auditoria imutável foram provados por teste. `api_app` não grava na auditoria. Quem grava é o trigger, com `SECURITY DEFINER`.
3. **Achado grave.** Com `SET search_path = ''`, `api_app` roda código como `postgres` por um tipo temporário. A função precisa de `SET search_path = pg_catalog, pg_temp`.
4. **Achado grave.** No `dev`, tabela nova de `public` nasce com todos os privilégios para `anon`, `authenticated` e `service_role`, e o `service_role` ignora o RLS. O banco de `createTestDatabase` não reproduz isso. A migração precisa revogar, e o teste local passa pelo motivo errado.
5. O `drizzle-kit` 0.31.10 gera tabela, RLS e política. Função, trigger, `GRANT` e `REVOKE` vão em migração `--custom`, numa ordem de três arquivos.
6. A FK da auditoria para `house` impede apagar uma casa auditada.
7. O operador decidiu as sete perguntas em 2026-09-22. O veredito está no fim do documento.

## Respostas

Todos os testes rodaram num container descartável da imagem `supabase/postgres:17.6.1.173`, fora do repositório. O banco `p1` foi criado com `create database`, como faz `createTestDatabase`. O protótipo está no material bruto, bloco M1. As consultas ao `dev` passaram pelo MCP com `read_only=true`, conectado como `supabase_read_only_user`.

### P1 — Como a política de RLS sabe qual é a casa corrente?

**Resposta:** a opção A resolve os três casos. A opção B não resolve com `auth.uid()`, e com claim próprio só repete a A com JSON no meio.

**Opção A.** A API abre a transação e roda `set_config('app.house_id', <id>, true)`. A política chama uma função auxiliar que lê a variável.

| Caso | O que aconteceu | Bloco |
|---|---|---|
| variável ausente, conexão nova | zero linhas em `house` e em `demo_item` | E-A1 |
| valor que não é uuid | erro `invalid input syntax for type uuid` e a transação aborta | E-A4 |
| uuid que não existe | zero linhas | E-A4 |
| conexão reaproveitada depois da casa A | zero linhas | E-A3 |
| `set_config` local fora de transação | vale só para o próprio comando. O comando seguinte vê zero linhas | E-A7 |
| transação da casa A que falhou | zero linhas depois do `rollback` | E-A6 |
| `set_config(..., false)`, escopo de sessão | a casa B vaza para a transação seguinte | E-A5 |

A documentação diz que `current_setting` com `missing_ok` devolve `NULL` quando a variável não existe. Depois de um `set_config` local, porém, a variável volta como texto vazio, não como `NULL`. Por isso a leitura precisa de `nullif(..., '')`. Sem ele, a conexão reaproveitada quebra com `invalid input syntax for type uuid: ""`. Isso não está na documentação e foi visto no teste E-A3.

**Opção B.** A política lê `request.jwt.claims`, no estilo do Supabase.
- `auth.uid()` lê só o `sub` do usuário. Ele não diz a casa. Precisaria de uma tabela que ligue usuário a casa, que só nasce no M3.
- `api_app` não tem `USAGE` no schema `auth`. `postgres` tenta conceder e recebe `no privileges were granted`. O `dev` tem a mesma ACL. Bloco E-B5 e bloco D2.
- O banco de `createTestDatabase` nem tem o schema `auth`. Bloco P7-1.
- Com um claim próprio `house_id` no JSON, os casos se comportam como na A. JSON quebrado é erro, claim ausente é zero linhas. Bloco E-B1 a E-B4. O custo é montar e analisar JSON a cada requisição, sem ganho.

**Custo para o M2.** Na opção A, toda consulta da API roda dentro de uma transação que começa com `set_config`. Consulta fora de transação não vê nada, o que falha fechado. O pool do driver precisa entregar a mesma conexão para o `set_config` e para a consulta. Com o driver `postgres`, isso quer dizer usar a transação do driver. Isso é hipótese: não conferi a API do driver nos tipos. Na opção B, o custo é o mesmo mais o JSON.

**Limite do mecanismo.** `api_app` grava qualquer valor em `app.house_id`. O RLS protege contra consulta sem filtro, que é o que pede o brief, seção 3.5. Ele não protege contra uma API comprometida.

**Confiança:** fato verificado no Postgres local. O comportamento pelo pooler do `dev` não foi testado.

### P2 — O que o `api_app` pode fazer em `house` e na auditoria?

**Resposta:** proposta de grants, testada no bloco E-C:

| Tabela | `api_app` recebe | Não recebe |
|---|---|---|
| `house` | `SELECT`, e `UPDATE` só nas colunas que o operador liberar. Ver PO3 | `INSERT`, `DELETE`, `TRUNCATE`, `UPDATE` de `id` |
| auditoria | `SELECT` | `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE` |
| função do trigger | nada | `EXECUTE` |

Resultado do teste como `api_app`, com a casa A:

| Ação | Resultado |
|---|---|
| `UPDATE house` da própria casa | `UPDATE 1` |
| `UPDATE house` da casa B pelo id | `UPDATE 0`, em silêncio |
| `INSERT` em tabela com `house_id` da casa B | `new row violates row-level security policy` |
| `UPDATE` que muda o `house_id` para a casa B | o mesmo erro |
| `INSERT`, `DELETE` e `UPDATE` de `id` em `house` | `permission denied for table house` |
| `UPDATE`, `DELETE`, `INSERT` e `TRUNCATE` na auditoria | `permission denied for table audit_log` |
| chamar a função do trigger direto | `permission denied for function audit_row` |

A documentação de `CREATE POLICY` confirma a diferença. `USING` falso esconde a linha em silêncio. `WITH CHECK` falso é erro. Por isso toda política de escrita precisa das duas cláusulas.

`api_app` é `NOINHERIT`. Grant dado a um papel de grupo não chega a ele: a leitura dá `permission denied`. Só chega com `SET ROLE`. Bloco E-D1. Todo `GRANT` vai direto para `api_app`.

O `USAGE` em `public` já vem do `PUBLIC`, tanto no banco de teste quanto no `dev`. O `api_app` não precisa de grant de schema. O `dev` devolveu `has_schema_privilege('api_app','public','USAGE') = true`.

**Confiança:** fato verificado.

### P3 — Qual forma a tabela de auditoria precisa ter?

**Resposta:** colunas propostas, todas testadas no protótipo:

| Coluna | Tipo | Para quê |
|---|---|---|
| `id` | `bigint generated always as identity` | ordem de gravação |
| `house_id` | o tipo da chave de `house`, `not null`, FK | RLS de leitura. Ver PO6 |
| `table_name` | `text not null` | o quê: tabela |
| `row_id` | `text not null` | o quê: linha |
| `operation` | `text not null`, `check` em `INSERT`, `UPDATE`, `DELETE` | o quê: ação |
| `old_data`, `new_data` | `jsonb` | o quê: valores. Ver PO4 |
| `actor_user_id` | `uuid`, nulo | quem: usuário do Supabase Auth |
| `db_role` | `text not null` | quem: papel do banco |
| `occurred_at` | `timestamptz not null default now()` | quando |
| `transaction_id` | `bigint not null` | agrupa as linhas de uma mesma ação |

**Quem, até o M3.** O trigger grava duas coisas:
- `db_role` vem de `session_user`. Dentro de `SECURITY DEFINER`, `current_user` é o dono da função. `session_user` continua sendo quem conectou. O teste gravou `api_app` nas ações da API e `postgres` nas da migração.
- `actor_user_id` vem de `app.actor_user_id`, uma segunda variável de transação que a API grava junto com a casa. Hoje nada grava, e a coluna fica nula. O `sub` do JWT é o id do Supabase Auth, que já existe antes do M3.

**Como muda no M3 sem editar migração.** Uma migração nova faz `alter table ... add column actor_person_id` e `create or replace function` da função do trigger. O trigger guarda o oid da função, e `create or replace` mantém o oid. As tabelas já auditadas passam a gravar a coluna nova sem tocar no trigger. O `revoke` também se mantém. Bloco E-D3. Alternativa sem mudar nada: o M3 liga `actor_user_id` a `user_profile` por consulta.

`actor_user_id` fica sem FK. `auth.users` não existe no banco de teste. Uma FK para lá quebraria `createTestDatabase`.

**Confiança:** fato verificado.

### P4 — Como o trigger fica reaproveitável?

**Resposta:** uma função genérica e uma linha por tabela.

```sql
create trigger audit after insert or update or delete on public.<tabela>
  for each row execute function public.audit_row();
create trigger audit after insert or update or delete on public.house
  for each row execute function public.audit_row('id');
```

O argumento diz qual coluna tem a casa. O padrão é `house_id`. Em `house`, a coluna é `id`. A função lê a linha com `to_jsonb`, então serve a qualquer tabela com `id` e com a coluna da casa. O corpo completo está no bloco M1.

**`SECURITY DEFINER`: sim.** Sem ele, `api_app` precisaria de `INSERT` na auditoria. Com esse grant, a API forja linha de auditoria direto. Com ele, a função grava como o dono, `postgres`, e `api_app` não tem grant nenhum de escrita.

**`search_path`: `pg_catalog, pg_temp`, nunca vazio.** Teste do bloco E-H:
- com `SET search_path = ''`, `api_app` cria um domínio `pg_temp.jsonb` com uma função própria no `check`. Ao disparar o trigger, essa função roda como `postgres`. A saída foi `código de api_app rodando como postgres`;
- com `SET search_path = pg_catalog, pg_temp`, o mesmo ataque não pega e o `UPDATE` grava a auditoria.

A documentação do Postgres 17 explica. Se `pg_temp` não está no caminho, ele é buscado primeiro, antes de `pg_catalog`, para tabela e tipo. A seção sobre `SECURITY DEFINER` manda pôr `pg_temp` por último. O `postgres` tem `BYPASSRLS` e `CREATEROLE`, então a falha daria ao `api_app` tudo que o RLS tira.

A função auxiliar da casa corrente também é afetada. Ela é `SECURITY INVOKER`, então não escala privilégio, mas um tipo temporário a faz falhar. O corpo qualifica o tipo como `pg_catalog.uuid` e não leva `SET`. `SET` numa função SQL impede que ela seja expandida dentro da consulta. Isso é hipótese: não medi.

**`house` é auditada?** Proposta: sim. `house` é cadastro, e o item G4 cobre cadastro. O nome da casa é editável se o operador liberar na PO3. A consequência está na PO6.

**Confiança:** fato verificado, menos a nota sobre expansão da função SQL.

### P5 — O Drizzle declara RLS, política e trigger, e o `drizzle-kit` gera?

**Resposta:** declara e gera RLS e política. Trigger, função e grant, não.

| Recurso | `drizzle-orm` 0.45.2 | `drizzle-kit` 0.31.10 gera |
|---|---|---|
| RLS na tabela | `.enableRLS()` na tabela. Uma tabela com `pgPolicy` já sai com RLS ligado sem ele | `ENABLE ROW LEVEL SECURITY` |
| política | `pgPolicy` com `as`, `for`, `to`, `using`, `withCheck` | `CREATE POLICY` |
| papel existente | `pgRole('api_app').existing()` | nada, como deve |
| função | não existe | não |
| trigger | não existe em `pg-core` | não |
| `GRANT` e `REVOKE` | não existe | não |
| `FORCE ROW LEVEL SECURITY` | não achei | não |

Evidência dos tipos e do gerador no bloco P5. O `generate` num projeto de rascunho, com `house` e política, gerou exatamente as três instruções esperadas. Sem `entities.roles` no config, nada de `CREATE ROLE`.

**`--custom` repete o snapshot anterior.** Uma migração `--custom` gerada com `house` já no `schema.ts` tem snapshot sem tabela. O `generate` seguinte cria `house`. Isso define a ordem:

| Arquivo | Como nasce | O que tem |
|---|---|---|
| `0001_<nome>` | `--custom` | a função auxiliar da casa corrente |
| `0002_<nome>` | `generate` a partir do `schema.ts` | `house`, auditoria, RLS e políticas |
| `0003_<nome>` | `--custom` | função do trigger, triggers, `GRANT`, `REVOKE` |

A política gerada cita a função auxiliar, e o `drizzle-kit` não confere. Por isso a auxiliar vem antes. Outra forma: escrever a expressão inteira dentro de cada política e dispensar o `0001`. O custo aparece quando o mecanismo mudar: cada política de cada tabela vai precisar de migração.

O `migrate()` do `drizzle-orm` aplica todas as pendentes numa transação só. As três entram juntas ou nenhuma entra. Arquivo `pg-core/dialect.js`, linha 60.

**Confiança:** fato verificado.

### P6 — Como cada casa nasce no seu ambiente?

**Resposta:** três caminhos comparados. Nenhum foi testado nos ambientes, porque `dev` é só leitura e `prod` está fora do alcance.

| Caminho | Como funciona | Custo |
|---|---|---|
| migração que insere | a mesma migração roda nos três ambientes | põe a mesma casa em `dev` e `prod`, contra o brief, seção 3.4. Separar por ambiente dentro do SQL exige um sinal no banco que não existe hoje. Os dois bancos se chamam `postgres` |
| script separado por ambiente | um comando novo, como `db:create-house`, lê o alvo pela URL com `resolveTarget`. `local` e `dev` criam a casa de teste. `prod` cria a casa real, com a mesma trava de confirmação | código novo e teste novo. O `db:migrate` e a trava do `prod` não mudam |
| passo manual no `README.md` | um `insert` rodado uma vez como `postgres` | sem teste. O item G1 diz que nada se altera pelo painel. Isso fala de schema, mas a leitura larga pega o passo |

**Teste local e CI.** O teste cria as próprias casas, como `postgres`, depois de `createTestDatabase`. É o que o protótipo fez. A CI roda os mesmos testes. Nenhum caminho acima serve ao teste, e nenhum precisa servir.

**Dados da casa real que dependem do operador:** o nome, e se o id é fixo e conhecido ou gerado na hora. Ver PO1 e PO2. O resto da casa, como periodicidade de fechamento, é do M5.

**Confiança:** hipótese de desenho. Nada rodou em `dev` ou `prod`.

### P7 — O que o Supabase concede sozinho numa tabela nova de `public`?

**Resposta:** no banco `postgres`, tudo para `anon`, `authenticated` e `service_role`. No banco de teste, nada.

Pelo MCP, o `dev` tem em `pg_default_acl`, para `public`:

| Tipo | Quem recebe |
|---|---|
| tabela | `arwdDxtm` para `postgres`, `anon`, `authenticated` e `service_role` |
| função | `EXECUTE` para os mesmos quatro |
| sequência | `rwU` para os mesmos quatro |

A imagem local tem a mesma ACL no banco `postgres`. Uma tabela criada ali recebeu os sete privilégios para cada papel. Bloco P7-2 e E-E1.

Com RLS ligado e sem política para eles:
- `anon` e `authenticated` leem zero linhas e alteram zero linhas;
- `service_role` lê todas as casas, porque tem `BYPASSRLS`.

A documentação do Supabase sobre RLS diz o mesmo. Uma tabela nova de `public` nasce com todo privilégio para os três papéis, e política não tira o grant.

**Precisa revogar, mesmo com a Data API desligada.**
- `service_role` ignora o RLS. Se a Data API for ligada um dia, a chave secreta lê tudo.
- `postgres` é membro de `anon`, `authenticated` e `service_role` com `SET`. Quem conecta como `postgres` troca para eles.
- A migração faz `revoke all on <tabela> from anon, authenticated, service_role`. Depois disso, `service_role` recebe `permission denied`. Bloco E-E3.
- Na função do trigger, `revoke ... from public` não basta. O `EXECUTE` foi dado por nome aos três papéis. O revoke precisa nomeá-los. A função de trigger não roda chamada direto, então isso é limpeza, não brecha. Bloco E-F.

**O banco de teste não reproduz nada disso.** `pg_default_acl` é por banco. O banco de `createTestDatabase` nasce de `template1`, sem a ACL. Um teste que confere "anon não tem grant" passa lá mesmo sem o `revoke`. Ver Achados, item 2.

**Confiança:** fato verificado no `dev` e na imagem.

### P8 — Algo passa local e falha no `dev` ou no `prod`?

**Resposta:**

| Ponto | Local, banco de teste | `dev` | Consequência |
|---|---|---|---|
| privilégio padrão em `public` | nenhum | tudo para três papéis | teste de grant passa pelo motivo errado |
| event triggers do Supabase | nenhum | seis, como `pgrst_ddl_watch` | o protótipo inteiro rodou sem erro no banco `postgres` da imagem, que os tem. Bloco E-E |
| schema `auth` | não existe | existe | qualquer referência a `auth` quebra o teste |
| dono dos objetos | `postgres` | `postgres`, que migra | igual. `postgres` não é superusuário nos dois |
| `postgres` e `api_app` | `ADMIN` sem `INHERIT` e sem `SET` | `postgres` é membro de `api_app` | igual. `postgres` não vira `api_app` |
| extensão | `gen_random_uuid` existe em `pg_catalog` | idem, e `pgcrypto` em `extensions` | a migração não precisa de extensão |
| versão | Postgres 17.6 x86_64 | Postgres 17.6 aarch64 | nada visto |

O que só se prova depois do merge, como os itens 9 e 10 da `M1.2`:
- o `migrate-dev.yml` aplica as três migrações no `dev`;
- no `dev`, as tabelas novas não têm grant para `anon`, `authenticated` e `service_role`. Uma consulta pelo MCP com `has_table_privilege` prova;
- no `dev`, `api_app.<ref>` pelo pooler vê só a casa de teste com `app.house_id` e zero linhas sem ela. Depende da senha do `api_app` no `dev`, passo manual da `M1.2`;
- `session_user` pelo pooler é `api_app`. A `M1.2` viu `current_user = postgres` pelo pooler com o usuário `postgres.<ref>`, o que sugere que o login chega inteiro. É hipótese para `api_app`;
- o `prod` recebe as migrações da máquina do operador e ganha a casa real.

**Confiança:** fato verificado para as linhas da tabela. Hipótese para `session_user` pelo pooler.

## Superfície

| Arquivo ou recurso | Existe hoje | O que muda |
|---|---|---|
| `apps/api/src/db/schema.ts` | sim, vazio | ganha `house`, auditoria, `pgRole` existente e políticas |
| `apps/api/drizzle/0001_*.sql` | não | `--custom`, função auxiliar |
| `apps/api/drizzle/0002_*.sql` | não | gerado, tabelas e políticas |
| `apps/api/drizzle/0003_*.sql` | não | `--custom`, auditoria, grants e revokes |
| `apps/api/drizzle/meta/` | sim | três snapshots e o journal |
| `apps/api/src/db/test-database.ts` | sim | talvez, para reproduzir a ACL do Supabase. Ver Opções |
| script de casa por ambiente | não | só se a PO5 escolher o script |
| `README.md` | sim | como cada casa nasce |
| `apps/api/drizzle/0000_api_role.sql` | sim | nada |
| `apps/api/src/db/migrate-cli.ts` | sim | nada |

## Achados não previstos

### 1. `search_path` vazio em `SECURITY DEFINER` dá `postgres` ao `api_app`

Visto na P4. O Supabase costuma recomendar `set search_path = ''`. Isso é hipótese de memória, não conferi. Neste banco, o `api_app` tem `TEMP` no banco pelo `PUBLIC`. Com o caminho vazio, o `pg_temp` dele entra primeiro na busca de tipo. O contrato precisa fixar `pg_catalog, pg_temp` e um teste que repita o ataque. Outra defesa: `revoke temporary on database postgres from public`. Isso muda o banco inteiro e não testei o efeito no Supabase.

### 2. `createTestDatabase` não é o banco do Supabase

O banco `postgres` da imagem tem privilégio padrão, schema `auth` e event triggers. O banco criado pelo teste não tem nenhum dos três. Hoje isso não importava, porque não havia tabela. A partir desta unidade, teste de grant e de RLS contra `anon` e `service_role` só vale onde a ACL existe. Opções na seção seguinte.

### 3. A FK da auditoria impede apagar a casa

`postgres` tentou apagar uma casa auditada. O trigger de `DELETE` grava uma linha que aponta para a casa que acabou de sair, e a FK recusa: `violates foreign key constraint "audit_log_house_id_fkey"`. Bloco E-D2. Com FK, casa nunca se apaga. Sem FK, a auditoria sobrevive à casa. Com `on delete cascade`, apagar a casa apaga a própria auditoria. PO6.

### 4. Texto vazio, não `NULL`, depois de `set_config` local

Visto na P1. Sem `nullif`, a primeira requisição numa conexão reaproveitada quebra. Um teste do contrato precisa cobrir a conexão reaproveitada, não só a conexão nova.

### 5. O `auth.uid()` da imagem lê `request.jwt.claim.sub`

A definição instalada é `nullif(current_setting('request.jwt.claim.sub', true), '')::uuid`. Registro porque a ordem citou o estilo `auth.uid()`. A opção B não depende dele.

### 6. A leitura pelo MCP ignora o RLS

Já registrado na `M1.2`, item 10. Confirmado de novo: `supabase_read_only_user` tem `BYPASSRLS`. A prova de RLS no `dev` não pode ser feita pelo MCP. Ela precisa conectar como `api_app`.

### 7. Linha proposta para o backlog: chave ordenada pelo tempo

Pedido do operador em 2026-09-22. O explorador não escreve no backlog. O condutor copia esta linha para `docs/fase 1/backlog.md`, com o próximo número livre:

| # | O que | De onde veio | Por que ficou fora |
|---|---|---|---|
| 9 | Avaliar chave uuid v7 nas tabelas de alto volume, se ordenar pela chave virar gargalo. O caminho é o `uuidv7()` nativo, quando o Supabase oferecer Postgres 18. Tabela nova nasce com `default uuidv7()`. Tabela existente troca só o `default` numa migração nova, e os ids antigos continuam válidos. Gatilho para abrir: consulta lenta ou índice grande medido numa tabela real, não hipótese. | `M1.3-house-e-auditoria`, PO1, pedido do operador em 2026-09-22 | O Postgres 17 do `dev` e do `prod` não gera v7. A função própria testada deixou o índice maior que o do v4 numa carga em lote. Com o volume de uma casa, nenhuma diferença é visível. Evidência no material bruto, bloco PO1-X |

Trocar o id das linhas que já existem também é possível, por uma migração de backfill. Testado no bloco PO1-Y a pedido do operador em 2026-09-22:
- o id novo sai de `created_at`, então as linhas antigas ficam na ordem em que nasceram;
- a FK com `on update cascade` leva o id novo para as tabelas filhas. Sem ela, o `update` falha. A regra da FK se troca depois, numa migração nova, sem decidir nada agora;
- o trigger grava uma linha de auditoria por linha trocada, com o id antigo e o novo. A própria auditoria vira a tabela de correspondência;
- as linhas antigas da auditoria continuam com o id antigo, porque a auditoria é imutável. O histórico de uma linha passa a seguir a correspondência.

O que o teste não cobre, e é hipótese: tabela com trigger que bloqueia `UPDATE`, como o ledger imutável do M4; id guardado fora do banco, em URL, feed ICS ou sessão da API.

## Opções

### Para o achado 2: como o teste vê a ACL do Supabase

#### Opção A — o teste recria a ACL
`createTestDatabase` roda, antes das migrações, os mesmos `alter default privileges` que o `dev` tem. Custo: copiar seis linhas de ACL do Supabase para o código de teste, que podem divergir se o Supabase mudar. Consequência: o teste de grant falha sem o `revoke`, como deve.

#### Opção B — um teste migra o banco `postgres` da imagem
Um teste, ou um passo da CI, aplica as migrações no banco `postgres` do container, que já tem ACL, `auth` e event triggers. Custo: o banco não é descartável, e dois arquivos de teste não podem usá-lo ao mesmo tempo. Consequência: paridade real com o `dev`.

#### Opção C — só a prova depois do merge
O teste local confere o grant de `api_app`. A falta de grant de `anon` e `service_role` se prova pelo MCP no `dev`. Custo: o erro aparece depois do merge. Consequência: nada muda nos testes.

### Para a P1: onde fica a expressão da casa corrente

#### Opção A — função auxiliar, `0001` à mão
Custo: uma migração a mais. Consequência: o M2 troca o mecanismo com um `create or replace`.

#### Opção B — expressão inteira em cada política
Custo: mudar o mecanismo exige alterar cada política. Consequência: duas migrações em vez de três.

## Não descoberto

- O comportamento pelo pooler do `dev`. O explorador não tem a senha do `api_app` no `dev` e a ordem só permite leitura.
- Como o driver `postgres` 3.4.9 prende `set_config` e consulta na mesma conexão. É do M2 e não li os tipos.
- Se o custo de expandir a função auxiliar dentro da consulta importa. Não medi.
- Se os projetos Supabase criados em 2026-09-16 recebem uma ACL diferente da de projetos antigos. A documentação fala em "existing projects". O `dev` mostrou a ACL completa, então hoje não importa.

## Riscos vistos daqui

| Risco | Sinal |
|---|---|
| a função do trigger sai com `search_path = ''` | o teste do domínio temporário imprime `rodando como postgres` |
| a migração esquece o `revoke` de `anon`, `authenticated` e `service_role` | `has_table_privilege('service_role', 'public.house', 'SELECT')` devolve `true` no `dev` |
| teste de grant roda só no banco de `createTestDatabase` | teste verde com o `revoke` removido |
| a política lê a variável sem `nullif` | segunda transação numa mesma conexão falha com `invalid input syntax for type uuid: ""` |
| política de escrita sem `WITH CHECK` | `INSERT` com `house_id` de outra casa passa |
| grant dado a papel de grupo | `api_app` recebe `permission denied` |
| `schema.ts` e migração `--custom` divergem | `db:generate` seguinte gera `CREATE TABLE` de tabela que já existe |
| M2 usa `set_config(..., false)` | a casa de uma requisição vaza para a seguinte na mesma conexão |

## Perguntas ao operador

### PO1 — Qual é o tipo da chave de `house`?
Por que importa: toda tabela do M3 em diante copia o tipo em `house_id`, e a variável `app.house_id` faz cast para ele.
Opções:
- **A** — `uuid` com `gen_random_uuid()` · custo: 16 bytes por linha · consequência: id não adivinhável, sem extensão, testado neste relatório.
- **B** — `bigint generated always as identity` · custo: id sequencial e adivinhável, e a sequência é diferente em `dev` e `prod` · consequência: 8 bytes, id legível.
- **C** — `text` com um nome curto, como `casa-real` · custo: validação de formato à mão · consequência: legível em log, mas renomear custa caro.
- **D** — `uuid` versão 7, gerado por função própria · custo: o Postgres 17 não gera v7, então a migração cria a função. A versão ingênua, sem contador dentro do milissegundo, deixou o índice maior que o do v4 numa carga em lote. O id revela o milissegundo em que a linha nasceu · consequência: id ordenado pelo tempo. Quando o Supabase chegar ao Postgres 18, uma migração nova troca o `default` para `uuidv7()`.
- **E** — snowflake em `bigint` · custo: gerador próprio com época, número de máquina e sequência. O id passa de `2^53`, e o driver `postgres` o devolve como texto, então API, OpenAPI e frontend tratam o id como string · consequência: 8 bytes e ordem pelo tempo. Resolve geração distribuída, que esta casa não tem.
Recomendação do explorador: A. Pedido do operador em 2026-09-22 para comparar D e E, registrado no material bruto, bloco PO1-X. Na mesma data o explorador acrescentou uma proposta de convenção para as tabelas seguintes. Ela não é decisão desta unidade: uuid v4 em entidade cujo id sai do banco, e `bigint generated always as identity` em tabela interna de alto volume cujo id nunca sai do banco, como a auditoria.

### PO2 — Qual é o nome da casa real, e o id dela é fixo?
Por que importa: o `prod` só guarda a casa real, e quem a cria precisa desses dados.
Opções:
- **A** — nome dado pelo operador, id gerado na criação · custo: o id do `prod` só se conhece depois · consequência: nada fixo no repositório.
- **B** — nome e id fixos, escritos no repositório · custo: o id da casa real fica público, porque o repositório é público · consequência: script e documentação citam o id.
Recomendação do explorador: A. O id não precisa estar no repositório.

### PO3 — O que o `api_app` pode alterar em `house`?
Por que importa: define o `GRANT UPDATE` por coluna.
Opções:
- **A** — nada, só `SELECT` · custo: renomear a casa é passo manual · consequência: a menor superfície.
- **B** — só `name` · custo: um grant de coluna · consequência: o morador renomeia pela interface, e a auditoria registra.
- **C** — `name` e as colunas de configuração que o M5 criar · custo: cada coluna nova pede um grant em migração nova · consequência: a mesma regra vale adiante.
Recomendação do explorador: B, com C decidida no M5.

### PO4 — O que a auditoria guarda de dado pessoal?
Por que importa: a auditoria é imutável. O que entra nela não sai mais.
Opções:
- **A** — linha inteira antes e depois, em `jsonb` · custo: guarda para sempre nome, telefone e o que mais o M3 tiver · consequência: responde "o que mudou" sem consulta extra. É o protótipo.
- **B** — só as colunas que mudaram, com valor antigo e novo · custo: a função compara as duas linhas · consequência: menos dado guardado, mas o dado pessoal que mudou fica.
- **C** — só o nome das colunas que mudaram, sem valor · custo: não responde qual era o valor antigo · consequência: nenhum dado pessoal na auditoria.
- **D** — A, com uma lista de colunas que nunca entram · custo: a lista vira argumento do trigger por tabela · consequência: decisão por coluna em cada contrato do M3.
- **E** — B e D juntas. No `UPDATE`, só as colunas que mudaram. No `INSERT` e no `DELETE`, a linha inteira. Uma coluna da lista de sensíveis some no `INSERT` e no `DELETE`, e no `UPDATE` aparece só como `[sensível]`, sem valor · custo: a função compara as duas linhas, e cada contrato do M3 em diante nomeia as colunas sensíveis · consequência: a auditoria diz que o telefone mudou, quem mudou e quando, sem guardar o número. `UPDATE` que não muda nada não gera linha. Testado no bloco PO4-X, a pedido do operador em 2026-09-22.
Recomendação do explorador: B ou D. A casa tem três moradores, e o risco é pequeno, mas imutável é para sempre. Revista em 2026-09-22, depois do teste: E.

Nota sobre a opção B, vista no teste: `INSERT` e `DELETE` não têm linha anterior ou posterior para comparar. Na B pura, eles gravam a linha inteira, com todo dado pessoal. A B só reduz o que o `UPDATE` guarda.

### PO5 — Como cada casa nasce no seu ambiente?
Por que importa: a mesma migração roda nos três ambientes, e `dev` e `prod` precisam de casas diferentes.
Opções:
- **A** — script por ambiente, lendo o alvo pela URL · custo: comando e teste novos · consequência: `prod` passa pela mesma trava do `db:migrate`, e fica testado.
- **B** — passo manual no `README.md`, um `insert` como `postgres` · custo: sem teste, e esbarra na leitura larga do item G1 · consequência: nenhum código novo.
- **C** — migração que insere · custo: põe a mesma casa nos dois ambientes, contra o brief, seção 3.4 · consequência: descartada, salvo se o operador mudar o brief.
Recomendação do explorador: A.

### PO6 — O que acontece com a auditoria quando uma casa sai?
Por que importa: com FK, a casa auditada não se apaga, e `house` entra na auditoria desde a criação.
Opções:
- **A** — FK sem cascata · custo: casa nunca se apaga, nem a de teste · consequência: histórico garantido.
- **B** — sem FK em `house_id` da auditoria · custo: a auditoria pode apontar para casa que não existe · consequência: casa se apaga e o histórico fica.
- **C** — FK com `on delete cascade` · custo: apagar a casa apaga a auditoria dela · consequência: contraria a auditoria imutável.
Recomendação do explorador: A. Casa apagada não está no escopo do MVP.

### PO7 — A casa corrente chega pela variável de transação?
Por que importa: é a interface entre o M2 e o banco, e toda política do M3 em diante a usa.
Opções:
- **A** — `set_config('app.house_id', <id>, true)` dentro de cada transação, lida por uma função auxiliar · custo: toda consulta do M2 roda em transação · consequência: os três casos da ordem falham fechados. Testado.
- **B** — claim próprio em `request.jwt.claims` · custo: o mesmo da A, mais JSON a cada requisição · consequência: nenhum ganho, porque `auth.uid()` não serve ao `api_app`.
Recomendação do explorador: A.

## Material bruto

### M1 — protótipo, `setup.sql`, aplicado como `postgres` no banco `p1`

```sql
create table public.house (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);
create table public.audit_log (
  id bigint generated always as identity primary key,
  house_id uuid not null references public.house(id),
  table_name text not null,
  row_id text not null,
  operation text not null check (operation in ('INSERT','UPDATE','DELETE')),
  old_data jsonb, new_data jsonb,
  actor_user_id uuid,
  db_role text not null,
  occurred_at timestamptz not null default now(),
  transaction_id bigint not null
);
create function public.current_house_id() returns pg_catalog.uuid language sql stable
  as $$ select nullif(pg_catalog.current_setting('app.house_id', true), '')::pg_catalog.uuid $$;
create function public.audit_row() returns trigger
  language plpgsql security definer set search_path = pg_catalog, pg_temp
as $$
declare
  house_column text := coalesce(TG_ARGV[0], 'house_id');
  old_row jsonb := case when TG_OP <> 'INSERT' then pg_catalog.to_jsonb(OLD) end;
  new_row jsonb := case when TG_OP <> 'DELETE' then pg_catalog.to_jsonb(NEW) end;
  base jsonb := coalesce(new_row, old_row);
begin
  insert into public.audit_log (house_id, table_name, row_id, operation, old_data, new_data,
                                actor_user_id, db_role, transaction_id)
  values ((base ->> house_column)::uuid, TG_TABLE_NAME, base ->> 'id', TG_OP, old_row, new_row,
          nullif(pg_catalog.current_setting('app.actor_user_id', true), '')::uuid,
          session_user, pg_catalog.txid_current());
  return null;
end $$;
revoke all on function public.audit_row() from public;
create trigger audit after insert or update or delete on public.house
  for each row execute function public.audit_row('id');
alter table public.house enable row level security;
alter table public.audit_log enable row level security;
create policy house_isolation on public.house for all to api_app
  using (id = public.current_house_id()) with check (id = public.current_house_id());
create policy audit_log_read on public.audit_log for select to api_app
  using (house_id = public.current_house_id());
grant select, update (name) on public.house to api_app;
grant select on public.audit_log to api_app;
-- demo_item: tabela no molde do M3, só no experimento
```

A versão rodada primeiro tinha `search_path = ''` e a auxiliar sem `pg_catalog.uuid`. As duas foram trocadas depois do bloco E-H. `demo_item` tem `house_id`, trigger sem argumento, política `for all` com `using` e `with check`, e `select, insert, update, delete` para `api_app`.

### E-A — variável de transação, como `api_app`, numa conexão só

```
=== A1 variável ausente, conexão nova
 house_rows 0 · item_rows 0
=== A2 transação da casa A com set_config local
 name Casa A · label item A
=== A3 mesma conexão, depois da transação da casa A
 is_null f | raw ''
 house_rows 0 · item_rows 0
=== A3b a mesma leitura sem nullif quebraria
ERROR:  invalid input syntax for type uuid: ""
=== A4 valor inválido
ERROR:  invalid input syntax for type uuid: "casa-a"
 house_rows_uuid_inexistente 0
=== A5 set de sessão, sem escopo de transação
 vazou Casa B
=== A6 transação que falhou não deixa valor
ERROR:  division by zero
 house_rows_depois_do_erro 0
=== A7 set_config local fora de transação vale só para o próprio comando
 house_rows_comando_seguinte 0
```

### E-B — claims

```
=== B1 claims ausentes                    count 0
=== B2 claims da casa B em transação      name Casa B
=== B3 reaproveitada                      count 0
=== B4 json quebrado                      ERROR:  invalid input syntax for type json
       json sem house_id                  sem_house_id 0
       house_id que não é uuid            ERROR:  invalid input syntax for type uuid: "casa-b"
=== B5 auth.uid() para api_app no banco postgres
WARNING:  no privileges were granted for "auth"
WARNING:  no privileges were granted for "uid"
ERROR:  permission denied for schema auth
```

### E-C — grants e RLS de escrita, como `api_app` com a casa A

```
C1 UPDATE house própria casa           UPDATE 1
C2 UPDATE house casa B pelo id         UPDATE 0
C3 INSERT demo_item house_id casa B    ERROR:  new row violates row-level security policy for table "demo_item"
C4 UPDATE demo_item para casa B        ERROR:  new row violates row-level security policy for table "demo_item"
C6 INSERT, DELETE, UPDATE id em house  ERROR:  permission denied for table house   (três vezes)
C7 UPDATE, DELETE, INSERT, TRUNCATE    ERROR:  permission denied for table audit_log   (quatro vezes)
C8 select public.audit_row()           ERROR:  permission denied for function audit_row
C9 auditoria lida por api_app
 house     | INSERT | postgres |                                      |        | Casa A
 demo_item | INSERT | postgres |                                      |        |
 house     | UPDATE | api_app  | aaaaaaaa-0000-0000-0000-000000000001 | Casa A | Casa A renomeada
 demo_item | INSERT | api_app  | aaaaaaaa-0000-0000-0000-000000000001 |        |
 demo_item | DELETE | api_app  | aaaaaaaa-0000-0000-0000-000000000001 |        |
```

A C9 mostra só a casa A. As linhas da casa B existem e só `postgres` as vê.

### E-D — `NOINHERIT`, casa apagada, troca da função

```
D1 grant ao grupo app_readers, api_app membro com inherit_option f
   select count(*) from via_group         ERROR:  permission denied for table via_group
   set role app_readers; select ...       via_set_role 0
D2 delete from house where id = <casa C auditada>
   ERROR:  update or delete on table "house" violates foreign key constraint "audit_log_house_id_fkey" on table "audit_log"
D3 tgfoid antes: house 16704, demo_item 16704
   alter table add column actor_person_id; create or replace function public.audit_row()
   tgfoid depois: house 16704, demo_item 16704
   proacl depois: {postgres=X/postgres}
   UPDATE como api_app com app.actor_person_id  audit: demo_item | UPDATE | | bbbbbbbb-0000-0000-0000-000000000002
```

### E-H — domínio temporário contra a função do trigger

```
=== audit_row com search_path = ''
NOTICE:  código de api_app rodando como postgres
ERROR:  operator does not exist: jsonb ->> text
=== audit_row com search_path = pg_catalog, pg_temp
UPDATE 1
```

O `api_app` criou antes `pg_temp.who()`, que só faz `raise notice` com `current_user`, e `create domain pg_temp.jsonb as text check (pg_temp.who(value))`. Com a auxiliar ainda sem `pg_catalog.uuid`, um `create domain pg_temp.uuid` fez a política falhar com `return type mismatch in function declared to return pg_catalog.uuid`.

### P7-1 — banco criado por `create database`

```
\ddp                                   (0 rows)
t_new relacl                           (vazio)
schemas                                information_schema, pg_catalog, pg_toast, public
pg_event_trigger no banco p1           0
```

### P7-2 e D2 — `dev`, pelo MCP somente leitura

```
current_user supabase_read_only_user · current_database postgres
version PostgreSQL 17.6 on aarch64-unknown-linux-gnu
pg_default_acl em public, dono postgres:
  r {postgres=arwdDxtm,anon=arwdDxtm,authenticated=arwdDxtm,service_role=arwdDxtm}
  f {postgres=X,anon=X,authenticated=X,service_role=X}
  S {postgres=rwU,anon=rwU,authenticated=rwU,service_role=rwU}
  e as mesmas três linhas com dono supabase_admin
public nspacl {pg_database_owner=UC,=U,postgres=U,anon=U,authenticated=U,service_role=U}
api_app bypassrls false, inherit false, login true
service_role bypassrls true · supabase_read_only_user bypassrls true · postgres bypassrls true
tabelas em public: nenhuma
extensões: plpgsql, pg_stat_statements, uuid-ossp, pgcrypto, supabase_vault
event triggers: issue_graphql_placeholder, pgrst_ddl_watch, pgrst_drop_watch,
                issue_pg_cron_access, issue_pg_net_access, issue_pg_graphql_access
__drizzle_migrations: 1 linha, created_at 1790020079405
auth nspacl {supabase_admin=UC,anon=U,authenticated=U,service_role=U,supabase_auth_admin=UC,dashboard_user=UC,postgres=U}
has_schema_privilege('api_app','public','USAGE') true
has_schema_privilege('api_app','auth','USAGE') false
postgres membro de: anon, authenticated, service_role, authenticator, ..., api_app
```

### E-E — o protótipo no banco `postgres` da imagem, dentro de `begin` e `rollback`

```
todas as instruções do setup.sql sem erro, com os seis event triggers presentes
role_table_grants em house e audit_log: 7 privilégios para anon, authenticated, postgres, service_role
anon_house 0 · service_role_house 2 · authenticated UPDATE audit_log 0 · authenticated_audit 0
depois de revoke all ... from anon, authenticated, service_role:
  service_role select house  ERROR:  permission denied for table house
dono de house e audit_log: postgres
membro postgres de anon, authenticated, service_role: inherit_option t, set_option t
```

### E-F — ACL das funções no banco `postgres` da imagem

```
current_house_id {=X,postgres=X,anon=X,authenticated=X,service_role=X}
audit_row        {postgres=X,anon=X,authenticated=X,service_role=X}
anon: select public.audit_row()   ERROR:  trigger functions can only be called as triggers
```

### P5 — tipos e gerador

```
$ grep '"version"' drizzle-orm/package.json drizzle-kit/package.json
drizzle-kit/package.json: "version": "0.31.10",
drizzle-orm/package.json: "version": "0.45.2",

drizzle-orm/pg-core/policies.d.ts
  7:  as?: 'permissive' | 'restrictive';
  8:  for?: 'all' | 'select' | 'insert' | 'update' | 'delete';
  9:  to?: PgPolicyToOption;
 10:  using?: SQL;
 11:  withCheck?: SQL;
 24: export declare function pgPolicy(name: string, config?: PgPolicyConfig): PgPolicy;
drizzle-orm/pg-core/roles.d.ts
 11:  existing(): this;
 13: export declare function pgRole(name: string, config?: PgRoleConfig): PgRole;
drizzle-orm/pg-core/table.d.ts
 22:  enableRLS: () => Omit<PgTableWithColumns<T>, 'enableRLS'>;
grep -rl -i trigger drizzle-orm/pg-core/*.d.ts          (nada)
grep -o em drizzle-kit/bin.cjs: 2 CREATE POLICY, 1 ENABLE ROW LEVEL SECURITY,
  0 CREATE TRIGGER, 0 SECURITY DEFINER, 0 CREATE OR REPLACE FUNCTION, 0 GRANT

drizzle-kit generate --name=house, projeto de rascunho com house e pgPolicy:
CREATE TABLE "house" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "house" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "house_isolation" ON "house" AS PERMISSIVE FOR ALL TO "api_app"
  USING ("house"."id" = public.current_house_id()) WITH CHECK ("house"."id" = public.current_house_id());

drizzle-kit generate --custom --name=rls_helpers, com house no schema.ts:
  0001_rls_helpers.sql: -- Custom SQL migration file, put your code below! --
  tabelas no snapshot 0001: []
drizzle-kit generate --name=house em seguida: 0002_house.sql
sem entities.roles no config: grep -c "create role" 0001_house.sql  0

drizzle-orm/pg-core/dialect.js
 60:    await session.transaction(async (tx) => {
 61:      for await (const migration of migrations) {
```

### PO1-X — uuid v7 e snowflake, pedido do operador em 2026-09-22

Rodado em containers descartáveis de `supabase/postgres:17.6.1.173`. O `dev` foi consultado pelo MCP somente leitura.

```
container: select uuidv7();
ERROR:  function uuidv7() does not exist
container e dev: extensões disponíveis com uuid, ulid, snowflake ou hashids no nome
  uuid-ossp 1.1 · pg_hashids 1.3.0
dev: funções com uuid no nome em pg_catalog
  uuid_extract_timestamp(uuid) · uuid_extract_version(uuid)
```

A função v7 testada cola 48 bits de milissegundos sobre um `gen_random_uuid` e ajusta os bits da versão:

```sql
create function public.uuid_v7() returns uuid language sql volatile as $$
  select encode(set_bit(set_bit(overlay(uuid_send(gen_random_uuid())
    placing substring(int8send(floor(extract(epoch from clock_timestamp()) * 1000)::bigint) from 3)
    from 1 for 6), 52, 1), 53, 1), 'hex')::uuid $$;
```

```
uuid_v7() 01a0c81c-ab8b-7770-93ec-b1c83cab31fa · uuid_extract_version 7
uuid_extract_timestamp(uuid_v7())    nulo, porque no Postgres 17 a função só lê a versão 1
horário lido à mão dos 48 bits      2026-09-22 07:55:37.923+00, clock_timestamp 07:55:37.923498+00
20.000 linhas em lote: fora de ordem entre milissegundos 0, em 152 milissegundos distintos
                       fora de ordem linha a linha 9997, todas dentro do mesmo milissegundo
```

Snowflake testado com 41 bits de milissegundos desde 2026-01-01, 10 bits de máquina e 12 bits de uma sequência:

```
snowflake_id() 95790007360425985 · maior que 9007199254740991: t
20.000 linhas em lote: fora de ordem 4, nas voltas da sequência de 12 bits
índice de 20.000 linhas: uuid 696 kB · bigint 464 kB
apps/api/node_modules/postgres/README.md, linha 923: bigint "doesn't work with JSON.stringify
  out of the box, so Postgres.js will return it as a string"
```

Um milhão de linhas em um único `insert`, cada tabela com só a chave e um `int`:

| Chave | Tempo do `insert` | Índice da chave |
|---|---|---|
| `gen_random_uuid()`, v4 | `6553 ms` | `38 MB` |
| `uuid_v7()` | `7355 ms` | `44 MB` |
| `bigint generated always as identity` | `3106 ms` | `21 MB` |

O índice do v7 saiu maior que o do v4. Hipótese: com cerca de 140 linhas por milissegundo, a parte aleatória embaralha a ponta direita do índice, e as páginas se dividem pela metade. A carga real da casa grava poucas linhas por minuto, cada uma num milissegundo próprio, e aí o v7 se comporta como sequência. Não medi essa carga. Foi uma rodada só, sem repetição, e a leitura de 1000 ids variou entre `10 ms` e `4 ms` com cache.

Lado da API: o Node 26.9.0 desta máquina tem `crypto.randomUUIDv7()`, que gerou `01a0c81c-fc7c-7c04-abe2-622a34a7c2bc`. A CI usa Node 26, por `.github/workflows/ci.yml`, linha 60. A imagem da API parte de `ghcr.io/pnpm/pnpm:12`, e não conferi o Node dela.

Documentação:
- `https://www.postgresql.org/docs/17/functions-uuid.html`: o único gerador é `gen_random_uuid`, versão 4. `uuid_extract_timestamp` lê só a versão 1.
- `https://www.postgresql.org/docs/18/functions-uuid.html`: `uuidv7` usa milissegundo, fração de milissegundo e parte aleatória. `uuid_extract_timestamp` lê as versões 1 e 7.
- `https://www.rfc-editor.org/rfc/rfc9562.html`, seção 8: UUID "MUST NOT be used as security capabilities". O horário embutido "does pose a very small attack surface". Em uso de segurança, "UUIDv4 SHOULD be utilized". O v7 tem 74 bits aleatórios, e o v4 tem 122.

### PO1-Y — backfill de ids v4 para v7, pedido do operador em 2026-09-22

Container descartável de `supabase/postgres:17.6.1.173`. Tabelas `house` e `expense`, com o trigger de auditoria em `house` e em `expense`, e `expense.house_id` com `on update cascade`. A função `uuid_v7_at(ts)` é a do bloco PO1-X com o horário recebido por parâmetro.

```
=== ids v4 antes: 5 linhas de expense, versão 4
update expense set id = uuid_v7_at(created_at);          UPDATE 5
  01a05f6a-5800-70ba-... | 7 | 2026-09-02   ...   01a07403-c800-794d-... | 7 | 2026-09-06
  ordenado pelo id, sai na ordem de created_at
update house set id = uuid_v7_at(created_at);            UPDATE 1
  expense_apontando_para_casa_nova 5
auditoria gravada pelo backfill:
  expense | UPDATE | 10   5 com id trocado, 5 com house_id trocado pelo cascade
  house   | UPDATE |  1
sem on update cascade:
  ERROR:  update or delete on table "house" violates foreign key constraint "expense_sem_cascade_house_id_fkey"
alter table ... drop constraint ..., add constraint ... on update cascade;  depois o update passa
  sem_cascade_agora_acompanha 1
```

No Postgres 18, `uuidv7` aceita um intervalo que desloca o horário, segundo `https://www.postgresql.org/docs/18/functions-uuid.html`. Isso dispensaria a função própria no backfill. Não testei, porque não há Postgres 18 aqui.

### PO4-X — auditoria por diferença com colunas sensíveis, pedido do operador em 2026-09-22

Container descartável de `supabase/postgres:17.6.1.173`. A função do trigger recebe a coluna da casa em `TG_ARGV[0]` e as colunas sensíveis de `TG_ARGV[1]` em diante. A tabela `person` é só do experimento.

```
create trigger audit after insert or update or delete on person
  for each row execute function audit_row('house_id', 'phone', 'pix_key');
insert into person (name, phone, pix_key) values ('Visitante X', '11 90000-0000', 'x@exemplo.com');
update person set phone = '11 91111-1111';
update person set name = 'Visitante Y';
update person set name = 'Visitante Y';      mesmo valor
delete from person;

 id | operation | old_data                                          | new_data
  1 | INSERT    |                                                   | {"id": "4283e2b4-...", "name": "Visitante X", "house_id": null}
  2 | UPDATE    | {"phone": "[sensível]"}                           | {"phone": "[sensível]"}
  3 | UPDATE    | {"name": "Visitante X"}                           | {"name": "Visitante Y"}
  4 | DELETE    | {"id": "4283e2b4-...", "name": "Visitante Y", "house_id": null} |
```

O `update` com o mesmo valor não gerou linha. `phone` e `pix_key` não aparecem em nenhuma linha com valor. `name` aparece, porque não estava na lista.

### Documentação consultada

- `https://www.postgresql.org/docs/17/functions-admin.html`: `current_setting` com `missing_ok` devolve `NULL` se a variável não existe. `set_config` com `is_local` verdadeiro vale só na transação corrente.
- `https://www.postgresql.org/docs/17/sql-createpolicy.html`: sem política aplicável vale "default deny". `WITH CHECK` falso ou nulo "then an error occurs". Linha que falha `USING` em `UPDATE` e `DELETE` é "silently suppressed".
- `https://www.postgresql.org/docs/17/sql-createfunction.html`, seção "Writing SECURITY DEFINER Functions Safely": o `search_path` deve excluir schema gravável por usuário não confiável, e `pg_temp` vai por último. Função nova dá `EXECUTE` ao `PUBLIC`.
- `https://www.postgresql.org/docs/17/runtime-config-client.html`: `pg_temp` fora do caminho "is searched first (even before pg_catalog)". O schema temporário vale para relação e tipo, nunca para função e operador.
- `https://supabase.com/docs/guides/database/postgres/row-level-security`: "On existing projects, a new table in `public` starts with every privilege already granted to all three roles". "Adding policies doesn't take those grants back." `service_role` "has the `bypassrls` attribute".

## Veredito do operador

Decidido pelo operador em 2026-09-22, na mesma sessão da exploração. Registrado a partir
da resposta dele. As sete perguntas estão decididas.

| Pergunta | Decisão |
|---|---|
| PO1 | **A**. A chave de `house` é `uuid` com `default gen_random_uuid()`, versão 4. O operador comparou antes com uuid v7 e snowflake, blocos PO1-X e PO1-Y |
| PO2 | **A**. O operador dá o nome da casa real na criação, e o id é gerado nessa hora. Nenhum id de casa fica no repositório |
| PO3 | **B**. `api_app` recebe `SELECT` em `house` e `UPDATE` só na coluna `name`. As colunas de configuração que o M5 criar são decididas no M5, pela opção C |
| PO4 | **E**. No `UPDATE`, a auditoria guarda só as colunas que mudaram, com valor antigo e novo. No `INSERT` e no `DELETE`, a linha inteira. Coluna da lista de sensíveis some no `INSERT` e no `DELETE`, e no `UPDATE` aparece só como `[sensível]`, sem valor. `UPDATE` que não muda nada não gera linha. Bloco PO4-X |
| PO5 | **A**. Um comando separado cria a casa do ambiente, lendo o alvo pela URL. `local` e `dev` ganham a casa de teste. `prod` ganha a casa real, atrás da mesma trava de confirmação do `db:migrate` |
| PO6 | **A**. `audit_log.house_id` tem FK para `house` sem cascata. Casa auditada não se apaga, nem a casa de teste do `dev` |
| PO7 | **A**. A API grava a casa corrente com `set_config('app.house_id', <id>, true)` dentro de cada transação. As políticas leem a variável por uma função auxiliar |

O que este veredito fixa para o contrato:

- a leitura da variável usa `nullif(..., '')`, porque depois de uma transação ela volta como texto vazio;
- um teste cobre a conexão reaproveitada depois da transação de outra casa;
- nenhuma política usa `auth.uid()` nem `request.jwt.claims`;
- a função auxiliar nasce numa migração `--custom` antes da migração gerada, como diz a P5;
- `house.id` e todo `house_id` são `uuid`, e a função auxiliar faz cast da variável para `pg_catalog.uuid`;
- nenhuma extensão nem função de geração de id entra nesta unidade;
- a troca futura para uuid v7 fica na linha proposta para o backlog, achado 7. Ela não entra no contrato;
- o caminho que cria a casa real recebe o nome dela do operador e não guarda o id em arquivo versionado;
- um teste prova que `api_app` altera `name` da própria casa e recebe `permission denied` ao alterar `id` ou `created_at`;
- a função do trigger recebe a coluna da casa no primeiro argumento e as colunas sensíveis nos seguintes. `house` entra sem coluna sensível;
- cada contrato do M3 em diante diz quais colunas da sua tabela são sensíveis;
- os testes cobrem `UPDATE` com só a coluna alterada, `UPDATE` sem mudança sem linha nova, e coluna sensível sem valor. Como nenhuma tabela desta unidade tem coluna sensível, o último teste cria uma tabela só dentro do banco de teste, nunca em migração;
- o comando novo resolve o alvo com `resolveTarget`, de `apps/api/src/db/target.ts`, e conecta com as mesmas variáveis do `db:migrate`, como `postgres`. `api_app` não tem `INSERT` em `house`;
- o comando não altera `db:migrate`, `migrate-cli.ts`, a trava do `prod` nem a migração `0000_api_role`. Ele reusa a trava, sem mudá-la;
- os testes de banco continuam criando as próprias casas depois de `createTestDatabase`. Eles não dependem do comando novo;
- ficam para o condutor decidir no contrato, com as consequências escritas: o que o comando faz quando a casa do ambiente já existe, se o `prod` é exportado antes do `insert`, e de onde o comando roda no `dev`;
- um teste prova que `delete` de uma casa com linha de auditoria falha com violação de FK, mesmo como `postgres`.
