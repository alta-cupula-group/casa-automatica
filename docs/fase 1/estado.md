# Fase 1 — quadro de estado

> Fonte de verdade do andamento. Atualizado pelo condutor a cada transição.
> O estado aqui e o cabeçalho de cada documento de unidade têm que bater.
> Estados possíveis: `.claude/rules/02-ciclo.md`.

## Pendências de fase

| # | O que | Situação |
|---|---|---|
| 1 | `docs/fase 1/dod.md` — Definition of Done geral da fase | **resolvida.** Aprovado pelo operador em 2026-09-12, com P1 na opção A e P2 na opção B |
| 2 | `docs/fase 1/roadmap.md` aprovado pelo operador | **resolvida.** Validado em 2026-09-12. O `docs/scope-brief.md` foi marcado como aprovado na mesma data |
| 3 | `[A VALIDAR]` portal da SEFAZ-SP abre pela URL do QR sem captcha e com itens | aberto. Bloqueia M6. Fora da Etapa 1 |
| 4 | `[A VALIDAR]` limite de dois projetos ativos no plano gratuito do Supabase | **resolvida.** Validado na unidade `M1.1` e aprovado pelo operador em 2026-09-12. Saiu do `docs/scope-brief.md` |
| 5 | Fatiamento da Etapa 1 | **resolvida.** Aprovado pelo operador em 2026-09-12 |

Item `[A VALIDAR]` vira ordem de exploração própria antes da unidade que depende dele.
Ver `.claude/rules/04-decisoes.md`.

## Marcos

Do `roadmap.md`. Um marco vira uma ou mais unidades no fatiamento.

| Marco | Entrega | Unidades | Situação |
|---|---|---|---|
| M0 | Fundação do repositório | `M0.1` | fatiado em 2026-09-12 |
| M1 · Banco | Banco e ambientes | `M1.1`, `M1.2`, `M1.3` | fatiado em 2026-09-12 |
| M1 · CI | Pipeline de CI e deploy | `M1.4`, `M1.5`, `M1.6` | fatiado em 2026-09-12 |
| M2 | Esqueleto da API e autenticação | — | não fatiado |
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
M1 · Banco e M1 · CI dividem a mesma sequência `M1.x`.

| Unidade | Marco | Entrega | Depende de | Trilha |
|---|---|---|---|---|
| `M0.1-monorepo-base` | M0 | Monorepo pnpm com `apps/api`, `apps/web` e `packages/shared`. TypeScript, ESLint e Prettier compartilhados. Teste de fumaça por app. README de cinco minutos e `.env.example` por app. | — | dividida: fundacional |
| `M1.1-validar-supabase` | M1 · Banco | Relatório que fecha o `[A VALIDAR]` do limite de dois projetos gratuitos. | — | só exploração, regra 04 |
| `M1.2-ambientes-e-migracoes` | M1 · Banco | Projetos `dev` e `prod` documentados, com Data API desligada. Drizzle em `apps/api/drizzle`. Comando único de migração para qualquer ambiente. Supabase local documentado como opcional. | `M0.1`, `M1.1` | dividida: infraestrutura, investigação externa |
| `M1.3-house-e-auditoria` | M1 · Banco | Primeira migração com `house`, tabela de auditoria e trigger, aplicada em `dev` e `prod`. Teste prova a linha de auditoria. | `M1.2` | dividida: schema e entidade central |
| `M1.4-ci-verificacao` | M1 · CI | GitHub Actions roda lint, tipos, testes e build em push e PR. | `M0.1` | dividida: pipeline |
| `M1.5-compose-e-caddy` | M1 · CI | `docker-compose.yml` com API, web estático e Caddy. Sobe em qualquer máquina com Docker e serve o web em `localhost`. | `M0.1` | dividida: base do deploy |
| `M1.6-deploy-na-casa` | M1 · CI | Deploy por SSH em push na `main`. Cloudflare Tunnel documentado. Segredos listados no README. Push trivial chega ao domínio. | `M1.4`, `M1.5` | dividida: pipeline de deploy |

`M1.1-validar-supabase` é uma unidade só de validação, como manda a regra 04. Ela tem
`ordem.md` e `exploracao.md`, e não tem contrato nem execução. Ela fecha quando o
operador escreve, no fim de `exploracao.md`, o que fazer com o resultado.

Ordem de trabalho:

| Onda | Unidades | Condição para começar |
|---|---|---|
| 1 | `M0.1`, `M1.1` | nenhuma. As duas começaram em 2026-09-12 |
| 2 | `M1.2`, `M1.4`, `M1.5` | `M0.1` fechada. `M1.2` também espera `M1.1` fechada |
| 3 | `M1.3`, `M1.6` | dependências da tabela acima fechadas |

A onda 2 só é explorada depois que `M0.1` fechar. Explorar CI, compose e migrações antes
de o monorepo existir produziria relatório sobre um repositório que ainda não tem forma.

## Unidades

| Unidade | Marco | Trilha | Estado | Depende de | Última transição |
|---|---|---|---|---|---|
| `M0.1-monorepo-base` | M0 | dividida | `aguardando operador` | — | 2026-09-12, executor devolveu o contrato com três defeitos. Contrato reaberto, novo GATE 1 |
| `M1.1-validar-supabase` | M1 · Banco | só exploração | `fechada` | — | 2026-09-12, veredito do operador registrado |
| `M1.2-ambientes-e-migracoes` | M1 · Banco | dividida | `planejada` | `M0.1`, `M1.1` | 2026-09-12, fatiada |
| `M1.3-house-e-auditoria` | M1 · Banco | dividida | `planejada` | `M1.2` | 2026-09-12, fatiada |
| `M1.4-ci-verificacao` | M1 · CI | dividida | `planejada` | `M0.1` | 2026-09-12, fatiada |
| `M1.5-compose-e-caddy` | M1 · CI | dividida | `planejada` | `M0.1` | 2026-09-12, fatiada |
| `M1.6-deploy-na-casa` | M1 · CI | dividida | `planejada` | `M1.4`, `M1.5` | 2026-09-12, fatiada |
