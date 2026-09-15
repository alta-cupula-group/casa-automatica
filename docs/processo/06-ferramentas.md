# Regra 06 — Ferramentas de IA

O processo vale igual para qualquer ferramenta de IA. Nada nele depende de um recurso
que só uma ferramenta tem.

## Porta de entrada

- `AGENTS.md` é o primeiro arquivo que qualquer agente lê.
- `CLAUDE.md` só carrega `AGENTS.md` e as regras. Regra nova não se escreve nele.
- Ferramenta que não lê `AGENTS.md` sozinha recebe na primeira mensagem a instrução de
  ler `AGENTS.md` e as regras de `docs/processo/`.
- Arquivo de instrução próprio de outra ferramenta, se for criado, só aponta para
  `AGENTS.md`. Ele não repete nem acrescenta regra.

## Um papel por conversa

- Explorador, executor e revisor começam cada um numa conversa nova.
- A conversa começa com o prompt do papel, de `docs/processo/prompts/`, com os campos
  entre `<>` preenchidos. O prompt não recebe mais nada da conversa do condutor.
- Na trilha dividida, a conversa do executor nunca viu a exploração. Colar trecho da
  exploração no prompt quebra a trilha.
- Na trilha única, a conversa do explorador continua com o prompt
  `executor-trilha-unica.md`.
- No Claude Code, os agentes de `.claude/agents/` e as skills de `.claude/skills/` fazem
  isso sozinhos. São atalhos. Onde divergirem de `docs/processo/`, vale `docs/processo/`.

## Ferramenta e modelo ficam registrados

- `exploracao.md`, `execucao.md` e `revisao.md` trazem no cabeçalho a ferramenta e o
  modelo que os produziram.
- Em unidade que exige revisor separado pela regra 01, o revisor usa outra ferramenta ou
  outro modelo que o executor. Quando não houver outro disponível, o cabeçalho diz isso.

## O que garante a qualidade

- Nenhuma ferramenta garante que uma regra foi seguida. Prompt, agente e modelo escolhido
  ajudam, mas não provam nada.
- A garantia é mecânica e igual para todos: testes, checagem de tipos, lint, git hook
  local e CI. Até `M1.4-ci-verificacao` fechar, só o revisor rodando os comandos protege
  a entrega.
- Relato de agente não é evidência. Saída de comando e resultado de CI são.

## Configuração por ferramenta

- `.claude/settings.json` e `.mcp.json` são do Claude Code. Cada ferramenta tem a sua
  configuração, e ela fica fora do repositório quando carrega dado pessoal.
- Credencial, token e identificador de projeto nunca são versionados.
  `.mcp.json.example` mostra o formato sem valores.
- Servidor MCP com acesso ao Supabase roda somente leitura, em qualquer ferramenta.
  Mudança no banco passa pelas migrações versionadas.
