# Regra 02 — Ciclo, trilhas, estados e gates

## Unidade de trabalho

A menor coisa que vale um contrato próprio. Sai do fatiamento de um marco do roadmap.

Um marco pode virar uma ou várias unidades. Uma unidade nunca atravessa dois marcos.

Identificador: `M<marco>.<sequência>-<slug>`. Exemplos: `M0.1-monorepo-base`,
`M5.2-acertos-e-pix`. O slug é curto, em pt-BR, sem acento.

Uma unidade está bem fatiada quando:
- cabe num contrato que uma pessoa lê em cinco minutos;
- o DoD do contrato tem no máximo dez itens;
- tem um critério de pronto verificável sem depender de outra unidade em andamento;
- pode ser revertida sozinha, sem desmontar o que já fechou.

## O ciclo

```
ordem  →  exploração  →  contrato  →  [GATE 1]  →  execução  →  revisão  →  [GATE 2]  →  fechada
                             ↑                                      |
                             └──────── contrato reaberto ───────────┘
                                       (após 3 rodadas de correção)
```

1. **Ordem.** O condutor escreve `ordem.md`: contexto, o que investigar, perguntas a
   responder, limites, e a trilha escolhida com a justificativa.
2. **Exploração.** O explorador responde a ordem em `exploracao.md`. Não decide, não
   altera código.
3. **Contrato.** O condutor escreve `contrato.md` a partir da exploração: o que será
   construído, interfaces e formatos, arquivos afetados, o que fica de fora, riscos, e o
   DoD verificável. O contrato descreve comportamento e verificação, não conteúdo de
   arquivo, como manda a regra 05.
4. **GATE 1 — contrato aprovado.** Duas aprovações: condutor e operador, com data no
   cabeçalho. Sem as duas, nenhuma linha de código.
5. **Execução.** O executor escreve primeiro os testes dos itens de comportamento do DoD
   e registra que falham. Depois implementa e registra tudo em `execucao.md`.
6. **Revisão.** O revisor confere contra o DoD e escreve `revisao.md`.
7. **GATE 2 — entrega aprovada.** Condutor aprova tecnicamente, operador dá o veredito.
   Reprovação vira rodada de correção, numerada dentro do próprio `revisao.md`. Depois que
   `M1.4-ci-verificacao` fechar, entrega sem CI verde não chega ao GATE 2.
8. **Fechada.** `estado.md` atualizado, commit de fechamento.

## Trilhas

O condutor escolhe a trilha **antes** de emitir a ordem e registra a escolha na ordem.

### Trilha única

Um agente explora, o condutor escreve o contrato, e o **mesmo** agente executa depois da
aprovação. Ele mantém o contexto da exploração.

Escolher quando **todas** forem verdadeiras:
- a unidade toca poucos arquivos, todos já conhecidos;
- não há decisão de produto ou arquitetura em aberto;
- a exploração é curta e quase tudo que ela descobre entra no contrato;
- o gate do operador deve ser rápido, sem pausa longa entre aprovar e executar.

### Trilha dividida

Um agente explora e encerra. Depois da aprovação, um agente **novo, com contexto zerado**,
executa lendo só o contrato, as regras e os arquivos que o contrato nomeia. Em ferramenta
sem subagente, o agente novo é uma conversa nova, como descreve a regra 06.

Escolher quando **qualquer uma** for verdadeira:
- a unidade é fundacional ou define contrato que outras unidades vão consumir: schema,
  migração, OpenAPI, ledger, pipeline;
- a exploração envolve investigação externa que gera muito material descartável (portal
  da SEFAZ, limites do Supabase, comportamento de biblioteca);
- há `[A VALIDAR]` ou decisão de produto pendente, e o gate do operador vai demorar;
- duas ou mais unidades serão executadas a partir da mesma exploração;
- a execução, sozinha, é longa o bastante para encher um contexto.

**Na dúvida, trilha dividida.** O custo é reescrever um contrato; o custo do erro contrário
é um executor implementando uma hipótese que a exploração já tinha descartado.

### Teste de auto-suficiência

Vale nas duas trilhas, aplicado pelo condutor antes de levar o contrato ao operador:

> Um executor que leu só este contrato, as regras do repositório e os arquivos que o
> contrato nomeia consegue entregar sem fazer nenhuma pergunta?

Se a resposta for não, o contrato está incompleto. Não se resolve mandando o executor ler
a exploração; resolve-se escrevendo no contrato o que falta. A trilha dividida existe
também para forçar esse teste a ser honesto.

## Estados

Toda unidade tem exatamente um estado, registrado em `docs/fase 1/estado.md`.

| Estado | O que significa | Próximo passo |
|---|---|---|
| `planejada` | fatiada, sem ordem escrita | condutor emite a ordem |
| `em exploração` | ordem emitida | explorador entrega o relatório |
| `contrato em rascunho` | exploração pronta | condutor escreve o contrato |
| `aguardando operador` | condutor aprovou o contrato | operador aprova ou devolve |
| `aprovada` | GATE 1 vencido | executor começa |
| `em execução` | executor trabalhando | executor entrega o registro |
| `em revisão` | execução entregue | revisor emite o veredito |
| `em correção` | revisão reprovou | executor corrige, rodada N+1 |
| `fechada` | GATE 2 vencido | nada |
| `bloqueada` | depende de decisão do operador ou de outra unidade | registrar o bloqueio na ordem |
| `abandonada` | o operador cancelou | registrar o porquê e não apagar os documentos |

## Correção e reabertura de contrato

Reprovação na revisão abre uma rodada de correção, numerada em `revisao.md`. A rodada
lista correções objetivas; o executor faz só o que está na lista.

**Na terceira reprovação da mesma unidade, o condutor para de corrigir a execução e
reabre o contrato.** Três rodadas quer dizer que o problema está no que foi pedido, não
em quem fez. Reabrir o contrato exige novo GATE 1.

## O que nunca acontece

- Código antes do GATE 1.
- Contrato aprovado só pelo condutor, ou só pelo operador.
- Executor ampliando escopo, mesmo com boa intenção.
- Revisor consertando o que revisou.
- Unidade fechada com item de DoD não verificado.
- Item de DoD dado como atendido sem saída de comando ou resultado de CI.
- Código de comportamento escrito antes do teste que o prova.
- Documento de unidade apagado. Unidade abandonada continua no repositório.
