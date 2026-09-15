> Unidade: `M1.4-ci-verificacao` · Marco: `M1 · CI` · Trilha: `dividida`
> Estado: em exploração
> Emitida por: condutor · Data: 2026-09-15

# Ordem de exploração — `M1.4-ci-verificacao`

## Contexto

O monorepo existe desde `M0.1-monorepo-base`. A raiz tem os scripts `build`, `lint`,
`typecheck`, `test` e `format:check`, e fixa `pnpm@12.4.1` em `packageManager` e Node
`>=26` em `engines`. Nada roda fora da máquina de quem commita: não há workflow, git hook
nem proteção da `main`. O repositório `casa-automatica/casa-automatica` é público e
pertence à organização `casa-automatica`.

Em 2026-09-15 o operador decidiu que esta unidade vai antes de `M1.2` e `M1.5`, e
ampliou a entrega: além da CI, um git hook local e a proteção da `main`. O motivo está
em `docs/processo/06-ferramentas.md`: a garantia de qualidade tem que ser mecânica e
igual para qualquer ferramenta de IA.

## O que esta unidade deve entregar

Todo push e todo PR rodam lint, tipos, testes e build no GitHub Actions; commit com erro
de lint ou de tipo é barrado na máquina de quem commitou; código só entra na `main` com
a CI verde.

## Trilha escolhida

`dividida`. É pipeline, critério direto da regra 02. Toda unidade seguinte passa por
aqui, e a proteção da `main` muda como todo mundo trabalha.

A auto-suficiência do contrato importa porque o executor precisa ver o workflow rodando
de verdade no GitHub, e o contrato tem que dizer como ele prova isso sem admin da
organização.

## Perguntas a responder

1. **P1** — Qual sequência de passos instala Node e pnpm num runner do GitHub Actions
   respeitando `packageManager` e `engines` do `package.json`, e roda os cinco comandos
   da raiz? Diga como o cache do pnpm entra e o que a documentação oficial do pnpm e do
   GitHub recomenda, com URL.
2. **P2** — O que falha hoje num clone limpo, sem `.env`, num Ubuntu sem nada instalado?
   Simule num diretório temporário: clone, instale, rode os cinco comandos. Mostre a
   saída. Os testes precisam de `apps/api/.env`?
3. **P3** — Qual mecanismo de git hook serve para três pessoas e qualquer ferramenta de
   IA: `core.hooksPath` com script versionado, `simple-git-hooks`, `husky` ou `lefthook`?
   Compare pelo menos três, com o que cada um instala, como se ativa após o clone e o
   custo de manutenção. Meça quanto tempo `pnpm -r lint && pnpm -r typecheck` leva na
   sua máquina, porque é o que roda antes de cada commit. **A escolha é do operador,
   porque é dependência de infraestrutura. Traga opções, não escolha.**
4. **P4** — Como se protege a `main` neste repositório: proteção clássica de branch ou
   ruleset? Para cada forma, diga o que ela exige do plano gratuito num repositório
   público, quais opções bloqueiam merge com CI vermelha, push direto e force push, e
   se o dono da organização também fica sujeito. Cite a documentação oficial.
5. **P5** — Quem consegue configurar essa proteção? A conta do operador tem `push` mas
   não `admin` no repositório, segundo `gh api repos/casa-automatica/casa-automatica`
   em 2026-09-15. Descubra pelo `gh` quem é dono da organização e o que o operador
   precisa fazer para ter `admin`. Isso depende do operador; traga o passo a passo.
6. **P6** — Como o nome do check exigido pela proteção se liga ao nome do job no
   workflow, e o que muda entre gatilho `push` e `pull_request`? Diga o que acontece
   com PR vindo de fork, já que o repositório é público.
7. **P7** — Como o executor prova o DoD sem ter `admin`: mostrar a CI verde num push de
   branch, um PR com teste quebrado ficando vermelho, e o hook barrando um commit. Para
   cada prova, o comando e a saída esperada. O item D1 do `docs/fase 1/dod.md` usa
   `gh run list --commit <sha>`; confirme que ele mostra o que o DoD pede.
8. **P8** — O que `M1.6-deploy-na-casa` vai precisar deste workflow para acionar o deploy
   depois da CI verde em push na `main`? Diga só o que não pode ser fechado aqui. Não
   desenhe o deploy.

## Limites

- Não altere nada além de `docs/fase 1/unidades/M1.4-ci-verificacao/exploracao.md`.
- Experimentos ficam fora do repositório. Nenhum push, nenhum workflow criado, nenhuma
  configuração no GitHub.
- Não trate deploy, SSH, Docker, Caddy ou Cloudflare Tunnel. Isso é `M1.5` e `M1.6`.
- Não trate atualização automática de dependências. Fica para o backlog.
- Não escolha o mecanismo do hook nem a forma da proteção. P3, P4 e P5 são do operador.

## Fontes a consultar

- `docs/fase 1/dod.md`, seções B, C e D. A seção D vale a partir desta unidade.
- `docs/fase 1/roadmap.md`, marco M1 · CI, alterado em 2026-09-15.
- `docs/processo/06-ferramentas.md`, para o motivo da unidade.
- `package.json` da raiz e `README.md`, seção "Como rodar em cinco minutos".
- Documentação oficial do GitHub Actions, de rulesets e de proteção de branch.
- Documentação oficial do pnpm sobre integração contínua.
- `gh api`, para permissões, organização e checks.

## Branch

`unidade/M1.4-ci-verificacao` para a execução. O workflow precisa rodar num push antes
de entrar na `main`, e a proteção da `main` é testada contra essa branch. A exploração
entra direto na `main`, porque é só documento.

## Depende de

`M0.1-monorepo-base`, fechada em 2026-09-13.
