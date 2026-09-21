# Fase 1 — quadro de estado

> Fonte de verdade do andamento. Atualizado pelo condutor a cada transição.
> O estado aqui e o cabeçalho de cada documento de unidade têm que bater.
> Estados possíveis: `docs/processo/02-ciclo.md`.

## Pendências de fase

| # | O que | Situação |
|---|---|---|
| 1 | `docs/fase 1/dod.md` — Definition of Done geral da fase | **resolvida.** Aprovado pelo operador em 2026-09-12, com P1 na opção A e P2 na opção B |
| 2 | `docs/fase 1/roadmap.md` aprovado pelo operador | **resolvida.** Validado em 2026-09-12. O `docs/scope-brief.md` foi marcado como aprovado na mesma data |
| 3 | `[A VALIDAR]` portal da SEFAZ-SP abre pela URL do QR sem captcha e com itens | **resolvida.** Validado pelo operador com nota real em 2026-09-12, sem captcha e com itens. Confirmado em 2026-09-13. O M6 deixa de estar bloqueado |
| 4 | `[A VALIDAR]` limite de dois projetos ativos no plano gratuito do Supabase | **resolvida.** Validado na unidade `M1.1` e aprovado pelo operador em 2026-09-12. Saiu do `docs/scope-brief.md` |
| 5 | Fatiamento da Etapa 1 | **resolvida.** Aprovado pelo operador em 2026-09-12 |
| 6 | Verificação mecânica antes do resto da onda 2 | **resolvida.** Decisão do operador em 2026-09-15. `M1.4` ganha git hook local e proteção da `main`, e passa a ser explorada antes de `M1.2` e `M1.5`. Roadmap alterado na mesma data |
| 7 | Volta de `dev` e `prod` | **resolvida.** Decisão do operador em 2026-09-15. Volta o veredito de 12/09 da `M1.1`: `dev` é o projeto que já existia, `prod` limpo em organização separada, casa de teste só no `dev`, migração passa por local, `dev` e `prod` com exportação do `prod` antes, MCP só no `dev`. Brief, roadmap e regra 06 alterados na mesma data |
| 8 | Processo reestruturado para qualquer ferramenta de IA | **resolvida.** Pedido do operador em 2026-09-15, fora do ciclo de unidade, porque muda o processo e não o produto. As regras saíram de `.claude/` para `docs/processo/`, o `AGENTS.md` virou a porta de entrada, o `CLAUDE.md` só carrega o `AGENTS.md`, e nasceu a regra 06. As regras 01, 02, 03 e 05 ganharam teste antes do código, evidência de versão e de API de biblioteca, e limite de dez itens de DoD. Motivo: um morador desenvolve com Codex e Cursor, e a garantia de qualidade passa a ser mecânica. Commits `382ff9a` e `47ca0d4` |
| 9 | Repositório na organização `alta-cupula-group` | **resolvida.** Decisão do operador em 2026-09-15. A conta pessoal dona virou organização, o repositório foi transferido, e os moradores viraram admin. Registrado em `docs/scope-brief.md`, seção 4 |
| 11 | Relatório de exploração da `M1.2` sem ordem | **resolvida.** Em 2026-09-17 apareceu, fora do controle de versão, um relatório de exploração da `M1.2` assinado por Claude Code em 2026-09-15. Nenhuma ordem o pediu, e ninguém o revisou. Decisão do operador: o arquivo sai do repositório e vira material bruto, guardado na máquina onde foi encontrado. A `M1.2` roda pelo ciclo normal quando for aberta, e quem explorar pode citar esse material. Parte dele está velha: os projetos Supabase foram apagados e recriados em 2026-09-16 |
| 10 | Projetos Supabase apagados e recriados | **resolvida.** Em 2026-09-16 o operador apagou os projetos antigos, inclusive o que servia de `dev`, e criou tudo de novo no mesmo dia: duas organizações gratuitas separadas, `Alta Cúpula` com `casa-automatica-prod` em São Paulo, e `Alta Cúpula Dev` com `casa-automatica-dev` em Oregon. Data API desligada nos dois. Os outros dois moradores entraram nas duas organizações. Nomes e regiões em `docs/scope-brief.md`, seção 4. A `M1.2` deixa de estar travada |

