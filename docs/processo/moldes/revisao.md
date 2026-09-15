> Unidade: `<id>` · Marco: `<M?>`
> Estado: `em correção | fechada`
> Revisor: `condutor | revisor separado` · Ferramenta: `<ferramenta e modelo>` · Data: `<AAAA-MM-DD>`

# Revisão — `<id>`

## Veredito

`aprovado | aprovado com ressalva | reprovado`

Uma frase dizendo por quê.

## Rodada 1

### DoD do contrato

| # | Item | Veredito | Evidência |
|---|---|---|---|
| 1 | ... | atendido / não atendido / não verificável | saída do comando que **o revisor** rodou |

### DoD geral da fase

| # | Item | Veredito | Evidência |
|---|---|---|---|

### Escopo

```
$ git diff --stat <base>..HEAD
```

Bate com a lista de arquivos afetados do contrato? Arquivo a mais é achado, mesmo que a
mudança seja boa.

### Regras do repositório

- Código e banco em inglês: `ok | não`
- Nada assumido fora do brief: `ok | não`
- Nenhum `[A VALIDAR]` tratado como resolvido: `ok | não`
- Cabeçalhos e `estado.md` coerentes: `ok | não`
- Testes de comportamento falharam antes da implementação: `ok | não`
- Nenhuma dependência ou versão fora do contrato: `ok | não`
- CI verde no último commit, depois de `M1.4-ci-verificacao`: `ok | não | não se aplica`
- Em unidade de risco, ferramenta ou modelo diferente do executor: `ok | não havia outro | não se aplica`

### Correções exigidas

Numeradas, objetivas, verificáveis. É só isto que volta para o executor.

1. ...
2. ...

### Observações

Achados fora do escopo do contrato. Não são correções obrigatórias. Cada um vira item de
DoD de outra unidade, linha de backlog, ou nada, e o condutor diz qual.

## Rodada 2

Mesma estrutura. Na **terceira reprovação**, pare de corrigir a execução: o condutor
reabre o contrato e a unidade volta ao GATE 1.

## GATE 2

- Aprovação técnica: `<revisor ou condutor>` em `<data>`
- Veredito do operador: `aprovado | devolvido` em `<data>`
- Ressalva e destino: `<item de DoD de qual unidade | linha de backlog | nenhuma>`
