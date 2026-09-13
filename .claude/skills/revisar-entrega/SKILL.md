---
name: revisar-entrega
description: Revisa a entrega de uma unidade do Casa Automática contra o DoD do contrato e o DoD geral da fase, e emite veredito com correções numeradas. Use depois que o executor entregou o registro de execução, antes do GATE 2.
---

# Revisar uma entrega

Argumento esperado: o identificador da unidade, por exemplo `M0.1-monorepo-base`.

## Quem revisa

| Situação | Quem |
|---|---|
| schema, migração, contrato de API, dinheiro (ledger, rateio, acerto, Pix), CI ou deploy | agente `revisor` separado, contexto zerado |
| qualquer outra unidade | o condutor |

Dinheiro e schema nunca são revisados por quem escreveu o contrato sozinho. Erro de
centavo e erro de migração são os dois mais caros de desfazer.

## Prompt do revisor separado

```
Você é o revisor da unidade <id> do Casa Automática.

Leia: `docs/fase <N>/unidades/<id>/contrato.md`,
`docs/fase <N>/unidades/<id>/execucao.md`, `docs/fase <N>/dod.md`, `CLAUDE.md`,
`.claude/rules/01-papeis.md` e `.claude/rules/05-escrita.md`.

Percorra o DoD do contrato item a item e depois o DoD geral da fase. Rode você mesmo os
comandos de verificação; não acredite no que o registro de execução afirma. Cole a saída.

Compare os arquivos realmente alterados com a lista de arquivos afetados do contrato.

Escreva `docs/fase <N>/unidades/<id>/revisao.md` no molde de
`.claude/templates/revisao.md`, com o veredito no topo.

Você não corrige nada. Você devolve. Item não verificável é reprovação com pedido de
evidência. Achado fora do escopo do contrato vai em observações, separado das correções
obrigatórias.
```

## O que a revisão confere

1. **DoD do contrato**, item a item: `atendido`, `não atendido` ou `não verificável`.
2. **DoD geral da fase.** Vale por cima de todo contrato.
3. **Escopo:** `git diff --stat` contra a lista de arquivos afetados. Arquivo a mais é
   achado, mesmo que a mudança seja boa.
4. **Regras do repositório:** código e banco em inglês, nada assumido fora do brief,
   nenhum `[A VALIDAR]` tratado como resolvido, cabeçalhos e `estado.md` coerentes.
5. **Reversibilidade:** a unidade pode ser desfeita sozinha?

Rode os comandos. Ler o relato do executor não é revisar.

## Veredito

- `aprovado` — DoD inteiro atendido e verificado, escopo respeitado.
- `aprovado com ressalva` — DoD atendido, com algo que vira item de DoD de outra unidade
  ou linha de backlog. Diga qual das duas.
- `reprovado` — qualquer item não atendido ou não verificável.

## Reprovação

Abra uma rodada numerada em `revisao.md`, com correções objetivas e verificáveis, uma
por linha. Devolva ao executor **só a lista**. Estado: `em correção`.

**Na terceira reprovação da mesma unidade, pare.** Três rodadas querem dizer que o
problema está no que foi pedido, não em quem fez. O condutor reabre o contrato, e o
contrato reaberto passa por um novo GATE 1.

## GATE 2

Aprovação técnica é do revisor ou do condutor. O veredito final é do operador.

Apresente a ele: o veredito, o DoD com os itens verificados, o que mudou no repositório,
e qualquer ressalva com o destino proposto.

Aprovado: estado `fechada`, `estado.md` atualizado, commit `docs(<id>): unidade fechada`.
