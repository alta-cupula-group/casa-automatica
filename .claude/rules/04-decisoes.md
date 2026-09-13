# Regra 04 — Decisões

## Hierarquia

Da mais forte para a mais fraca. O de cima ganha sempre.

1. **O operador**, falando agora.
2. **`docs/scope-brief.md`** — escopo e decisões de produto do MVP.
3. **`docs/fase N/roadmap.md`** — ordem dos marcos e critérios de pronto.
4. **`docs/fase N/dod.md`** — Definition of Done geral da fase.
5. **O contrato da unidade** — decisões técnicas locais.
6. **Convenção do repositório** — o que o código já faz.

`docs/handoff.md` não entra na hierarquia. É o brief original, guardado como histórico;
onde ele diverge do scope-brief, vale o scope-brief.

Conflito entre dois níveis não se resolve escolhendo o mais conveniente. Vai para o operador.

## O que exige o operador

Sempre, sem exceção:
- qualquer decisão de produto: o que o sistema faz, para quem, com qual regra de negócio;
- modelagem de dados que afete entidades centrais: `house`, `person`, `residency`,
  `account`, `ledger_entry`, `cost_center`, `expense`, `settlement`, `event`;
- qualquer coisa que toque dinheiro: rateio, arredondamento, saldo, fechamento, acerto, Pix;
- troca ou adição de dependência de infraestrutura: banco, provedor, hospedagem, CI;
- mudança no que já foi aprovado;
- ampliação de escopo da fase;
- qualquer item marcado `[A VALIDAR]` no scope-brief.

## O que o condutor decide sozinho

- fatiamento de um marco em unidades;
- trilha de cada unidade;
- se a revisão fica com ele ou vai para um revisor separado;
- ordem de execução entre unidades que o roadmap deixou paralelas;
- branch ou `main`;
- forma dos documentos, dentro dos moldes.

## O que o executor decide sozinho

Nada de escopo. Dentro do contrato, decide só o que o contrato não fixou e o que não
aparece na interface pública: nome de variável local, organização interna de um arquivo,
ordem dos testes. Qualquer coisa que apareça no contrato de API, no schema, ou no DoD,
não é dele.

## Diante de dúvida

1. Procure a resposta na hierarquia acima, de cima para baixo.
2. Se não achar, faça tudo que **não** depende da resposta e entregue.
3. Escreva a pergunta no documento da unidade, na seção `## Perguntas ao operador`, com
   as opções e o custo de cada uma.
4. Marque a unidade como `bloqueada` se nada mais puder andar.

Nunca escolha "a mais provável" e siga. O brief é explícito: ponto em aberto vai para o
operador antes de prosseguir.

## Itens `[A VALIDAR]`

Um `[A VALIDAR]` é uma hipótese, não um fato. Antes de qualquer unidade que dependa dele:
1. o condutor emite uma ordem de exploração só para validá-lo;
2. o explorador reporta o resultado com evidência;
3. o operador confirma o que fazer com o resultado.

Unidade que depende de `[A VALIDAR]` não aberto fica `bloqueada`. Não se implementa o
caminho feliz esperando que a validação confirme.

Abertos hoje (`docs/scope-brief.md`):
- portal da SEFAZ-SP abre pela URL do QR sem captcha e com itens.

Fechados:
- limite de dois projetos ativos no plano gratuito do Supabase. Validado e aprovado pelo
  operador em 2026-09-12, na unidade `M1.1-validar-supabase`.
