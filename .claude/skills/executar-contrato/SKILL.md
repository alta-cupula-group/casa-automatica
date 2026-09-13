---
name: executar-contrato
description: Implementa um contrato aprovado de uma unidade do Casa Automática e registra a execução contra o DoD. Use somente depois do GATE 1, quando o cabeçalho do contrato tiver as datas de aprovação do condutor e do operador.
---

# Executar um contrato

Argumento esperado: o identificador da unidade, por exemplo `M0.1-monorepo-base`.

## Porta de entrada

Abra `docs/fase N/unidades/<id>/contrato.md` e confirme no cabeçalho **as duas datas de
aprovação**, do condutor e do operador.

Falta uma? Pare. Não execute, não "adiante uma parte", não crie arquivo. Reporte que o
contrato não venceu o GATE 1 e o que falta.

## Como rodar

**Trilha dividida** (o padrão): despache um agente `executor` novo com o prompt da skill
`conduzir-fase`, passo 7. Ele recebe o caminho do contrato e nada do seu contexto. Não
repasse a exploração, não resuma a conversa com o operador, não antecipe conclusões.
O contrato tem que bastar — é esse o teste.

**Trilha única:** o mesmo agente que explorou continua, com o prompt de mudança de papel
do passo 7. O contrato manda por cima da exploração dele.

## Limites da execução

- Implementar exatamente o contrato. Nada a mais.
- Escrever apenas nos caminhos da lista de arquivos afetados, mais o `execucao.md`.
  Arquivo fora da lista é mudança de escopo: parar e reportar.
- Não alterar o DoD. Item impossível ou errado é bloqueio, não convite para reescrever.
- Não delegar para outro agente.
- Contrato ambíguo, incompleto ou contraditório: parar, registrar o bloqueio, devolver.

## O registro de execução

`docs/fase N/unidades/<id>/execucao.md`, no molde de `.claude/templates/execucao.md`:

- o que foi construído, em comportamento observável;
- a lista real de arquivos criados e alterados;
- **o DoD item a item**, cada um com o comando que o prova e a saída real do comando;
- bloqueios e dúvidas, se houver;
- o que você encontrou e não tocou, para o condutor decidir.

Teste que falha entra no registro com a saída do erro. Item que você não conseguiu
verificar entra como não verificado, com o motivo. Nunca reporte verde o que não rodou.

## Ao terminar

Estado da unidade vira `em revisão`. Commit: `feat(<id>): <o que foi construído>`, ou
`fix(<id>): rodada N de correções` quando for correção.

A revisão não é sua. Chame a skill `revisar-entrega`.
