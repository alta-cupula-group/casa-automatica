> Unidade: `M1.2-ambientes-e-migracoes` · Marco: `M1 · Banco`
> Estado: fechada
> Revisor: revisor separado · Ferramenta: `Claude Code, modelo claude-sonnet-5` · Data: `2026-09-21`

# Revisão — `M1.2-ambientes-e-migracoes`

## Resumo para o GATE 2

Escrito pelo condutor em 2026-09-21. Diz o estado de agora. As seções de baixo são o
histórico, na ordem em que aconteceram.

Estado: `fechada`. Os dez itens do DoD do contrato estão atendidos. O condutor aprovou
tecnicamente, e o operador aprovou o GATE 2 em 2026-09-21.

| # | O que se prova | Quem verificou | Como |
|---|---|---|---|
| 1 a 8 | o comando, o papel `api_app`, a trava do `prod`, o TLS e a CI | revisor separado, Sonnet 5, rodando os comandos de novo | 53 testes de banco passando, reprodução à mão, CI verde no commit `302d0e4` |
| 9 | o `dev` foi migrado pela CI e o `api_app` conecta lá | condutor e operador | log do run `35650285193`, consulta pelo MCP, `select current_user` do operador |
| 10 | o `prod` foi migrado da máquina do operador, com exportação antes, e a Data API está desligada nos dois | operador | `ls -l` da exportação, `pg_restore --list` sem `drizzle`, consulta no `prod`, capturas do painel |

O que o operador decide:
1. se aprova a alteração do item 10, na seção `## Alterações` do contrato;
2. se aprova a entrega;
3. se aceita as linhas 5 a 8 do backlog como destino das observações.

O `reprovado` da seção seguinte é o veredito do revisor antes dos itens 9 e 10 terem
evidência. Ele não pediu correção de código. A seção `## Evidência dos itens 9 e 10`, no
fim, fecha esses dois itens.

## Veredito do revisor, antes dos itens 9 e 10

