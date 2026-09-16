# Fase 1 — backlog

> O que apareceu durante a implementação e não entra no escopo da fase.
> Ideia boa fora do escopo mora aqui, não dentro de um contrato.
> Só o operador promove uma linha daqui a unidade de trabalho.

| # | O que | De onde veio | Por que ficou fora |
|---|---|---|---|
| 1 | O `README.md` não diz como recriar o ruleset da `main` se alguém apagar a regra. O comando existe só dentro de `execucao.md`. | `M1.4-ci-verificacao`, observação 3 da revisão | Documentação de operação é entrega do M11, e a unidade já estava fechada no DoD. |
| 2 | As actions do workflow estão presas por tag, não por SHA, e o workflow não declara `permissions`. | `M1.4-ci-verificacao`, achado do condutor no GATE 2 | Hoje o workflow não usa nenhum segredo. Vira exigência quando `M1.6-deploy-na-casa` colocar a chave SSH de deploy na CI. |
