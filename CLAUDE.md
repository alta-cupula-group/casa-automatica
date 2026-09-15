# Casa Automática — entrada do Claude Code

As regras do repositório estão em `AGENTS.md` e em `docs/processo/`. Elas valem para
qualquer ferramenta de IA. Este arquivo só as carrega no Claude Code.

Não escreva regra aqui. Regra escrita só neste arquivo não chega a quem usa outra
ferramenta.

@AGENTS.md
@docs/processo/01-papeis.md
@docs/processo/02-ciclo.md
@docs/processo/03-artefatos.md
@docs/processo/04-decisoes.md
@docs/processo/05-escrita.md
@docs/processo/06-ferramentas.md

## Atalhos do Claude Code

Os agentes de `.claude/agents/` aplicam os prompts de `docs/processo/prompts/`.

| Skill | Quem usa | Para quê |
|---|---|---|
| `/conduzir-fase` | operador | abre e conduz uma fase ou um trecho dela |
| `/explorar-unidade` | condutor | investiga uma unidade e escreve o relatório |
| `/executar-contrato` | condutor | implementa um contrato aprovado |
| `/revisar-entrega` | condutor | revisa a execução contra o DoD |
