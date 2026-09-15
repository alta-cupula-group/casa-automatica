# Casa Automática — regras do repositório

Software da casa de três moradores. Produto real e projeto de estudo. Time pequeno,
informal, trabalha nas horas vagas. **Processos leves, mas escritos.**

O operador é o Marcos. Ele é a última palavra em produto, arquitetura e escopo.

Este arquivo vale para qualquer ferramenta de IA. Leia-o inteiro antes de qualquer tarefa,
e depois leia as regras em `docs/processo/`.

## Invariantes

1. **Nada é assumido.** Decisão de produto, arquitetura ou modelagem que não esteja
   escrita em `docs/scope-brief.md`, no roadmap da fase ou no contrato da unidade não
   existe. Ponto em aberto vira pergunta ao operador, não palpite.
2. **Nenhuma linha de código antes de um contrato aprovado.** Aprovado quer dizer:
   revisado pelo condutor **e** aprovado pelo operador, com data no cabeçalho do contrato.
3. **Toda implementação passa pelo ciclo.** Ordem → exploração → contrato → execução →
   revisão → fechamento. O ciclo está em `docs/processo/02-ciclo.md`.
4. **A documentação é o produto intermediário.** Se a decisão não está num arquivo
   versionado em `docs/`, ela não foi tomada.
5. **Idioma:** código, tabelas e colunas em inglês. Documentos, comentários de processo
   e textos de interface em pt-BR.
6. **Itens `[A VALIDAR]`** são verificados e reportados antes de qualquer trabalho que
   dependa deles.
7. **Pronto se prova, não se afirma.** Item só está pronto com a saída do comando que o
   verifica ou com a CI verde. Relato de agente não é prova.
8. **Nada de memória sobre ferramenta.** Versão de dependência e comportamento de
   biblioteca vêm do repositório ou da documentação oficial, com a evidência. O resto é
   hipótese e se marca como hipótese.

## Regras

Leia todas antes de trabalhar:

- `docs/processo/01-papeis.md` — o que cada papel pode e não pode fazer.
- `docs/processo/02-ciclo.md` — o ciclo, as trilhas, os estados e os gates.
- `docs/processo/03-artefatos.md` — nomes, pastas, versionamento e commits.
- `docs/processo/04-decisoes.md` — hierarquia de decisão e o que fazer diante de dúvida.
- `docs/processo/05-escrita.md` — como escrever os documentos.
- `docs/processo/06-ferramentas.md` — como trabalhar com qualquer ferramenta de IA.

## Papéis

Quatro papéis, descritos em `docs/processo/01-papeis.md`. Cada papel começa com o prompt
de `docs/processo/prompts/`.

| Papel | Faz | Nunca faz | Prompt |
|---|---|---|---|
| Condutor | fatia a fase, emite ordens, escreve e revisa contratos, decide a trilha | escrever código de produção | este arquivo e as regras |
| Explorador | investiga e produz o relatório de exploração | alterar código | `explorador.md` |
| Executor | implementa exatamente o contrato aprovado | decidir escopo ou delegar | `executor.md` ou `executor-trilha-unica.md` |
| Revisor | confere a entrega contra o DoD | corrigir o que revisou | `revisor.md` |

## Onde está cada coisa

- `docs/scope-brief.md` — escopo e decisões de produto do MVP. Fonte de verdade.
- `docs/handoff.md` — brief original, mantido como histórico. Não é fonte de verdade.
- `docs/processo/` — as regras. `docs/processo/moldes/` — os moldes dos documentos.
  `docs/processo/prompts/` — os prompts de cada papel.
- `docs/fase 1/roadmap.md` — marcos da Fase 1.
- `docs/fase 1/dod.md` — Definition of Done geral da fase. Vale por cima de todo contrato. Aprovado pelo operador em 2026-09-12.
- `docs/fase 1/estado.md` — quadro de estado das unidades.
- `docs/fase 1/backlog.md` — o que apareceu fora do escopo da fase. Só o operador promove uma linha a unidade.
- `docs/fase 1/unidades/<id>/` — os cinco documentos de cada unidade de trabalho.

## Por ferramenta

- **Claude Code:** `CLAUDE.md` carrega este arquivo e as regras. Os agentes de
  `.claude/agents/` e as skills de `.claude/skills/` são atalhos para os papéis.
- **Qualquer outra ferramenta:** siga `docs/processo/06-ferramentas.md`.

Onde um atalho de ferramenta divergir de `docs/processo/`, vale `docs/processo/`.
