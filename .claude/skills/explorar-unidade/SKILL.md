---
name: explorar-unidade
description: Executa a exploração de uma unidade de trabalho do Casa Automática a partir de uma ordem emitida pelo condutor, e entrega o relatório de exploração com evidência. Use quando existir uma ordem em docs/fase N/unidades/<id>/ordem.md e a unidade estiver em exploração.
---

# Explorar uma unidade

Argumento esperado: o identificador da unidade, por exemplo `M0.1-monorepo-base`.

Sem ordem escrita, não há exploração. Se `docs/fase N/unidades/<id>/ordem.md` não
existir, pare e devolva ao condutor.

## Como rodar

Despache o agente `explorador` com o prompt de `docs/processo/prompts/explorador.md`. Ele é
auto-suficiente de propósito: quem explora não precisa do contexto de quem conduz.

Quando a exploração for curta e você já for o condutor na mesma sessão, pode fazer aqui
mesmo, mas siga o prompt de `docs/processo/prompts/explorador.md` como se fosse outro agente:
nenhuma alteração no repositório fora do `exploracao.md`.

## O que o relatório precisa entregar

1. **Resumo de até dez linhas**, primeiro. O condutor lê isso antes de tudo.
2. **Respostas**, uma por pergunta da ordem, na ordem em que ela perguntou. Cada resposta
   traz a evidência: caminho e linha do arquivo, saída do comando, URL e o que ela devolveu.
3. **Superfície:** arquivos que serão tocados, o que já existe, o que não existe.
4. **Achados não previstos** pela ordem, que mudam o desenho.
5. **Opções**, quando houver mais de um caminho razoável: cada uma com custo e
   consequência. Propõe, não escolhe.
6. **Não descoberto:** o que ficou sem resposta e por quê.
7. **Perguntas ao operador**, no formato da regra 05.

Separe fato verificado de hipótese sua. Marque a hipótese como hipótese. Versão de
dependência e comportamento de biblioteca só são fato com comando, tipos instalados ou
documentação oficial da versão instalada.

## Sinais de exploração fraca

Devolva ou refaça quando o relatório:

- só confirma o que já se esperava, sem nenhum achado;
- afirma sem mostrar comando, arquivo ou URL;
- escolhe um caminho em vez de apresentar as opções;
- não diz o que não conseguiu descobrir;
- responde metade das perguntas da ordem.

## Ao terminar

Estado da unidade vira `contrato em rascunho`. Commit:
`docs(<id>): relatório de exploração`. O contrato é do condutor, não seu.
