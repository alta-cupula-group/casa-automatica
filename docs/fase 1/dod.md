> Fase: 1 · Documento: Definition of Done geral
> Estado: aprovado
> Condutor redigiu: 2026-09-11 · Operador aprovou: 2026-09-12
> Base: `docs/scope-brief.md` v2 e `docs/fase 1/roadmap.md`

# Definition of Done — Fase 1

## Como usar

- Este DoD vale por cima de todo contrato da Fase 1. O contrato não repete estes itens.
- O revisor percorre este documento e o DoD do contrato, item a item. Item não verificado reprova.
- Cada seção diz a partir de quando vale. Antes disso, o revisor marca o item como `não se aplica` e cita a unidade que ainda não fechou.
- Um contrato pode endurecer um item. Um contrato não afrouxa um item. Exceção exige aprovação do operador escrita no próprio contrato.
- A coluna Origem diz de onde veio cada item. `proposta` quer dizer que o brief e o roadmap não fixam o item. Ele passa a valer só com a aprovação deste documento.
- Os identificadores de unidade citados aqui vêm do fatiamento proposto em `docs/fase 1/estado.md`. Se o fatiamento mudar, este documento acompanha.
- O repositório `casa-automatica/casa-automatica` é público no GitHub. A seção E existe por causa disso.

## A. Processo · vale desde já

| # | Item | Como verificar | Origem |
|---|---|---|---|
| A1 | O commit `docs(<id>): contrato aprovado` vem antes do primeiro commit de código da unidade. | `git log --oneline` mostra a ordem dos dois commits. | regra 02 |
| A2 | `execucao.md` traz cada item do DoD do contrato com a saída real do comando que o verifica. | Leitura de `execucao.md`. | regra 01 |
| A3 | O diff da unidade toca só os arquivos afetados listados no contrato, os documentos da própria unidade e `estado.md`. | `git diff --stat <commit do contrato aprovado>..HEAD` comparado com a lista do contrato. | regra 01 |
| A4 | O estado em `estado.md` bate com o cabeçalho de cada documento da unidade. | Comparação direta. | regra 03 |
| A5 | Commits em pt-BR, com o prefixo da tabela da regra 03. | `git log --oneline`. | regra 03 |

## B. Build, tipos, lint e formatação · vale a partir de `M0.1-monorepo-base`

| # | Item | Como verificar | Origem |
|---|---|---|---|
| B1 | Instalação e build passam num clone limpo. | O bloco abaixo sai com código 0. | roadmap M0 |
| B2 | Lint passa. | `pnpm -r lint` sai com código 0. | roadmap M0 |
| B3 | Checagem de tipos passa, com TypeScript em modo `strict`. | `pnpm -r typecheck` sai com código 0. O `tsconfig` base tem `"strict": true`. | proposta |
| B4 | Formatação confere. | `pnpm format:check` sai com código 0. | roadmap M0 fixa Prettier; o comando é proposta |

```bash
dir=$(mktemp -d)
git clone https://github.com/casa-automatica/casa-automatica.git "$dir"
cd "$dir"
pnpm install --frozen-lockfile
pnpm -r build
```

Os nomes `lint`, `typecheck`, `test` e `format:check` são a interface que o contrato de `M0.1-monorepo-base` precisa entregar.

## C. Testes · vale a partir de `M0.1-monorepo-base`

| # | Item | Como verificar | Origem |
|---|---|---|---|
| C1 | A suíte passa. | `pnpm -r test` sai com código 0. | roadmap M0 |
| C2 | Cada item de comportamento do DoD do contrato tem ao menos um teste automatizado. | `execucao.md` aponta o arquivo e o nome do teste de cada item. O revisor confere que o teste existe e roda. | brief §4 |
| C3 | Item que não dá para automatizar está marcado no contrato como verificação manual, com a evidência esperada. | Leitura do contrato. Exemplos: deploy chegando ao domínio, QR Pix lido por app bancário. | proposta |
| C4 | Nenhum teste acessa rede externa. Isso inclui o Supabase na nuvem e o portal da SEFAZ. Banco de teste é um Postgres local. | A suíte passa numa máquina sem acesso à internet. A forma de subir o Postgres local fica no contrato de `M1.2-ambientes-e-migracoes`. | roadmap M2 e M6; a generalização é proposta |
| C5 | Correção feita em rodada de revisão vem com um teste que falhava antes dela. | `revisao.md` cita o teste de cada correção. | proposta |

## D. CI · vale a partir de `M1.4-ci-verificacao`

| # | Item | Como verificar | Origem |
|---|---|---|---|
| D1 | O pipeline está verde no último commit da unidade. | `gh run list --commit <sha>` mostra `success` em todos os workflows. | roadmap M1 · CI |
| D2 | O pipeline roda os mesmos comandos das seções B e C. | Leitura do workflow. | proposta |

## E. Segredos e configuração · vale desde já

| # | Item | Como verificar | Origem |
|---|---|---|---|
| E1 | Nenhum segredo entra no repositório. Segredo é senha, token, chave privada, chave `service_role` do Supabase ou string de conexão com senha. | A busca abaixo, no diff da unidade, não encontra valor real. | brief §4 |
| E2 | Só `.env.example` é versionado. O `.env` real está no `.gitignore`. | `git ls-files` filtrado por `.env` lista só arquivos `.env.example`. | roadmap M0 |
| E3 | Toda variável de ambiente que o código lê aparece no `.env.example` do app, sem valor real e com um comentário em pt-BR. | O revisor compara as variáveis lidas em `apps/<app>/src` com o `.env.example` do app. | roadmap M0 |
| E4 | O `apps/web` só lê variáveis com prefixo `VITE_`. Nenhuma delas guarda segredo. | Busca por `import.meta.env` em `apps/web/src`. | brief §4 |

