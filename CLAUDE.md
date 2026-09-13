# Casa Automática — regras do repositório

Software da casa de três moradores. Produto real e projeto de estudo. Time pequeno,
informal, trabalha nas horas vagas. **Processos leves, mas escritos.**

O operador é o Marcos. Ele é a última palavra em produto, arquitetura e escopo.

## Invariantes

1. **Nada é assumido.** Decisão de produto, arquitetura ou modelagem que não esteja
   escrita em `docs/scope-brief.md`, no roadmap da fase ou no contrato da unidade não
   existe. Ponto em aberto vira pergunta ao operador, não palpite.
2. **Nenhuma linha de código antes de um contrato aprovado.** Aprovado quer dizer:
   revisado pelo condutor **e** aprovado pelo operador, com data no cabeçalho do contrato.
3. **Toda implementação passa pelo ciclo.** Ordem → exploração → contrato → execução →
   revisão → fechamento. O ciclo está em `.claude/rules/02-ciclo.md`.
4. **A documentação é o produto intermediário.** Se a decisão não está num arquivo
   versionado em `docs/`, ela não foi tomada.
5. **Idioma:** código, tabelas e colunas em inglês. Documentos, comentários de processo
   e textos de interface em pt-BR.
6. **Itens `[A VALIDAR]`** são verificados e reportados antes de qualquer trabalho que
   dependa deles.

## Papéis

Quatro papéis, descritos em `.claude/rules/01-papeis.md` e implementados em
`.claude/agents/`:

| Papel | Agente | Faz | Nunca faz |
|---|---|---|---|
| Condutor | `condutor` | fatia a fase, emite ordens, escreve e revisa contratos, decide a trilha | escrever código de produção |
| Explorador | `explorador` | investiga e produz o relatório de exploração | alterar código |
| Executor | `executor` | implementa exatamente o contrato aprovado | decidir escopo ou delegar |
| Revisor | `revisor` | confere a entrega contra o DoD | corrigir o que revisou |

## Skills

| Skill | Quem usa | Para quê |
|---|---|---|
| `/conduzir-fase` | operador | abre e conduz uma fase ou um trecho dela |
| `/explorar-unidade` | condutor | investiga uma unidade e escreve o relatório |
| `/executar-contrato` | condutor | implementa um contrato aprovado |
| `/revisar-entrega` | condutor | revisa a execução contra o DoD |

## Onde está cada coisa

- `docs/scope-brief.md` — escopo e decisões de produto do MVP. Fonte de verdade.
- `docs/handoff.md` — brief original, mantido como histórico. Não é fonte de verdade.
- `docs/fase 1/roadmap.md` — marcos da Fase 1.
- `docs/fase 1/dod.md` — Definition of Done geral da fase. Vale por cima de todo contrato. Aprovado pelo operador em 2026-09-12.
- `docs/fase 1/estado.md` — quadro de estado das unidades.
- `docs/fase 1/backlog.md` — o que apareceu fora do escopo da fase. Só o operador promove uma linha a unidade.
- `docs/fase 1/unidades/<id>/` — os cinco documentos de cada unidade de trabalho.
- `.claude/rules/` — as regras completas. `.claude/templates/` — os moldes dos documentos.

## Regras completas

- `.claude/rules/01-papeis.md` — o que cada papel pode e não pode fazer.
- `.claude/rules/02-ciclo.md` — o ciclo, as trilhas, os estados e os gates.
- `.claude/rules/03-artefatos.md` — nomes, pastas, versionamento e commits.
- `.claude/rules/04-decisoes.md` — hierarquia de decisão e o que fazer diante de dúvida.
- `.claude/rules/05-escrita.md` — como escrever os documentos.
