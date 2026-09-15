# Regra 03 — Artefatos, pastas e commits

## Árvore

```
AGENTS.md                     porta de entrada para qualquer ferramenta de IA
CLAUDE.md                     só carrega AGENTS.md e as regras no Claude Code
docs/
  processo/                   as regras 01 a 06
    moldes/                   os moldes dos documentos
    prompts/                  o prompt de cada papel
  scope-brief.md              escopo e decisões de produto do MVP (fonte de verdade)
  handoff.md                  brief original, histórico, não é fonte de verdade
  fase 1/
    roadmap.md                marcos M0–M11
    dod.md                    Definition of Done geral da fase
    estado.md                 quadro de estado das unidades
    backlog.md                o que apareceu fora do escopo da fase
    unidades/
      M0.1-monorepo-base/
        ordem.md              o pedido do condutor
        exploracao.md         o relatório do explorador
        contrato.md           o que será construído + DoD  ← documento aprovado
        execucao.md           o registro do executor
        revisao.md            veredito e rodadas de correção
```

Fases seguintes repetem a estrutura em `docs/fase N/`.

Os cinco documentos usam os moldes de `docs/processo/moldes/`. Documento que ainda não
existe simplesmente não está lá; não se cria arquivo vazio.

## Cabeçalho obrigatório

Todo documento de unidade começa com um bloco de citação:

```markdown
> Unidade: M0.1-monorepo-base · Marco: M0 · Trilha: dividida
> Estado: aguardando operador
> Condutor aprovou: 2026-09-12 · Operador aprovou: —
```

Exploração, execução e revisão acrescentam ao cabeçalho a ferramenta e o modelo que as
produziram.

O estado no cabeçalho e o estado em `estado.md` têm que bater. Divergência é erro.

## Aprovações

Aprovação é uma data no cabeçalho, escrita por quem aprovou, mais uma linha em
`revisao.md` ou no fim do contrato dizendo o que foi aprovado e com qual ressalva.

Não existe aprovação tácita. Silêncio do operador é `aguardando operador`, não "aprovado".

Quando o operador aprova com ressalva, a ressalva vira item do DoD ou uma unidade nova.
Ressalva que não vira nenhuma das duas se perde, e aí não foi ressalva, foi conversa.

## Versionamento

Documento aprovado não é editado em silêncio. Mudança em contrato já aprovado exige:
1. registrar a mudança numa seção `## Alterações` no fim do contrato, com data e motivo;
2. novo GATE 1.

Correção de digitação e formatação não precisa de gate; qualquer coisa que mude o que
será construído ou o DoD, precisa.

## Commits

Um commit por gate, no mínimo. Mensagem em pt-BR, prefixo convencional.

| Momento | Mensagem |
|---|---|
| ordem emitida | `docs(M0.1): ordem de exploração` |
| exploração entregue | `docs(M0.1): relatório de exploração` |
| contrato em rascunho | `docs(M0.1): contrato para aprovação` |
| GATE 1 vencido | `docs(M0.1): contrato aprovado` |
| execução | `feat(M0.1): <o que foi construído>` |
| correção | `fix(M0.1): rodada 2 de correções` |
| GATE 2 vencido | `docs(M0.1): unidade fechada` |

Código e documento da mesma unidade podem ir no mesmo commit de execução. O commit de
fechamento carrega só documentação.

Branch por unidade quando a execução for longa ou arriscada: `unidade/M0.1-monorepo-base`.
Unidade curta pode ir direto na `main`. Quem decide é o condutor, e a decisão fica na ordem.

Depois que `M1.4-ci-verificacao` fechar, a proteção da `main` definida no contrato dela
vale por cima do parágrafo anterior.