Item `[A VALIDAR]` vira ordem de exploração própria antes da unidade que depende dele.
Ver `docs/processo/04-decisoes.md`.

## Marcos

Do `roadmap.md`. Um marco vira uma ou mais unidades no fatiamento.

| Marco | Entrega | Unidades | Situação |
|---|---|---|---|
| M0 | Fundação do repositório | `M0.1` | **fechado** em 2026-09-13 |
| M1 · Banco | Banco e ambientes | `M1.1`, `M1.2`, `M1.3` | fatiado em 2026-09-12. Entrega da `M1.3` ampliada com Row Level Security em 2026-09-20, para cobrir o que o roadmap passou a exigir |
| M1 · CI | Pipeline de CI e deploy | `M1.4`, `M1.5`, `M1.6`, `M1.7`, `M1.8`, `M1.9`, `M1.10` | fatiado em 2026-09-12, `M1.7` acrescentada, `M1.8` e `M1.9` promovidas do backlog, e `M1.10` acrescentada, todas em 2026-09-20. `M1.4` fechada em 2026-09-16, `M1.5` fechada em 2026-09-20 |
| M2 | Esqueleto da API e autenticação | — | não fatiado. Herda da revisão de `M0.1`: porta inteira entre 1 e 65535 vira item de DoD da unidade que sobe o servidor. Herda de `docs/scope-brief.md` §3.5 (2026-09-20): sessão amarrada a cookie, proteção contra CSRF e rate limit viram critério de pronto |
| M3 | Módulo Pessoas | — | não fatiado |
| M4 | Ledger e plano de contas | — | não fatiado |
| M5 · Despesas | Despesas, divisão e acertos | — | não fatiado |
| M5 · Calendário | Calendário básico | — | não fatiado |
| M6 | NFC-e (São Paulo) | — | não fatiado |
| M7 | Contrato fechado | — | não fatiado |
| M8 | Base do PWA | — | não fatiado |
| M9 · Pessoas | Telas de Pessoas | — | não fatiado |
| M9 · Financeiro | Telas de Financeiro | — | não fatiado |
| M10 | Calendário e NFC-e no app | — | não fatiado |
| M11 | Corte do MVP | — | não fatiado |

## Fatiamento da Etapa 1 · aprovado

Proposto pelo condutor em 2026-09-11. Aprovado pelo operador em 2026-09-12.
M1 · Banco e M1 · CI dividem a mesma sequência `M1.x`. `M1.7-oxlint` acrescentada em
2026-09-20, proposta pelo condutor e aprovada pelo operador na mesma data: trocar ESLint
por oxlint enquanto o repositório ainda é pequeno, antes do M2 gerar mais código para
converter depois.

`M1.8-cabecalhos-seguranca` e `M1.9-auditoria-dependencias` acrescentadas em 2026-09-20.
O operador promoveu as linhas 3 e 4 do backlog a unidades na mesma data. As duas fecham
os dois últimos requisitos da seção 3.5 do `docs/scope-brief.md` que ainda não tinham
unidade dona.

A `M1.8` entrega os cabeçalhos no Caddy, que é a borda de toda a pilha e já serve o web
estático e o proxy da API. Cabeçalho que só a API pode emitir fica de fora dela e entra
no fatiamento do M2.

`M1.10-endurecer-compose` acrescentada em 2026-09-20, proposta pelo condutor e aprovada
pelo operador na mesma data. Ela nasce de uma varredura de segurança feita depois do
fechamento da `M1.5`, que achou três coisas: os dois containers rodam como `root`, o
compose não limita capacidade nem deixa o sistema de arquivos só para leitura, e o
`pnpm install` executa gancho de pacote. Nenhuma das três é falha do que a `M1.5`
entregou; o contrato dela não pedia nada disso.

