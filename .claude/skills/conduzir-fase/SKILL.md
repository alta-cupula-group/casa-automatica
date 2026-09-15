---
name: conduzir-fase
description: Conduz a implementação de uma fase, marco ou unidade do Casa Automática. Fatia o trecho em unidades de trabalho, escolhe a trilha de cada uma, emite as ordens de exploração, escreve os contratos com DoD e leva os gates ao operador. Use quando o pedido for começar, continuar, retomar ou destravar a Fase 1, um marco (M0 a M11) ou uma unidade já aberta.
---

# Conduzir uma fase

Você assume o papel de **condutor** (`.claude/agents/condutor.md`). Se o trabalho pesado
for longo, despache o agente `condutor`; se for uma transição só, faça aqui mesmo.

Argumento esperado: o trecho a conduzir. Exemplos: `fase 1`, `M0`, `M5 · Despesas`,
`M0.1-monorepo-base`. Sem argumento, pergunte ao operador qual trecho.

## Passo 0 — Situar-se

Leia, nesta ordem:

```
AGENTS.md
docs/processo/01-papeis.md
docs/processo/02-ciclo.md
docs/processo/03-artefatos.md
docs/processo/04-decisoes.md
docs/processo/05-escrita.md
docs/processo/06-ferramentas.md
docs/scope-brief.md
docs/fase N/roadmap.md
docs/fase N/dod.md            (se não existir, ele é a primeira coisa a produzir)
docs/fase N/estado.md
```

Se o trecho pedido já tem unidades abertas, vá direto ao passo que o estado delas indica.

## Passo 1 — Fatiar

Quebre o trecho em unidades de trabalho segundo a regra 02. Para cada uma, escreva em
uma linha: o identificador, o que entrega, e de que unidade depende.

Leve o fatiamento ao operador **antes** de emitir a primeira ordem. Fatiamento é barato
de mudar agora e caro depois.

Registre as unidades aprovadas em `docs/fase N/estado.md` como `planejada`.

## Passo 2 — Escolher a trilha

Para cada unidade, aplique a regra 02. Escreva a escolha e a justificativa na ordem.

Resumo:

| Trilha | Quando | Efeito |
|---|---|---|
| única | poucos arquivos conhecidos, nada em aberto, gate rápido | o mesmo agente explora e depois executa |
| dividida | fundacional, investigação externa, `[A VALIDAR]`, paralelismo, execução longa | executor novo, contexto zerado, lê só o contrato |

Na dúvida, dividida.

## Passo 3 — Emitir a ordem

Crie `docs/fase N/unidades/<id>/ordem.md` a partir de `docs/processo/moldes/ordem.md`.
A ordem tem que ser respondível por quem nunca viu sua conversa com o operador.

Estado: `em exploração`. Commit: `docs(<id>): ordem de exploração`.

## Passo 4 — Despachar o explorador

Despache o agente `explorador` com o prompt de `docs/processo/prompts/explorador.md`,
substituindo o que está entre `<>`. Não acrescente nada da sua conversa com o operador.

Ao receber o relatório, leia-o inteiro. Se ele não responder a ordem, devolva com o que
falta antes de escrever o contrato.

Estado: `contrato em rascunho`. Commit: `docs(<id>): relatório de exploração`.

## Passo 5 — Escrever o contrato

`docs/fase N/unidades/<id>/contrato.md`, a partir de `docs/processo/moldes/contrato.md`.

O contrato precisa ter, sem exceção:
- o que será construído, em comportamento observável;
- interfaces e formatos concretos: assinaturas, rotas, schemas, nomes de tabela e coluna;
- a lista fechada de arquivos afetados;
- o que fica **fora**;
- o DoD, cada item verificável por um comando ou uma observação objetiva;
- riscos e o que fazer se cada um acontecer;
- as dependências novas, cada versão com a origem: comando ou lockfile.

O contrato descreve comportamento e verificação, não conteúdo de arquivo. O DoD tem no
máximo dez itens, e cada item de comportamento aponta o teste que vai prová-lo.

Depois, aplique o **teste de auto-suficiência**:

> Um executor que leu só este contrato, as regras do repositório e os arquivos que o
> contrato nomeia consegue entregar sem fazer nenhuma pergunta?

Se não, complete o contrato. Não resolva mandando o executor ler a exploração.

Commit: `docs(<id>): contrato para aprovação`.

## Passo 6 — GATE 1

1. Você aprova, com data no cabeçalho do contrato.
2. Apresente ao operador: o que a unidade entrega em três linhas, o DoD, o que fica de
   fora, a trilha escolhida, e as perguntas abertas com opções, custo e sua recomendação.
3. **Espere.** Estado: `aguardando operador`. Silêncio não é aprovação.

Aprovado: data do operador no cabeçalho, estado `aprovada`, commit
`docs(<id>): contrato aprovado`. Ressalva do operador vira item de DoD ou unidade nova,
nunca só um comentário.

## Passo 7 — Despachar o executor

**Trilha dividida.** Agente `executor` novo, com o prompt de
`docs/processo/prompts/executor.md` e nada mais.

**Trilha única.** O mesmo agente que explorou continua, com o prompt de
`docs/processo/prompts/executor-trilha-unica.md`.

Nos dois casos, o executor escreve primeiro os testes do DoD e registra a falha.

Estado: `em execução`.

## Passo 8 — Revisão e GATE 2

Decida quem revisa, pela regra 01. Unidade que mexe em schema, contrato de API, dinheiro
ou deploy vai para um agente `revisor` separado, de preferência com outra ferramenta ou
outro modelo que o executor. Use a skill `revisar-entrega`.

Reprovado: estado `em correção`, rodada numerada em `revisao.md`, devolva ao executor só
a lista de correções. **Na terceira reprovação, pare e reabra o contrato.**

Aprovado por você e pelo operador: estado `fechada`, `estado.md` atualizado, commit
`docs(<id>): unidade fechada`.

## Passo 9 — Próxima unidade

Volte ao passo 2. Ao fim do trecho, reporte ao operador o que fechou, o que ficou
bloqueado e o que ele precisa decidir para o trecho seguinte.

## O que você nunca faz nesta skill

- Escrever código de produção.
- Emitir prompt que dependa da sua conversa com o operador para fazer sentido.
- Aprovar um contrato ou uma entrega sozinho.
- Deixar `estado.md` e o cabeçalho dos documentos divergirem.
