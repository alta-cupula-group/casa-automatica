> Unidade: `M1.1-validar-supabase` · Marco: `M1 · Banco` · Trilha: `só exploração`
> Estado: em exploração
> Emitida por: condutor · Data: 2026-09-12

# Ordem de exploração — `M1.1-validar-supabase`

## Contexto

O `docs/scope-brief.md`, seção 4, decide dois projetos Supabase para a Fase 1: um `dev`
compartilhado na nuvem e um `prod`. O mesmo parágrafo marca como `[A VALIDAR]` o limite
de dois projetos ativos no plano gratuito. A regra `.claude/rules/04-decisoes.md` manda
validar o item com uma ordem de exploração própria antes de qualquer unidade que dependa
dele. A unidade `M1.2-ambientes-e-migracoes` depende desta e fica parada até o operador
confirmar o resultado.

Já existe um projeto Supabase ligado a este repositório pelo MCP, com `project_ref`
`omgheudterjqrjunpack` e URL `https://omgheudterjqrjunpack.supabase.co`. Em 2026-09-12 o
condutor consultou esse projeto e ele está vazio: nenhuma tabela no schema `public` e
nenhuma migração registrada. Não se sabe se ele é o `dev`, o `prod` ou um projeto de
teste, e essa resposta é do operador.

Esta unidade termina na exploração. Ela não tem contrato nem execução. Ela fecha quando
o operador escreve, no fim de `exploracao.md`, o que fazer com o resultado.

## O que esta unidade deve entregar

Um relatório que diga, com evidência datada, quantos projetos ativos o plano gratuito
do Supabase permite hoje, e o que isso implica para os ambientes `dev` e `prod` da Fase 1.

## Trilha escolhida

`só exploração`, pela regra 04. O objetivo é fechar um `[A VALIDAR]`, e nada será
construído aqui. O material é externo e muda com o tempo, então cada resposta precisa da
URL e da data da consulta.

## Perguntas a responder

1. **P1** — Quantos projetos ativos o plano gratuito permite? Transcreva o trecho da
   página oficial de preços e da documentação, com URL e data da consulta.
2. **P2** — O limite conta por organização ou por conta dona de organizações? Se uma
   conta puder ter mais de uma organização gratuita, isso muda a conclusão? Mostre onde a
   documentação diz isso.
3. **P3** — Depois de quantos dias sem uso um projeto gratuito pausa? O que acontece com
   os dados enquanto ele está pausado, como se reativa e quanto tempo leva? Cite a fonte.
4. **P4** — Quais outros limites do plano gratuito podem apertar na Fase 1? Traga os
   números de tamanho do banco, conexões simultâneas no pooler, tráfego de saída, retenção
   de log e backup. Diga qual deles chega perto do uso de três moradores.
5. **P5** — A Data API pode ser desligada por projeto? Por onde: painel, CLI ou API de
   gerenciamento? Desligar afeta o Supabase Auth ou o acesso direto ao Postgres pelo
   pooler? O `docs/scope-brief.md` decide que o frontend usa o Supabase só para
   autenticação, e o roadmap pede a Data API desligada nos dois ambientes.
6. **P6** — Se o limite de dois projetos for confirmado e um deles já estiver ocupado,
   quais são os caminhos possíveis para ter `dev` e `prod`? Liste as opções com custo e
   consequência. **Não escolha nenhuma.**

## Limites

- Somente leitura. O servidor MCP `supabase` está configurado neste repositório com
  ferramentas de escrita habilitadas. Não use `apply_migration`, `execute_sql` para
  escrever, `create_branch`, `merge_branch`, `reset_branch` nem `deploy_edge_function`.
  Nada no projeto `omgheudterjqrjunpack` pode mudar por causa desta exploração.
- Não crie, não pause e não apague projeto no Supabase. Criar projeto é ação do operador.
- Não desenhe schema, migração nem configuração de Drizzle. Isso é `M1.2` e `M1.3`.
- Não decida qual projeto será `dev` e qual será `prod`.
- Não relate chave, token nem senha no relatório. O repositório é público.

## Fontes a consultar

- `docs/scope-brief.md`, seção 4.
- `docs/fase 1/roadmap.md`, marco M1 · Banco.
- Página de preços do Supabase e a documentação sobre limites, organizações, pausa de
  projeto e Data API.
- A tabela de limites do plano gratuito dentro do painel, se ela estiver documentada
  publicamente.

## Branch

`main`. A unidade só produz documento.

## Depende de

—
