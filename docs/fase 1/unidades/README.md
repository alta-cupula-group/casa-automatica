# Unidades de trabalho

Uma pasta por unidade, nomeada `M<marco>.<sequência>-<slug>`. Exemplos:
`M0.1-monorepo-base`, `M5.2-acertos-e-pix`.

Cada pasta guarda até cinco documentos, criados na ordem do ciclo:

| Arquivo | Quem escreve | Quando |
|---|---|---|
| `ordem.md` | condutor | ao abrir a unidade |
| `exploracao.md` | explorador | depois da ordem |
| `contrato.md` | condutor | depois da exploração. **É o documento aprovado** |
| `execucao.md` | executor | depois do GATE 1 |
| `revisao.md` | revisor ou condutor | depois da execução |

Documento que ainda não existe simplesmente não está aqui. Não se cria arquivo vazio.

Documento de unidade **nunca é apagado**, nem quando a unidade é abandonada. O histórico
de por que algo não foi feito vale tanto quanto o de por que foi.

O ciclo, as trilhas e os gates estão em `.claude/rules/02-ciclo.md`. Os moldes estão em
`.claude/templates/`.
