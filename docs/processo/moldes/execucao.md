> Unidade: `<id>` · Marco: `<M?>` · Trilha: `única | dividida`
> Estado: em revisão
> Executor · Ferramenta: `<ferramenta e modelo>` · Data: `<AAAA-MM-DD>` · Rodada: `1`
> Contrato aprovado em: condutor `<data>` · operador `<data>`

# Execução — `<id>`

## O que ficou pronto

Até uma página, em comportamento observável. O que passa a funcionar e como se usa.

## Testes antes da implementação

Os testes dos itens de comportamento do DoD, rodados antes de qualquer código da unidade.
A saída tem que mostrar que eles falham.

```
$ <comando de teste>
<saída real com as falhas>
```

## Arquivos tocados

Saída real, não lista de memória:

```
$ git diff --stat <base>..HEAD
```

Compare com a lista de arquivos afetados do contrato. Divergência entra em bloqueios.

## Definition of Done

Item a item, com a saída real do comando. Nada de verde sem prova.

### DoD 1 — `<item do contrato>`
Situação: `atendido | não atendido | não verificado`
```
$ <comando>
<saída real>
```

### DoD 2 — ...

### DoD geral da fase
Item a item, no mesmo formato.

### CI
Depois que `M1.4-ci-verificacao` fechar: o resultado da CI no último commit da unidade.
```
$ gh run list --commit <sha>
<saída real>
```

## Bloqueios e dúvidas

Contrato ambíguo, item de DoD impossível, decisão que não era do executor. Se houver algo
aqui, a execução para e volta ao condutor.

`Nenhum`, se for o caso.

## Encontrado e não tocado

O que você viu e que o condutor precisa saber, mas que estava fora do contrato. Não
conserte; relate.

## Como reverter

O comando ou o passo que desfaz esta unidade sozinha.
