# Fase `<N>` — quadro de estado

> Fonte de verdade do andamento. Atualizado pelo condutor a cada transição.
> O estado aqui e o cabeçalho de cada documento de unidade têm que bater.
> Estados possíveis: `.claude/rules/02-ciclo.md`.

## Pendências de fase

O que precisa estar resolvido antes de uma unidade andar: roadmap, DoD, `[A VALIDAR]`,
fatiamento.

| # | O que | Situação |
|---|---|---|
| 1 | `docs/fase N/roadmap.md` aprovado pelo operador | `aberta` / `resolvida`, com a data e quem resolveu |
| 2 | `docs/fase N/dod.md` aprovado pelo operador | ... |

Item `[A VALIDAR]` vira ordem de exploração própria antes da unidade que depende dele.
Ver `.claude/rules/04-decisoes.md`.

## Marcos

Do `roadmap.md`. Um marco vira uma ou mais unidades no fatiamento.

| Marco | Entrega | Unidades | Situação |
|---|---|---|---|
| M0 | `<nome do marco>` | `M0.1` | `não fatiado` / `fatiado em <data>` / `fechado em <data>` |

## Fatiamento da Etapa `<n>` · `proposto | aprovado`

Proposto pelo condutor em `<AAAA-MM-DD>`. Aprovado pelo operador em `<AAAA-MM-DD>`.

| Unidade | Marco | Entrega | Depende de | Trilha |
|---|---|---|---|---|
| `M0.1-<slug>` | M0 | Uma a três frases, em comportamento observável. | `—` | `única` / `dividida`, e o critério da regra 02 que decidiu |

Ordem de trabalho:

| Onda | Unidades | Condição para começar |
|---|---|---|
| 1 | `M0.1` | ... |

## Unidades

Uma linha por unidade, inclusive as abandonadas.

| Unidade | Marco | Trilha | Estado | Depende de | Última transição |
|---|---|---|---|---|---|
| `M0.1-<slug>` | M0 | `única` / `dividida` | `planejada` | `—` | `<AAAA-MM-DD>`, o que mudou |
