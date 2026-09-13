# Casa Automática — Roadmap de implementação do MVP

> Status: **validado pelo operador em 12/09/2026**. Registrado pelo condutor na mesma data.
> Base: [../scope-brief.md](../scope-brief.md) v2, aprovado em 11/09/2026 com um item pendente (validação do scraping SEFAZ-SP com nota real).
> Unidade de planejamento: **marco (M)**, não data. O time trabalha nas horas vagas, então cada marco tem entregáveis verificáveis e um critério de pronto, e nada de prazo fixo. A ordem é obrigatória; marcos com o mesmo número podem andar em paralelo.

## Como ler

- **Entrega:** o que existe no repositório ao fim do marco.
- **Pronto quando:** critério objetivo, verificável por qualquer pessoa do time. O DoD geral (próximo artefato) vale por cima de todos.
- **Depende de:** marcos que precisam estar prontos antes.

---

## Etapa 1 — Infraestrutura

### M0 · Fundação do repositório
**Entrega:** monorepo pnpm com `apps/api`, `apps/web`, `packages/shared`; TypeScript, ESLint e Prettier compartilhados; `README.md` com "como rodar em 5 minutos"; `.env.example` por app; `docs/` com brief, roadmap, DoD e, depois, OpenAPI.
**Pronto quando:** `pnpm install && pnpm -r build` passa numa máquina limpa; lint passa; um teste de fumaça por app roda e passa.
**Depende de:** nada.

### M1 · Banco e ambientes
**Entrega:** dois projetos Supabase (`dev` e `prod`) documentados; Data API desligada em ambos; migrações versionadas com Drizzle em `apps/api/drizzle`; comando único para aplicar migrações em qualquer ambiente; Supabase local via CLI documentado como opcional; primeira migração criando `house` e a tabela de auditoria com seu trigger.
**Pronto quando:** a migração inicial aplica em `dev` e em `prod` sem intervenção manual; uma alteração de teste numa tabela auditada gera linha na auditoria.
**Depende de:** M0.

### M1 · Pipeline de CI e deploy
**Entrega:** GitHub Actions rodando lint, testes e build a cada push e PR; workflow de deploy por SSH para o servidor, disparado em push na `main`; `docker-compose.yml` com API, build estático do web e Caddy; Cloudflare Tunnel documentado; segredos do repositório listados no README (nomes, não valores).
**Pronto quando:** um push na `main` com uma alteração trivial chega ao domínio da casa sem ninguém tocar no servidor; PR com teste quebrado fica vermelho.
**Depende de:** M0. Pode andar em paralelo com M1 · Banco.

---

## Etapa 2 — API

### M2 · Esqueleto da API e autenticação
**Entrega:** Fastify + Zod com geração de OpenAPI em `docs/openapi.json` a partir dos schemas; validação do JWT do Supabase Auth em todas as rotas; middleware que resolve usuário → `person` → morador ativo da `house`; rota `GET /health`; erro padronizado; módulo `people` vazio como modelo de estrutura de módulo.
**Pronto quando:** uma requisição sem token recebe 401, com token válido de morador ativo recebe 200 em `/health`; OpenAPI gerado valida num linter; teste de integração sobe a API contra o Postgres local.
**Depende de:** M1 (ambos).

### M3 · Módulo Pessoas
**Entrega:** schema `person`, `person_tag` (visitante, prestador, parente), `residency` (morador com vigência), `user_profile` (ligação Supabase Auth ↔ person); CRUD de pessoas; entrada e saída de morador; fluxo de convite: morador ativo cria `person` e gera convite; quem aceita vira `user_profile`; regra "só morador ativo edita" aplicada centralmente.
**Pronto quando:** teste cobre: morador que saiu perde escrita e mantém histórico; pessoa sem usuário existe e é usável em despesas; convite aceito loga e edita; convite de não-morador é rejeitado.
**Depende de:** M2.

### M4 · Ledger e plano de contas
**Entrega:** `account` (uma por person + Caixa da Casa), `ledger_entry` imutável (sem UPDATE/DELETE por permissão de banco), `cost_center` em árvore; função de saldo por conta; teste de propriedade: soma de todas as contas é sempre zero.
**Pronto quando:** tentativa de alterar ou apagar lançamento falha no banco; saldo de qualquer conta é a soma das linhas e bate com o teste de propriedade em 1.000 lançamentos aleatórios; árvore de centros de custo aceita profundidade arbitrária e recusa ciclo.
**Depende de:** M3.

### M5 · Despesas, divisão e acertos
**Entrega:** `expense` com participantes e forma de divisão por lançamento (igual, por percentual, por item); geração das linhas de ledger a partir da despesa; arredondamento determinístico por maior resto; `settlement` (acerto) com status, confirmado por, confirmado em, meio (`manual`); geração de payload de QR Pix estático (BR Code) por parte; ranking por saldo; sugestão de próximo pagador; fechamento de período configurável por casa (mensal ou manual) que gera extrato e marca o período.
**Pronto quando:** para qualquer despesa, soma das partes é igual ao valor em centavos; mesma despesa gera sempre o mesmo rateio; QR gerado é lido por app bancário e mostra valor certo; fechamento não altera nenhum lançamento anterior; ranking e sugestão têm teste com cenário de três moradores e um convidado.
**Depende de:** M4.

