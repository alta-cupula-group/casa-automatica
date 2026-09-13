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
CLAUDE.md
.claude/rules/01-papeis.md
.claude/rules/02-ciclo.md
.claude/rules/03-artefatos.md
.claude/rules/04-decisoes.md
.claude/rules/05-escrita.md
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

Crie `docs/fase N/unidades/<id>/ordem.md` a partir de `.claude/templates/ordem.md`.
A ordem tem que ser respondível por quem nunca viu sua conversa com o operador.

Estado: `em exploração`. Commit: `docs(<id>): ordem de exploração`.

## Passo 4 — Despachar o explorador

Despache o agente `explorador` com este prompt, substituindo o que está entre `<>`:

```
Você é o explorador da unidade <id> do Casa Automática.

Sua ordem está em `docs/fase <N>/unidades/<id>/ordem.md`. Leia-a inteira e responda
uma a uma as perguntas dela.

Leia também, antes de começar: `CLAUDE.md`, `.claude/rules/01-papeis.md`,
`.claude/rules/04-decisoes.md`, `.claude/rules/05-escrita.md` e `docs/scope-brief.md`.

Escreva o resultado em `docs/fase <N>/unidades/<id>/exploracao.md`, no molde de
`.claude/templates/exploracao.md`. Esse é o único arquivo do repositório que você pode
criar ou alterar.

Não altere código, configuração ou dependência. Não escreva o contrato. Não decida
nenhum ponto que a ordem marque como decisão do operador; transforme-o em pergunta com
opções e custo.

Termine com um resumo de no máximo dez linhas: o que responde a ordem, o que ficou
aberto, o que precisa do operador.
```

Ao receber o relatório, leia-o inteiro. Se ele não responder a ordem, devolva com o que
falta antes de escrever o contrato.

Estado: `contrato em rascunho`. Commit: `docs(<id>): relatório de exploração`.

## Passo 5 — Escrever o contrato

`docs/fase N/unidades/<id>/contrato.md`, a partir de `.claude/templates/contrato.md`.

O contrato precisa ter, sem exceção:
- o que será construído, em comportamento observável;
- interfaces e formatos concretos: assinaturas, rotas, schemas, nomes de tabela e coluna;
- a lista fechada de arquivos afetados;
- o que fica **fora**;
- o DoD, cada item verificável por um comando ou uma observação objetiva;
- riscos e o que fazer se cada um acontecer.

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

**Trilha dividida.** Agente `executor` novo, com este prompt e nada mais:

```
Você é o executor da unidade <id> do Casa Automática.

Seu contrato está em `docs/fase <N>/unidades/<id>/contrato.md`. Ele foi aprovado pelo
condutor e pelo operador. Confirme as duas datas no cabeçalho antes de escrever qualquer
linha; se faltar uma, pare e reporte.

Leia: o contrato inteiro, `CLAUDE.md`, `.claude/rules/01-papeis.md`,
`.claude/rules/04-decisoes.md`, `.claude/rules/05-escrita.md`,
`docs/fase <N>/dod.md` e os arquivos que o contrato nomeia. Nada além disso.

Implemente exatamente o que o contrato descreve. Escreva os testes que o DoD exige e
rode todos os comandos de verificação.

Registre em `docs/fase <N>/unidades/<id>/execucao.md`, no molde de
`.claude/templates/execucao.md`, com o DoD item a item e a saída real de cada comando.

Não amplie escopo, não altere o DoD, não delegue, não toque em arquivo fora da lista de
arquivos afetados do contrato. Contrato ambíguo ou errado: pare, escreva o bloqueio em
`execucao.md` e devolva.

Você não tem acesso à exploração desta unidade e não deve pedi-la.
```

**Trilha única.** O mesmo agente que explorou continua, com este prompt:

```
O contrato da unidade <id> foi aprovado pelo condutor e pelo operador. Ele está em
`docs/fase <N>/unidades/<id>/contrato.md`.

Você muda de papel agora: era explorador, passa a executor. Leia
`.claude/agents/executor.md` e siga as regras de lá.

O contrato manda por cima da sua exploração. Onde ele divergir do que você descobriu,
vale o contrato; a divergência vira um bloqueio que você reporta, não algo que você
resolve sozinho.

Implemente o contrato, rode o DoD, registre em
`docs/fase <N>/unidades/<id>/execucao.md`.
```

Estado: `em execução`.

## Passo 8 — Revisão e GATE 2

Decida quem revisa, pela regra 01. Unidade que mexe em schema, contrato de API, dinheiro
ou deploy vai para um agente `revisor` separado. Use a skill `revisar-entrega`.

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