```bash
git diff <commit do contrato aprovado>..HEAD \
  | grep -nEi 'password|secret|token|service_role|private key|postgres(ql)?://[^ ]*:[^ ]*@'
```

## F. Idioma · vale desde já

| # | Item | Como verificar | Origem |
|---|---|---|---|
| F1 | Identificadores de código, tabelas e colunas em inglês. | Leitura do diff. | brief §3.4 |
| F2 | Documentos, comentários de processo e mensagens de commit em pt-BR. | Leitura do diff e `git log`. | `CLAUDE.md` |
| F3 | Texto de interface mora no arquivo de i18n pt-BR. Componente não tem texto de interface literal. Vale a partir de M8. | Leitura do diff dos componentes. | brief §3.4 |

## G. Banco de dados · vale a partir de `M1.2-ambientes-e-migracoes`

| # | Item | Como verificar | Origem |
|---|---|---|---|
| G1 | Toda mudança de schema é uma migração versionada em `apps/api/drizzle`. Nada se altera pelo painel do Supabase. | O comando único de migração roda num Postgres local vazio e termina sem erro. | roadmap M1 · Banco |
| G2 | Migração que já está na `main` não é editada. Correção é migração nova. | `git diff --name-status <base>..HEAD` restrito aos `.sql` de `apps/api/drizzle` só mostra `A`. | proposta |
| G3 | Tabela de entidade central tem `house_id` com chave estrangeira para `house`. As entidades centrais são as da regra 04. Vale a partir de `M1.3-house-e-auditoria`. | Leitura da migração. | brief §3.4 |
| G4 | As tabelas de cadastro, de categoria, de despesa e de nota fiscal são cobertas pelo trigger de auditoria. Qualquer outra tabela diz no contrato se é auditada, e por quê. Vale a partir de `M1.3-house-e-auditoria`. | Um teste altera uma linha da tabela e encontra o registro de auditoria. | brief §3.4, e P2 decidida em 2026-09-12 |
| G5 | Dinheiro é inteiro em centavos no banco, na API e no código. Nenhum `float`, `real`, `double precision` ou `numeric` com casas decimais guarda valor monetário. Vale a partir de M4. | Leitura da migração e dos schemas Zod. | roadmap M5, e P1 decidida em 2026-09-12 |
| G6 | Nenhuma migração concede `UPDATE` ou `DELETE` em `ledger_entry` a um papel da aplicação. Vale a partir de M4. | O teste de imutabilidade do M4 continua passando. | brief §3.2, roadmap M4 |

## H. API · vale a partir de M2

| # | Item | Como verificar | Origem |
|---|---|---|---|
| H1 | Rota nova tem schema Zod de entrada e de saída e aparece no OpenAPI gerado. | O OpenAPI gerado contém a rota com os dois schemas. | brief §4, roadmap M2 |
| H2 | Rota nova exige JWT válido. Rota sem JWT só existe com o motivo escrito no contrato. | Teste da rota sem token espera `401`. | roadmap M2 |
| H3 | Rota que escreve recusa quem não é morador ativo. Vale a partir de M3. | Teste da rota com usuário que não é morador ativo espera recusa. | brief §3.1 |
| H4 | Resposta de erro segue o formato padronizado de M2. | Teste de erro valida a resposta contra o schema de erro. | roadmap M2 |

## I. Documentação · vale a partir de `M0.1-monorepo-base`

| # | Item | Como verificar | Origem |
|---|---|---|---|
| I1 | Se a unidade muda instalação, variável de ambiente ou comando, o `README.md` muda no mesmo commit. | Leitura do diff. | roadmap M0 |
| I2 | Passo manual de operação criado pela unidade está escrito no `README.md` ou em `docs/`. Exemplos: criar projeto no Supabase, gerar a chave SSH do deploy. | Leitura do documento. | roadmap M1 e M11 |

## J. Servidor · vale a partir de `M1.5-compose-e-caddy`

| # | Item | Como verificar | Origem |
|---|---|---|---|
| J1 | O `docker-compose.yml` só tem os serviços que o roadmap nomeia: API, web estático e Caddy. Serviço novo exige o operador. | `docker compose config --services`. | roadmap, tabela de riscos |

## O que este DoD não exige

- Cobertura percentual de testes. C2 amarra teste a comportamento, não a número.
- Teste de interface ponta a ponta.
- Meta de desempenho ou de memória. O limite do servidor entra no contrato de `M1.5-compose-e-caddy`, depois que a exploração medir a máquina.

## Decisões do operador

As duas perguntas deste documento foram respondidas em 2026-09-12. O operador apagou do
arquivo as opções que recusou. O que está abaixo é o que vale.

### P1 — Dinheiro é sempre inteiro em centavos, em todo o sistema?
Decisão: **A**. Inteiro em centavos no banco, na API e no código. A interface converte
para reais na exibição e na digitação. Sustenta o item G5.

### P2 — Toda tabela que aceita alteração é auditada por padrão?
Decisão: **B**. A auditoria cobre cadastro, categoria, despesa e nota fiscal. Qualquer
outra tabela diz no seu contrato se é auditada, e por quê. Sustenta o item G4.
A recomendação do condutor era a opção A. O operador escolheu B.