### M5 · Calendário básico
**Entrega:** `event` com RRULE (biblioteca iCalendar), participantes e módulo de origem; eventos automáticos de vencimento e fechamento (financeiro) e de vigência de visita (pessoas); CRUD de eventos manuais; expansão de recorrência num intervalo; feed ICS autenticado por token por usuário.
**Pronto quando:** feed ICS importa no Google Calendar e no iPhone com recorrência correta; criar despesa com vencimento cria evento; teste de expansão de RRULE cobre diário, semanal, mensal por dia do mês.
**Depende de:** M3. Pode andar em paralelo com M5 · Despesas.

### M6 · NFC-e (São Paulo)
**Pré-requisito pendente:** validar com nota real que a URL do QR abre sem captcha e com itens. Script de validação já existe; falta a URL de uma nota. Se a validação falhar, este marco vira só "leitura da chave de acesso + preenchimento manual" e o scraping sai do MVP.
**Entrega:** `invoice_raw` imutável (URL, chave, HTML bruto, data de captura); decodificação da chave (UF, período, CNPJ, número); adaptador `sefaz-sp` isolado atrás de uma interface por UF; despesa gerada em rascunho com itens editáveis (remover, adicionar personalizado, participantes por item); caminho manual sempre disponível.
**Pronto quando:** teste do adaptador roda contra HTML gravado, não contra o portal; nota real de mercado gera rascunho com todos os itens e total igual ao da nota; falha do portal degrada para manual com mensagem clara, sem erro 500.
**Depende de:** M5 · Despesas.

### M7 · Contrato fechado
**Entrega:** OpenAPI final gerado e commitado; cliente TypeScript gerado em `packages/shared`; testes de contrato garantindo que o OpenAPI commitado é igual ao gerado.
**Pronto quando:** CI falha se alguém muda uma rota sem atualizar o OpenAPI commitado.
**Depende de:** M3, M5 (ambos), M6.

---

## Etapa 3 — Frontend

### M8 · Base do PWA
**Entrega:** React + Vite como PWA (manifest, service worker, ícone); login via Supabase Auth com sessão persistente e logout por inatividade; pasta de i18n com pt-BR; layout mobile-first com navegação entre módulos; cliente gerado do OpenAPI; página de erro e estado offline mínimo.
**Pronto quando:** instala na tela inicial de Android e iPhone; fecha e reabre logado; fica inativo pelo tempo configurado e desloga; Lighthouse marca como PWA instalável.
**Depende de:** M7.

### M9 · Telas de Pessoas
**Entrega:** lista e cadastro de pessoas com etiquetas; entrada e saída de morador; convite e aceite.
**Pronto quando:** os três moradores estão cadastrados e logados no `prod`; um visitante de teste existe sem login.
**Depende de:** M8.

### M9 · Telas de Financeiro
**Entrega:** lançar despesa com divisão por lançamento; lista e detalhe; saldos, ranking e sugestão de próximo pagador; acertos com QR Pix e confirmação manual; fechamento e extrato; gestão da árvore de centros de custo.
**Pronto quando:** um mês real de despesas dos moradores é lançado e fechado no `prod` sem workaround; QR Pix pago de verdade por um morador e confirmado manualmente.
**Depende de:** M8. Pode andar em paralelo com M9 · Pessoas.

### M10 · Calendário e NFC-e no app
**Entrega:** vista de mês e semana; criação de evento manual; link para assinar o feed ICS; leitura de QR pela câmera; revisão do rascunho da nota com edição de itens e participantes por item.
**Pronto quando:** compra real de mercado vai do QR à despesa rateada em menos de dois minutos no celular; feed assinado no calendário do celular de cada morador.
**Depende de:** M9 (ambos).

### M11 · Corte do MVP
**Entrega:** uso real pelos três moradores por um ciclo de fechamento completo; lista de bugs triada; documentação de operação (backup do Supabase, reativação de projeto pausado, redeploy manual).
**Pronto quando:** um fechamento mensal inteiro aconteceu só pelo app, e o time decide por escrito que a Fase 2 pode começar.
**Depende de:** M10.

---

## Riscos conhecidos e onde estão tratados

| Risco | Marco | Mitigação |
|---|---|---|
| Portal SEFAZ-SP com captcha ou mudança de layout | M6 | Validação prévia; adaptador isolado; testes contra HTML gravado; manual como padrão |
| Projeto Supabase `dev` pausar por inatividade | M1 | Documentado; reativação é um clique; migrações reaplicáveis |
| Servidor fraco (notebook antigo) | M1 · CI | Compose enxuto, sem serviço além de API, web estático e Caddy |
| Rateio com centavos errados | M5 | Teste de propriedade: soma das partes = total, sempre |
| Rota nova sem contrato atualizado | M7 | CI compara OpenAPI gerado com o commitado |
| Perda de credencial SSH de deploy | M1 · CI | Chave dedicada só para deploy, listada no README, revogável |

## Fora deste roadmap

Fases 2 a 4, webhook de pagamento, outros estados de NFC-e, apps nas lojas via Capacitor. Cada um entra como roadmap próprio quando o MVP for cortado.
