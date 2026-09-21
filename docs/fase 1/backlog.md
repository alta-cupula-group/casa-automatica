# Fase 1 — backlog

> O que apareceu durante a implementação e não entra no escopo da fase.
> Ideia boa fora do escopo mora aqui, não dentro de um contrato.
> Só o operador promove uma linha daqui a unidade de trabalho.

| # | O que | De onde veio | Por que ficou fora |
|---|---|---|---|
| 1 | O `README.md` não diz como recriar o ruleset da `main` se alguém apagar a regra. O comando existe só dentro de `execucao.md`. | `M1.4-ci-verificacao`, observação 3 da revisão | Documentação de operação é entrega do M11, e a unidade já estava fechada no DoD. |
| 2 | As actions do workflow estão presas por tag, não por SHA, e o workflow não declara `permissions`. | `M1.4-ci-verificacao`, achado do condutor no GATE 2 | Hoje o workflow não usa nenhum segredo. Vira exigência quando `M1.6-deploy-na-casa` colocar a chave SSH de deploy na CI. |
| 3 | Cabeçalhos HTTP de segurança (CSP, HSTS, o que impede `iframe` de outro site) ainda não têm unidade dona. `docs/scope-brief.md`, seção 3.5, já exige o comportamento. | Pedido do operador em 2026-09-20 | **Saiu do backlog.** O operador promoveu esta linha à unidade `M1.8-cabecalhos-seguranca` em 2026-09-20. Os cabeçalhos ficam no Caddy, que já existe desde a `M1.5`. Cabeçalho que só a API pode emitir entra no fatiamento do M2. |
| 4 | Auditoria de dependências vulneráveis (tipo `pnpm audit`) no CI ainda não tem unidade dona. `docs/scope-brief.md`, seção 3.5, já exige o comportamento. | Pedido do operador em 2026-09-20 | **Saiu do backlog.** O operador promoveu esta linha à unidade `M1.9-auditoria-dependencias` em 2026-09-20. |
| 5 | `apps/api/src/db/migrate-cli.ts` roda o TypeScript do `src` com `module.registerHooks`, que a documentação do Node 26 marca como release candidate. | `M1.2-ambientes-e-migracoes`, observação 1 da revisão | Funciona hoje e tem teste. Trocar por outra forma de rodar sem build muda o `tsconfig`, que o contrato não liberava. |
| 6 | A migração `0000_api_role` cria `api_app` só se ele não existe. Um `api_app` criado à mão com outros atributos não seria corrigido por ela. | `M1.2-ambientes-e-migracoes`, observação 3 da revisão | O papel não existia em nenhum ambiente antes da migração. Vira preocupação só se alguém criar o papel fora dela. |
