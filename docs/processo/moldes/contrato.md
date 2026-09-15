> Unidade: `<id>` · Marco: `<M?>` · Trilha: `única | dividida`
> Estado: aguardando operador
> Condutor aprovou: `<AAAA-MM-DD>` · Operador aprovou: `—`
> Base: `ordem.md`, `exploracao.md`, `docs/scope-brief.md`, `docs/fase N/dod.md`

# Contrato — `<id>`

Este documento é auto-suficiente. Quem executa não leu a exploração e não vai lê-la.
Tudo que a execução precisa está aqui ou nos arquivos nomeados aqui.

## O que será construído

Três a seis linhas, em comportamento observável. O que passa a existir e o que passa a
ser possível fazer.

## Interfaces e formatos

O concreto: assinaturas, rotas, schemas Zod, nomes de tabela e coluna, formato de erro,
variáveis de ambiente. Nomes em inglês, como manda o repositório.

```ts
// exemplo do formato esperado
```

Não escreva conteúdo de arquivo de configuração. Descreva o efeito esperado e deixe o DoD
conferir.

Decisão de produto ou de modelagem que sustenta isto: aponte a linha de
`docs/scope-brief.md`. Não copie a decisão para cá; duas fontes de verdade divergem.

## Dependências novas

Lista fechada. O executor não adiciona pacote nem muda versão fora dela.

| Pacote | Versão | De onde saiu a versão |
|---|---|---|
| `nome` | `x.y.z` | saída de `pnpm view <pacote> version` ou linha do lockfile |

`Nenhuma`, se for o caso.

## Arquivos afetados

Lista fechada. O executor não escreve fora dela.

| Arquivo | Ação |
|---|---|
| `caminho` | criar / alterar / remover |

## Fora deste contrato

O que **não** será feito nesta unidade, mesmo sendo tentador. É esta seção que impede o
executor de aproveitar a viagem.

## Definition of Done

Cada item é verificável por um comando ou por uma observação objetiva. "Funciona bem"
não é item.

| # | Item | Como verificar | Teste |
|---|---|---|---|
| 1 | ... | `<comando>` e o que esperar da saída | arquivo e nome do teste que vai provar o item, ou `verificação manual` com a evidência esperada |
| 2 | ... | ... | ... |

No máximo dez itens. Se precisar de mais, a unidade está mal fatiada.

O DoD geral em `docs/fase N/dod.md` vale por cima deste e não precisa ser repetido aqui.

## Riscos

| Risco | Sinal de que aconteceu | O que fazer |
|---|---|---|
| ... | ... | parar e reportar / seguir o plano B descrito |

## Depende de

Unidades que precisam estar `fechada`, ou `—`.

## Teste de auto-suficiência

Aplicado pelo condutor antes do GATE 1.

> Um executor que leu só este contrato, as regras do repositório e os arquivos nomeados
> acima consegue entregar sem fazer nenhuma pergunta?

Resposta: `sim` · Verificado em: `<AAAA-MM-DD>`

## Perguntas ao operador

No formato da regra 05, ou `Nenhuma`.

## Alterações

Só para contrato já aprovado que mudou. Cada linha exige novo GATE 1.

| Data | O que mudou | Motivo | Reaprovado em |
|---|---|---|---|
