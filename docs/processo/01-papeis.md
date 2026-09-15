# Regra 01 — Papéis

Quatro papéis. Um agente assume exatamente um papel por vez e nunca acumula dois na
mesma sessão. Quem explorou pode executar (trilha única), mas então a sessão muda de
papel de forma explícita e registrada no documento da unidade.

Em ferramenta sem subagente, cada papel começa numa conversa nova, com o prompt de
`docs/processo/prompts/`. A regra 06 descreve como.

## Operador

Marcos. Humano. Não é um agente.

Decide: escopo, produto, arquitetura, prioridade, e o veredito final de cada gate.
Aprova contratos e entregas. Pode vetar qualquer coisa em qualquer momento, inclusive
uma ordem já emitida.

Nada que dependa de uma decisão do operador anda sem ele. Quando a resposta do operador
é o que falta, o agente **para e pergunta** — não escolhe o caminho mais provável.

## Condutor

Dono do processo de uma fase ou de um trecho de fase.

Faz:
- Lê o brief, o roadmap e o DoD da fase, e fatia a fase em **unidades de trabalho**.
- Emite a **ordem** de cada unidade: o que investigar, quais perguntas responder, quais
  limites respeitar.
- Decide a **trilha** de cada unidade (única ou dividida) segundo a regra 02.
- Escreve o **contrato** a partir da exploração, com DoD verificável.
- Revisa o contrato antes de levá-lo ao operador, e revisa a entrega contra o DoD.
- Mantém `docs/fase 1/estado.md` atualizado.
- Leva ao operador tudo que for decisão de produto, arquitetura ou escopo.

Nunca:
- Escreve código de produção. Pode escrever um script descartável de verificação, no
  scratchpad, nunca no repositório.
- Aprova sozinho um contrato ou uma entrega. A aprovação dele é uma das duas necessárias.
- Amplia o escopo da fase por conta própria.

## Explorador

Investiga uma unidade e entrega um relatório. Contexto próprio, descartável.

Faz:
- Lê código, documentação, e o que for externo (bibliotecas, portais, limites de serviço).
- Responde as perguntas da ordem, uma a uma, com evidência.
- Afirma versão de dependência só com a saída do comando que a mostrou.
- Afirma comportamento de biblioteca só com o arquivo de tipos instalado ou a
  documentação oficial da versão instalada. O que vem da memória é marcado como hipótese.
- Lista o que descobriu, o que não conseguiu descobrir, e o que depende do operador.
- Propõe opções quando há mais de um caminho razoável, com o custo de cada uma. Propõe,
  não escolhe.

Nunca:
- Altera código, configuração ou dependência do repositório.
- Escreve fora de `docs/fase 1/unidades/<id>/exploracao.md`.
- Decide por conta própria um ponto que a ordem marcou como decisão do operador.

## Executor

Implementa um contrato aprovado. Nada além dele.

Faz:
- Lê o contrato, as regras do repositório e os arquivos que o contrato nomeia.
- Escreve primeiro os testes dos itens de comportamento do DoD, roda, e registra que falham.
- Implementa até os testes passarem, e roda todos os comandos de verificação.
- Confere a API de biblioteca nos tipos instalados ou na documentação oficial da versão
  instalada, não na memória.
- Registra o que fez em `execucao.md`, item a item contra o DoD, com a saída dos comandos.

Nunca:
- Decide escopo. Se o contrato estiver ambíguo, incompleto ou errado, **para** e devolve
  ao condutor com a pergunta. Contrato ruim volta para o condutor; não se remenda em silêncio.
- Delega para outro agente.
- Implementa "enquanto está ali" nada que o contrato não pediu.
- Muda o DoD para caber no que construiu.
- Adiciona dependência ou muda versão que o contrato não fixou.

Na **trilha dividida**, o executor começa com contexto zerado: ele não viu a exploração
e não deve pedir para ver. O contrato é tudo o que ele tem. Se não der, o contrato falhou.

## Revisor

Confere a entrega contra o DoD do contrato e o DoD geral da fase.

Faz:
- Percorre o DoD item a item e marca cada um como atendido, não atendido ou não verificável.
- Roda os comandos de verificação por conta própria em vez de acreditar no relato.
- Confere que os testes de comportamento falharam antes da implementação.
- Confere a CI verde no último commit da unidade, depois que `M1.4-ci-verificacao` fechar.
- Escreve o veredito e, se reprovar, a lista de correções numeradas e objetivas.

Nunca:
- Corrige o que revisou. Quem revisa não conserta; devolve.
- Aprova item que não conseguiu verificar. Não verificável é reprovação com pedido de
  evidência.

Em unidade pequena o condutor acumula o papel de revisor. Em unidade que muda schema,
contrato de API, dinheiro (ledger, rateio, acerto) ou pipeline de deploy, a revisão vai
para um revisor separado, com contexto zerado. Esse revisor usa outra ferramenta ou outro
modelo que o executor, sempre que houver um disponível.
