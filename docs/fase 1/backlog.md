# Fase 1 — backlog

> O que apareceu durante a implementação e não entra no escopo da fase.
> Ideia boa fora do escopo mora aqui, não dentro de um contrato.
> Só o operador promove uma linha daqui a unidade de trabalho.

| # | O que | De onde veio | Por que ficou fora |
|---|---|---|---|
| 1 | O `README.md` não diz como recriar o ruleset da `main` se alguém apagar a regra. O comando existe só dentro de `execucao.md`. | `M1.4-ci-verificacao`, observação 3 da revisão | Documentação de operação é entrega do M11, e a unidade já estava fechada no DoD. |
| 2 | As actions do workflow estão presas por tag, não por SHA, e o workflow não declara `permissions`. | `M1.4-ci-verificacao`, achado do condutor no GATE 2 | Hoje o workflow não usa nenhum segredo. Vira exigência quando `M1.6-deploy-na-casa` colocar a chave SSH de deploy na CI. |
| 3 | Cabeçalhos HTTP de segurança (CSP, HSTS, o que impede `iframe` de outro site) ainda não têm unidade dona. `docs/scope-brief.md`, seção 3.5, já exige o comportamento. | Pedido do operador em 2026-09-20 | Precisa do Caddy (`M1.5`, fechada) e da API (`M2`, não fatiado) existindo antes de decidir onde cada cabeçalho é setado. Nenhuma unidade aberta é dona natural disso ainda. |
| 4 | Auditoria de dependências vulneráveis (tipo `pnpm audit`) no CI ainda não tem unidade dona. `docs/scope-brief.md`, seção 3.5, já exige o comportamento. | Pedido do operador em 2026-09-20 | `M1.4-ci-verificacao` já fechou sem isso. Vira unidade nova quando o operador decidir a prioridade dela contra o resto do roadmap. |