`reprovado`, só pelos itens 9 e 10 do DoD do contrato. Os itens 1 a 8 do contrato e todo o
DoD geral aplicável foram verificados por mim, de forma independente, e passam. Não há
nenhuma correção de código a pedir. Falta evidência que só existe depois do merge na `main`
e da ação manual do operador no `prod`, exatamente como o próprio contrato prevê ("A
unidade fica `em revisão` até os dois terem evidência. Só então vem o GATE 2."). Reprovo
porque a regra do meu papel é clara — item não verificável é reprovação — mas a correção
não volta para o executor: é a sequência normal que o contrato já desenhou.

## Rodada 1

### DoD do contrato

| # | Item | Veredito | Evidência |
|---|---|---|---|
| 1 | Banco vazio: `runMigrations` cria `api_app`, grava uma linha por migração, segunda execução não grava | atendido | Rodei eu mesmo o `db:migrate` duas vezes contra um banco novo: `EXIT=0` nas duas, e `select id, hash, created_at from drizzle.__drizzle_migrations` mostra uma única linha (`id=1`). Suíte: `migrate.test.ts > DoD 1` passa |
| 2 | Migração roda sem erro em dois bancos do mesmo cluster, em sequência e ao mesmo tempo | atendido | `migrate.test.ts > DoD 2` (2 testes) passa na minha execução de `vitest run --reporter=verbose src/db`, dentro dos 53/53 |
| 3 | `api_app` com os atributos da tabela, dono de nada, conecta com a senha do teste | atendido | `api-role.test.ts > DoD 3` (4 testes) passa. Li o teste: confere `rolcanlogin/rolsuper/rolbypassrls/rolcreaterole/rolcreatedb/rolinherit` via `pg_roles`, ausência de posse via `pg_shdepend` com `deptype='o'`, ausência de `password` nos `.sql`, e `current_user/session_user` iguais a `api_app` |
| 4 | SQL inválido rejeita e não grava linha; processo contra host recusado sai com 1 em `stderr` | atendido | `migrate.test.ts > DoD 4` (2 testes) passa. Reproduzi à mão: host inexistente devolve `ECONNREFUSED` em `stderr` e `EXIT=1`; senha errada devolve `password authentication failed` e `EXIT=1` |
| 5 | Alvo pelo host da tabela do contrato; host desconhecido, porta errada e URL com senha são recusados sem vazar a senha | atendido | `target.test.ts > DoD 5` (16 testes) passa. Reproduzi à mão a recusa de URL com senha: mensagem não contém a senha |
| 6 | Trava do prod: sem terminal, texto errado, `PROD_DUMP_DIR` inválida, `pg_dump` de versão menor, nada migra se `pg_dump` falha, exportação antes da migração | atendido | `prod-guard.test.ts > DoD 6` (23 testes) passa. Reproduzi à mão a recusa sem terminal (`</dev/null`), com mensagem exata do contrato. A chamada real ao `pg_dump` contra o `prod` real não é exercitável nesta revisão, e o próprio contrato reserva essa parte ao item 10 |
| 7 | TLS verificado no `dev` e no `prod` contra `apps/api/certs/supabase-ca.crt`, sem TLS no `local` | atendido | `target.test.ts > DoD 7` (4 testes) passa, pelas opções de conexão, como o contrato pede como forma de verificação. Conferi o `sha256sum` do certificado versionado contra os dois arquivos que o operador entregou (`dev-ca-2021.crt`, `prod-ca-2021.crt`): os três batem, mesmo hash |
| 8 | CI roda os testes contra `supabase/postgres:17.6.1.173` e fica verde; nenhum teste conecta fora de `localhost` | atendido | `gh run list --commit 302d0e4236edde2db2d09011c083a98665493f84` mostra `completed success` no último commit da branch. Li `ci.yml`: sobe a imagem como serviço em `54322`, injeta as duas variáveis só no passo de testes. O teste que usa `db.example.com` não resolve (`getent hosts db.example.com` = NXDOMAIN) e falha antes de qualquer tentativa de conexão, na análise de `resolveTarget` |
| 9 | Workflow do `dev` aplicou a migração; `api_app` com `rolbypassrls = f`; `api_app.<ref>` conecta pelo pooler | não verificável | `execucao.md` marca como "não verificado". A unidade ainda está numa branch; `migrate-dev.yml` só dispara em push na `main`. Não há log de run nem consulta MCP para conferir |
| 10 | Operador migrou o `prod`; exportação existe antes da linha nova; Data API desligada nos dois painéis | não verificável | `execucao.md` marca como "não verificado". Não há saída de `db:migrate` no `prod` nem `ls -l` do dump nem captura do painel |

### DoD geral da fase

| # | Item | Veredito | Evidência |
|---|---|---|---|
| A1 | atendido | `git log --oneline`: `b2d712e docs(M1.2): contrato aprovado` vem antes de `47f95fd`/`067eec4`/`302d0e4` |
| A2 | atendido | `execucao.md` traz comando e saída real para cada item, e eu reproduzi 1, 4, 5, 6 e 8 de forma independente com o mesmo resultado |
| A3 | atendido | `git diff --stat b2d712e..HEAD`: 24 arquivos, todos na lista do contrato mais `docs/fase 1/estado.md` e o próprio `execucao.md`, os dois permitidos por A3 |
| A4 | atendido | `estado.md` traz `em revisão` para `M1.2`; `execucao.md` traz `Estado: em revisão` no cabeçalho. `contrato.md` mantém `Estado: aprovada`, que é o estado no momento em que ele fechou, o mesmo padrão do `contrato.md` de `M1.5` já fechada. Não é divergência |
| A5 | atendido | `git log`: `feat(M1.2): comando de migração...`, `docs(M1.2): execução iniciada`, `docs(M1.2): registro da execução` |
| B1 | atendido | Clonei a branch num diretório novo, `pnpm install --frozen-lockfile` e `pnpm -r build` saíram com `0`. Apaguei `apps/api/dist` nesse clone e rodei `db:migrate` contra um banco novo: `EXIT=0` |
| B2 | atendido | `pnpm -r lint`: `LINT=0`, todos os pacotes `Done` |
| B3 | atendido | `pnpm -r typecheck`: `TC=0`, todos os pacotes `Done` |
| B4 | atendido | `pnpm format:check`: "All matched files use Prettier code style!" |
| C1 | atendido | `pnpm -r test` com `TEST_DATABASE_URL`/`TEST_DATABASE_PASSWORD` exportadas: `apps/api Test Files 6 passed (6)`, `Tests 59 passed (59)`; `packages/shared` e `apps/web` também passam |
| C2 | atendido | Cada item 1 a 8 aponta arquivo e teste, e eu conferi que o teste existe, roda e cobre o comportamento descrito, lendo `migrate.test.ts`, `api-role.test.ts`, `target.test.ts` e `prod-guard.test.ts` |
| C3 | atendido | Itens 9 e 10 do contrato já nascem marcados como verificação manual, com a evidência esperada descrita |
| C4 | atendido | Nenhum teste abre conexão fora de `localhost`. O único teste que usa um host de pooler ou um host inventado (`db.example.com`) só testa `resolveTarget`/`parseDatabaseUrl`, que são síncronos e não abrem socket; `db.example.com` nem resolve nesta máquina |
| C5 | não se aplica | rodada 1 |
| D1 | atendido | `gh run list --commit <sha do HEAD>`: `completed success` |
| D2 | atendido | Li `ci.yml`: os mesmos passos de build, lint, typecheck, test e format:check da seção B/C, mais o serviço de Postgres e as duas variáveis de teste |
| E1 | atendido | `git diff b2d712e..HEAD \| grep -nEi 'password\|secret\|token\|service_role\|private key\|postgres(ql)?://...'`: só nomes de variável, texto de documentação, comandos de exemplo e senhas descartáveis de teste (`teste-local`, `teste-ci-descartavel`, `senha-que-nao-pode-aparecer` como texto que o teste garante NÃO aparecer). Nenhum valor real |
| E2 | atendido | `git ls-files \| grep -i '\.env'`: só os três `.env.example` |
| E3 | atendido | As cinco variáveis lidas em `apps/api/src/db` (`MIGRATION_DATABASE_URL`, `MIGRATION_DATABASE_PASSWORD`, `PROD_DUMP_DIR`, `TEST_DATABASE_URL`, `TEST_DATABASE_PASSWORD`) estão em `apps/api/.env.example`, com comentário em pt-BR |
| E4 | não se aplica | `apps/web` não muda no diff |
| F1, F2 | atendido | Identificadores, nomes de coluna do papel e SQL em inglês; comentários de código, commits e documentos em pt-BR |
| G1 | atendido | `db:migrate` contra Postgres local vazio termina com `EXIT=0`, comprovado por mim em três bancos diferentes durante a revisão |
| G2 | atendido | `git diff --name-status b2d712e..HEAD -- 'apps/api/drizzle/*.sql'` só mostra `A apps/api/drizzle/0000_api_role.sql` |
| G3 a G6 | não se aplica | valem a partir de `M1.3` ou de M4, ainda não fechadas |
| I1 | atendido | `README.md` muda no mesmo commit de código (`067eec4`), com a seção "Banco de dados" |
| I2 | atendido | O passo manual da senha do `api_app` por ambiente está documentado em `README.md`, seção "O papel `api_app`" |
| J1 | atendido | `git diff b2d712e..HEAD -- docker-compose.yml` vazio: o arquivo não muda |

### Escopo

```
$ git diff --stat b2d712e..HEAD
 .github/workflows/ci.yml                           |  17 +
 .github/workflows/migrate-dev.yml                  |  53 ++
 README.md                                          | 202 ++-
 apps/api/.env.example                              |  11 +
 apps/api/certs/supabase-ca.crt                     |  23 +
 apps/api/drizzle.config.ts                         |   9 +
 apps/api/drizzle/0000_api_role.sql                 |  16 +
 apps/api/drizzle/meta/0000_snapshot.json           |  18 +
 apps/api/drizzle/meta/_journal.json                |  13 +
 apps/api/package.json                              |   9 +-
 apps/api/src/db/api-role.test.ts                   |  87 ++
 apps/api/src/db/migrate-cli.ts                     | 133 +++
 apps/api/src/db/migrate.test.ts                    | 207 +++
 apps/api/src/db/migrate.ts                         |  89 ++
 apps/api/src/db/prod-guard.test.ts                 | 225 +++
 apps/api/src/db/prod-guard.ts                      | 145 +++
 apps/api/src/db/schema.ts                          |   3 +
 apps/api/src/db/target.test.ts                     | 140 +++
 apps/api/src/db/target.ts                          | 116 +++
 apps/api/src/db/test-database.ts                   | 145 +++
 docs/fase 1/estado.md                              |   2 +-
 .../M1.2-ambientes-e-migracoes/execucao.md         | 325 +++
 pnpm-lock.yaml                                     | 967 ++++-
 pnpm-workspace.yaml                                |   3 +-
 24 files changed, 2942 insertions(+), 16 deletions(-)
```

Bate com a lista de "Arquivos afetados" do contrato, mais `docs/fase 1/estado.md` (do
condutor) e `execucao.md` (documento da própria unidade), os dois permitidos pela regra A3
do DoD geral. `apps/api/tsconfig.json` e `apps/api/eslint.config.js`, que o contrato
liberava só condicionalmente, não mudaram, e eu confirmei que lint e tipos passam sem eles.
Nenhum arquivo fora da lista.

Achado no diretório de trabalho, fora do commit: `dev-ca-2021.crt` e `prod-ca-2021.crt`
continuam soltos na raiz, não versionados e não ignorados pelo `.gitignore`. Não entram no
diff, então não violam o escopo do commit, mas vai para observações.

### Regras do repositório

- Código e banco em inglês: `ok` — nomes de função, tipo, coluna e do papel `api_app` em inglês
- Nada assumido fora do brief: `ok`
- Nenhum `[A VALIDAR]` tratado como resolvido: `ok` — nenhum `[A VALIDAR]` aberto envolvido nesta unidade
- Cabeçalhos e `estado.md` coerentes: `ok`
- Testes de comportamento falharam antes da implementação: `ok` — `execucao.md` mostra os quatro arquivos de teste falhando por módulo inexistente antes de qualquer `src/db/*.ts` existir, e os testes antigos continuando verdes
- Nenhuma dependência ou versão fora do contrato: `ok` — `drizzle-orm@0.45.2`, `postgres@3.4.9`, `drizzle-kit@0.31.10`, exatos, sem `^`, conferido em `package.json` e `pnpm-lock.yaml`. Nenhum `pg` instalado
- CI verde no último commit, depois de `M1.4-ci-verificacao`: `ok` — `gh run list --commit 302d0e4236edde2db2d09011c083a98665493f84` = `completed success`
- Em unidade de risco, ferramenta ou modelo diferente do executor: `ok` — executor usou `Claude Code, modelo claude-opus-5`; esta revisão usa `Claude Code, modelo claude-sonnet-5`. Unidade mexe em schema e papel de banco, exige revisor separado pela regra 01, e o modelo é diferente

### Correções exigidas

Nenhuma correção de código. O que falta para fechar a unidade não é do executor:

1. Mesclar a branch na `main` (ou a forma que o condutor decidir) para o workflow
   `Migrar o dev` disparar, e colar aqui o log do run que aplicou a migração, mais a saída
   de `select current_user` e a checagem de `rolbypassrls = f` para `api_app` no `dev`,
   pelo MCP somente leitura. Isso prova o item 9 do DoD do contrato.
2. O operador migrar o `prod` da própria máquina com `db:migrate`, e colar aqui a saída do
   comando, o `ls -l` do arquivo de exportação com data anterior à migração, e a captura ou
   relato de que a Data API está desligada nos dois painéis. Isso prova o item 10.

Com os itens 9 e 10 evidenciados, o DoD do contrato fica inteiramente atendido e a unidade
pode seguir para o GATE 2 sem nova rodada de correção de código.

### Observações

Achados fora do escopo das correções obrigatórias.

1. `migrate-cli.ts` roda o TypeScript direto do `src` registrando um hook de
   `node:module` `registerHooks` que a documentação oficial do Node 26 classifica como
   "Stability: 1.2 - Release candidate"
   (https://nodejs.org/docs/latest-v26.x/api/module.html). Funciona hoje, comprovado pelos
   meus testes, mas é uma API que ainda pode mudar. Vale o condutor decidir se aceita essa
   dependência ou prefere outra solução para rodar `db:migrate` sem build, numa unidade
   futura.
2. O script `db:generate` usa um `sh -c` para descartar o `--` que o `pnpm 12.4.1` repassa
   ao script e que o `drizzle-kit` recusa. Funciona no Linux, comprovado por mim. O próprio
   `execucao.md` registra que `sh` não existe no Windows. Nenhum requisito hoje cita
   Windows como plataforma de desenvolvimento, então não bloqueia, mas fica registrado
   caso isso mude.
3. A migração `0000_api_role.sql` cria `api_app` só se ele ainda não existe no cluster, e
   não teria como corrigir um `api_app` que já existisse com atributos diferentes. Hoje o
   papel não existe em nenhum ambiente, então não é um problema agora. Se algum dia um
   `api_app` for criado manualmente fora desta migração, ela não o converge.
4. `dev-ca-2021.crt` e `prod-ca-2021.crt` seguem na raiz do repositório de trabalho, fora
   do controle de versão e fora do `.gitignore`. Vale apagá-los ou adicioná-los ao
   `.gitignore` depois que o conteúdo já foi copiado para
   `apps/api/certs/supabase-ca.crt`.
5. O container `casa-postgres-teste` ficou rodando na máquina onde a execução e esta
   revisão aconteceram. Não é um achado de repositório, só uma nota operacional.

## GATE 2

- Aprovação técnica: condutor, 2026-09-21, depois da evidência dos itens 9 e 10
- Veredito do operador: aprovado em 2026-09-21. A aprovação cobre a alteração do item 10 no contrato e as linhas 5 a 8 do backlog
- Ressalva e destino: nenhuma ressalva de escopo. O que falta é evidência dos itens 9 e 10 do próprio DoD do contrato, a produzir depois do merge na `main` e da ação do operador no `prod`, como o contrato já previa

## Leitura do condutor

Registrada pelo condutor em 2026-09-21.

- O `reprovado` da rodada 1 não abre rodada de correção. Não há correção para o executor.
  Os itens 9 e 10 dependem do merge e do operador, como o contrato previa. A unidade segue
  `em revisão` e esta rodada não conta para o limite de três.
- Aprovo tecnicamente os itens 1 a 8. Li `migrate-dev.yml`: declara `permissions:
  contents: read`, só lê segredo do `dev`, e não roda em pull request.
- A conferência de URL em `migrate-dev.yml` e a recusa de `PROD_DUMP_DIR` relativa não
  ampliam escopo. A segunda vem da tabela de variáveis do contrato. A primeira repete uma
  recusa que o `db:migrate` já faz. Aceitas.
- As actions de `migrate-dev.yml` estão presas por tag, como em `ci.yml`. O segredo em jogo
  é o do `dev`, que só guarda a casa de teste. A linha 2 do backlog continua valendo para a
  `M1.6`, que põe a chave SSH na CI.
- Destino das observações do revisor:
  - observação 1, `registerHooks` em release candidate: linha 5 do backlog;
  - observação 3, `api_app` pré-existente não converge: linha 6 do backlog;
  - o `Dockerfile` da API ainda não leva `apps/api/certs` para a imagem: herança do M2 em
    `docs/fase 1/estado.md`;
  - observação 2, `sh -c` no `db:generate`: pergunta ao operador no GATE 2, porque o
    condutor não sabe se algum morador gera migração fora de Linux, macOS ou WSL;
  - observações 4 e 5 são da máquina, não do repositório.

## Evidência dos itens 9 e 10

Colhida pelo condutor e pelo operador em 2026-09-21, depois do merge do PR #28.

### Item 9 — `dev`

O push do merge disparou `Migrar o dev`. As duas primeiras tentativas falharam por valor
errado nos segredos, e as duas falhas mostram a trava funcionando:

| Run | Resultado | Motivo |
|---|---|---|
| `35650285193`, primeira tentativa | falha | `A URL de banco não pode conter senha.` O segredo tinha senha na URL. A mensagem não repetiu a URL |
| `35650404686` | falha | `password authentication failed for user "postgres"`. TLS verificado, senha errada no segredo |
| `35650285193`, nova tentativa às 20:23:35Z | `success` | log abaixo |

```
db:migrate alvo=dev host=aws-0-us-west-2.pooler.supabase.com usuário=postgres.<ref>
db:migrate terminou: migrações aplicadas.
```

Consulta do condutor pelo MCP somente leitura no `dev`:

```
rolname | rolcanlogin | rolsuper | rolbypassrls | rolcreaterole | rolcreatedb | rolinherit | owned_relations | migration_rows
api_app | true        | false    | false        | false         | false       | false      | 0               | 1
```

O operador definiu a senha do `api_app` no `dev` com `\password` e conectou pelo pooler:

```
$ psql "host=aws-0-us-west-2.pooler.supabase.com port=5432 ... user=api_app.<ref> sslmode=verify-full ..." -c "select current_user;"
 current_user
--------------
 api_app
```

Item 9: `atendido`.

### Item 10 — `prod`

O operador rodou `db:migrate` contra o `prod` da própria máquina. Nenhuma ferramenta de IA
conectou ao `prod`.

```
$ ls -l ~/casa-automatica-exportacoes
-rw-r--r-- 1 ... 353722 Sep 21 17:39 casa-automatica-prod-20260921T203937Z.dump

$ psql "host=aws-0-sa-east-1.pooler.supabase.com ... sslmode=verify-full ..." -c ... -c ...
 rolname | rolbypassrls
 api_app | f
 count |      to_timestamp
     1 | 2026-09-21 19:47:59+00

$ pg_restore --list <exportação> | grep -ci drizzle
0
```

A coluna `created_at` de `drizzle.__drizzle_migrations` guarda a data em que o arquivo de
migração foi gerado, não a da aplicação. O `dev` mostra o mesmo valor, e lá a migração
rodou às 20:23Z. Por isso o horário não prova a ordem, e o contrato ganhou uma alteração no
item 10. A ordem se prova assim:
- a migração cria o schema `drizzle`, e a exportação não tem nenhum objeto `drizzle`. Ela
  foi feita antes da migração;
- cada execução contra o `prod` exporta antes de migrar, e só existe uma exportação. Houve
  uma execução só.

Data API: as capturas do painel do `casa-automatica-dev` e do `casa-automatica-prod`, em
2026-09-21 às 17:58 e 17:59, mostram o controle **Enable Data API** desligado e o aviso
"No schemas can be queried".

Item 10: `atendido`, com a verificação alterada que o operador precisa aprovar.

### Conclusão do condutor

Os dez itens do DoD do contrato estão atendidos, com evidência. Aprovo tecnicamente a
unidade em 2026-09-21. Falta o veredito do operador.

Dois achados da coleta, sem correção nesta unidade:
- a exportação nasce com permissão `-rw-r--r--`. Linha 7 do backlog;
- o `README.md` passa caminho relativo do certificado ao `psql`, e o nome da pasta do
  repositório tem espaço. Linha 8 do backlog.

