> Fase: `<N>` · Documento: Definition of Done geral
> Estado: `aguardando operador | aprovado`
> Condutor redigiu: `<AAAA-MM-DD>` · Operador aprovou: `—`
> Base: `docs/scope-brief.md` e `docs/fase N/roadmap.md`

# Definition of Done — Fase `<N>`

## Como usar

- Este DoD vale por cima de todo contrato da fase. O contrato não repete estes itens.
- O revisor percorre este documento e o DoD do contrato, item a item. Item não verificado
  reprova.
- Cada seção diz a partir de quando vale. Antes disso, o revisor marca o item como
  `não se aplica` e cita a unidade que ainda não fechou.
- Um contrato pode endurecer um item. Um contrato não afrouxa um item. Exceção exige
  aprovação do operador escrita no próprio contrato.
- A coluna Origem diz de onde veio cada item. `proposta` quer dizer que o brief e o
  roadmap não fixam o item. Ele passa a valer só com a aprovação deste documento.

## A. `<tema>` · vale `desde já | a partir de <id da unidade>`

| # | Item | Como verificar | Origem |
|---|---|---|---|
| A1 | Uma exigência por linha, em comportamento observável. | `<comando>` e o que esperar da saída, ou a leitura objetiva que confirma. | `regra NN` / `roadmap M?` / `brief §?` / `proposta` |
| A2 | ... | ... | ... |

Comando longo de verificação fica num bloco de código logo abaixo da tabela, e o item
aponta para ele.

## B. `<tema>` · vale `...`

Uma seção por tema: processo, build, testes, CI, segredos, idioma, banco, API,
documentação, servidor. Só entram os temas que a fase toca.

## O que este DoD não exige

O que um revisor poderia cobrar e não deve. Cada linha diz por quê.

## Perguntas ao operador

No formato da regra 05, ou `Nenhuma`.

Depois da resposta, a seção passa a se chamar `## Decisões do operador`. Cada pergunta
fica com a opção escolhida, a data e o item de DoD que ela sustenta.