| Unidade | Marco | Entrega | Depende de | Trilha |
|---|---|---|---|---|
| `M0.1-monorepo-base` | M0 | Monorepo pnpm com `apps/api`, `apps/web` e `packages/shared`. TypeScript, ESLint e Prettier compartilhados. Teste de fumaça por app. README de cinco minutos e `.env.example` por app. | — | dividida: fundacional |
| `M1.1-validar-supabase` | M1 · Banco | Relatório que fecha o `[A VALIDAR]` do limite de dois projetos gratuitos. | — | só exploração, regra 04 |
| `M1.2-ambientes-e-migracoes` | M1 · Banco | Projetos `dev` e `prod` em organizações gratuitas separadas, documentados, com Data API desligada nos dois. Drizzle em `apps/api/drizzle`. Comando único de migração para qualquer ambiente. Supabase local documentado como opcional. | `M0.1`, `M1.1` | dividida: infraestrutura, investigação externa |
| `M1.3-house-e-auditoria` | M1 · Banco | Primeira migração com `house`, tabela de auditoria e trigger, aplicada em `dev` e `prod`, nessa ordem, com exportação do `prod` antes. Row Level Security por `house` nas tabelas centrais que a migração criar. Casa de teste criada no `dev` e casa real no `prod`. Teste prova a linha de auditoria. Teste prova que consulta direta ao Postgres, sem filtro de `house` na query, não retorna linha de outra casa. | `M1.2` | dividida: schema e entidade central |
| `M1.4-ci-verificacao` | M1 · CI | GitHub Actions roda lint, tipos, testes e build em push e PR. Git hook local roda lint e tipos antes do commit. A `main` só aceita código com a CI verde. A ferramenta do hook e a forma da proteção saem da exploração. | `M0.1` | dividida: pipeline |
| `M1.5-compose-e-caddy` | M1 · CI | `docker-compose.yml` com API, web estático e Caddy. Sobe em qualquer máquina com Docker e serve o web em `localhost`. | `M0.1` | dividida: base do deploy |
| `M1.6-deploy-na-casa` | M1 · CI | Deploy por SSH em push na `main`. Cloudflare Tunnel documentado. Segredos listados no README. Push trivial chega ao domínio. | `M1.4`, `M1.5` | dividida: pipeline de deploy |
| `M1.7-oxlint` | M1 · CI | ESLint substituído por oxlint em todo o workspace, mesma cobertura de regras (incluindo `react-hooks`), `pnpm lint` mais rápido, CI e hook local do `M1.4` atualizados. | `M1.4` | dividida: convenção de repositório, investigação externa |
| `M1.8-cabecalhos-seguranca` | M1 · CI | Caddy responde com política de conteúdo (CSP), HSTS e o cabeçalho que impede a página rodar em `iframe` de outro site, no web estático e no proxy da API. Teste prova cada cabeçalho na resposta. | `M1.5` | dividida: investigação externa dos valores de cada cabeçalho |
| `M1.9-auditoria-dependencias` | M1 · CI | A CI falha quando uma dependência do repositório tem vulnerabilidade conhecida publicada. Roda em PR e numa agenda periódica. A ferramenta e a severidade que reprova saem da exploração. | `M1.4` | dividida: pipeline, investigação externa |
| `M1.10-endurecer-compose` | M1 · CI | Os dois containers sobem sem privilégio de `root`, com o mínimo de capacidades do Linux, e a instalação de dependências não executa script de pacote. | `M1.5` | dividida: investigação externa, material descartável |

`M1.1-validar-supabase` é uma unidade só de validação, como manda a regra 04. Ela tem
`ordem.md` e `exploracao.md`, e não tem contrato nem execução. Ela fecha quando o
operador escreve, no fim de `exploracao.md`, o que fazer com o resultado.

## Ordem de trabalho

Fechadas até aqui: `M0.1` e `M1.1` em 2026-09-13, `M1.4` em 2026-09-16, `M1.5` em
2026-09-20. A onda inicial esperou `M0.1` fechar de propósito: explorar CI, compose e
migrações antes de o monorepo existir produziria relatório sobre um repositório que ainda
não tem forma.

O que falta, em ordem de prioridade. Proposta pelo condutor em 2026-09-20, a pedido do
operador. **Aguardando o veredito dele.** A posição 2 já é decisão dele, de 2026-09-20.

Duas trilhas correm em paralelo. A do banco é o caminho crítico: nada da Etapa 2 anda sem
ela. A da CI prepara o servidor para ser exposto. Dá para tocar uma unidade de cada
trilha ao mesmo tempo.

| # | Unidade | Trilha | Por que nesta posição |
|---|---|---|---|
| 1 | `M1.2-ambientes-e-migracoes` | banco | Caminho crítico. O M2 em diante depende do M1 · Banco inteiro. É a fila mais longa da fase. Ordem emitida em 2026-09-20. O operador explora |
| 2 | `M1.7-oxlint` | CI | Decisão do operador em 2026-09-20: trocar o linter enquanto o repositório é pequeno. Cada unidade seguinte que passar antes dela aumenta o que vai ter que ser convertido |
| 3 | `M1.3-house-e-auditoria` | banco | Depende de `M1.2`. Fecha o M1 · Banco e libera o M2. Carrega o Row Level Security |
| 4 | `M1.10-endurecer-compose` | CI | Endurece o que já roda, antes de existir porta aberta para a internet |
| 5 | `M1.8-cabecalhos-seguranca` | CI | Mesmo motivo. Cabeçalho de segurança só protege quem chega de fora, e vale ter no ar desde o primeiro dia |
| 6 | `M1.9-auditoria-dependencias` | CI | Antes de a chave SSH de deploy entrar na CI, o que acontece na `M1.6` |
| 7 | `M1.6-deploy-na-casa` | CI | Fecha o M1 · CI. É ela que abre o Cloudflare Tunnel e põe o segredo na CI, então vem depois de 4, 5 e 6. Carrega a linha 2 do backlog, que vira exigência dela |

A regra que ordena a trilha da CI: **tudo que endurece vem antes do que expõe**. Hoje nada
está na internet. A `M1.6` é a unidade que muda isso.

A linha 1 do backlog não tem posição nesta fila. Ela é documentação de operação e o
roadmap a entrega no M11.

## Unidades

| Unidade | Marco | Trilha | Estado | Depende de | Última transição |
|---|---|---|---|---|---|
| `M0.1-monorepo-base` | M0 | dividida | `fechada` | — | 2026-09-13, GATE 2 vencido. Branch na `main` |
| `M1.1-validar-supabase` | M1 · Banco | só exploração | `fechada` | — | 2026-09-12, veredito do operador registrado |
| `M1.2-ambientes-e-migracoes` | M1 · Banco | dividida | `em exploração` | `M0.1`, `M1.1` | 2026-09-21, o operador assume a exploração no lugar do Lucas. Ordem emitida em 2026-09-20 |
| `M1.3-house-e-auditoria` | M1 · Banco | dividida | `planejada` | `M1.2` | 2026-09-20, entrega ampliada com Row Level Security por `house` |
| `M1.4-ci-verificacao` | M1 · CI | dividida | `fechada` | `M0.1` | 2026-09-16, GATE 2 vencido. Duas ressalvas viraram linhas do backlog |
| `M1.5-compose-e-caddy` | M1 · CI | dividida | `fechada` | `M0.1` para explorar, `M1.4` fechada | 2026-09-20, GATE 2 vencido. Revisão aprovada sem correções obrigatórias, DoD do contrato e DoD geral inteiramente atendidos (item 6 confirmado depois que o Docker passou a funcionar na máquina da execução, com WSL instalado). Operador aprovou a entrega |
| `M1.6-deploy-na-casa` | M1 · CI | dividida | `planejada` | `M1.4`, `M1.5` | 2026-09-12, fatiada |
| `M1.7-oxlint` | M1 · CI | dividida | `planejada` | `M1.4` | 2026-09-20, fatiada, prioridade antes de `M1.6` |
| `M1.8-cabecalhos-seguranca` | M1 · CI | dividida | `planejada` | `M1.5` | 2026-09-20, promovida do backlog e fatiada |
| `M1.9-auditoria-dependencias` | M1 · CI | dividida | `planejada` | `M1.4` | 2026-09-20, promovida do backlog e fatiada |
| `M1.10-endurecer-compose` | M1 · CI | dividida | `em exploração` | `M1.5` | 2026-09-20, ordem emitida. Explorador a definir pelo operador |
