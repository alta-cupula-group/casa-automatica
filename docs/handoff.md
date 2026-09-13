# Casa Automática — Scope Brief (handoff para Claude Code)

> Status: **aguardando aprovação do operador**. Este documento é a base de escopo. Nenhuma implementação deve começar antes da aprovação explícita das seções abaixo. Onde houver mais de uma opção razoável, ou onde uma decisão tenha impacto relevante (modelagem de dados, segurança, custo, arquitetura), **pare e pergunte ao operador** — nunca assuma.

## 1. Contexto e objetivo final

Casa Automática é um software desenvolvido por um grupo de amigos (3 moradores) que moram juntos, para facilitar a organização e a divisão das responsabilidades da casa: tarefas domésticas, controle financeiro/rateio de contas, gestão de pessoas que circulam pela casa (moradores, visitantes, prestadores de serviço, parentes) e, no médio prazo, automação residencial (Alexa, luzes, IoT). O objetivo final do projeto é chegar a um "segundo cérebro da casa": um assistente de voz (estilo Jarvis) que controla as automações e interage com os módulos do app por comando de voz.

O projeto é ao mesmo tempo um produto real (vai ser usado no dia a dia pelos 3 moradores) e um projeto de estudo/portfólio do time, que é pequeno e trabalha de forma informal (sem processo formal, sem papéis fixos de desenvolvimento).

Infraestrutura disponível: o grupo tem máquinas próprias capazes de rodar o servidor e um domínio próprio para hospedar a aplicação na internet.

## 2. Fases do roadmap (visão macro)

1. **Fase 1 — MVP: Pessoas + Financeiro** (escopo deste documento)
2. Fase 2 — Tarefas domésticas (delegação, recorrência, cobrança)
3. Fase 3 — Automação/IoT (Alexa, luzes, outros dispositivos)
4. Fase 4 — Assistente de voz ("Jarvis da casa"), unificando controle por voz do app e das automações da Fase 3

Fases 2, 3 e 4 **não fazem parte do MVP** e não devem ser projetadas em detalhe agora — apenas mantidas em mente para não fechar portas na arquitetura (ex.: dado que o cadastro de visitantes já é feito na Fase 1, ele deve ser reaproveitável quando a automação de fechadura/campainha entrar na Fase 3).

## 3. Escopo do MVP (Fase 1)

O MVP cobre dois módulos: **Pessoas** e **Financeiro**. Tarefas, automação e voz ficam fora do MVP.

### 3.1 Módulo Pessoas — decisões já tomadas

- Existe uma tabela `Pessoa`, que é o cadastro-fonte de qualquer humano relacionado à casa. Toda pessoa tem um `role`: `morador`, `visitante`, `prestador` ou `parente`.
- Existe uma tabela `Usuario`, **separada**, com uma foreign key para `Pessoa`. É na tabela `Usuario` que fica tudo relacionado a login/autenticação (senha, etc.).
- **Nem toda `Pessoa` tem um `Usuario` correspondente.** Visitantes, prestadores e parentes normalmente são só registro (sem login). Só quem precisa acessar o sistema tem um `Usuario`.
- Permissão de edição: **por enquanto, só moradores podem editar dados no sistema.** Não implementar granularidade de permissão além disso nesta fase — não assumir níveis de admin/hierarquia entre moradores a menos que o operador peça.
- Desenvolver o banco com base nisso, não ficar preso somente a essas tabelas. Pensar como um DBA experiente em Postgres. 

### 3.2 Módulo Financeiro — decisões já tomadas

**Estrutura de categorização (plano de contas):**
- Existe uma entidade de **centro de custo hierárquico** (auto-referenciada, tipo árvore — um nó pode ter um `parent_id` apontando para outro nó da mesma tabela), permitindo qualquer nível de agrupamento livre. Exemplo de uso (não é uma taxonomia fixa no código, é dado configurável pelos usuários):
  - Despesas Fixas → Casa → Aluguel, Condomínio
  - Despesas Fixas → Internet e Streaming
  - Despesas Variáveis → Casa → Gás, Água, Manutenção
  - Despesas Variáveis → Mercado
- Cada despesa/conta lançada referencia o nó (centro de custo) mais específico aplicável.
- **Não modelar a árvore de categorias pensando em nenhuma feature específica** (como o parsing de NF-e) — ela deve ser uma estrutura genérica e reaproveitável.
- Também desenvolver em cima disso da melhor maneira possível. 

**Lançamento de despesas:**
- Uma despesa tem: valor, data, centro de custo, quem pagou, e a lista de participantes (quem compartilha aquela despesa) com a forma de divisão daquele lançamento (ex.: igual entre participantes, por item, por percentual — a decidir em detalhe na modelagem técnica, mas a divisão é por lançamento, não fixa globalmente).
- **Leitura de QR Code de Nota Fiscal (NFC-e):** o usuário poderá escanear o QR code de uma nota (que abre a página de consulta da NFC-e no portal da SEFAZ do estado emitente) para pré-preencher uma despesa. Ponto de atenção técnico já identificado: não existe API pública estável para isso — cada estado tem seu próprio portal SEFAZ, e a extração de itens exige scraping da página de DANFE, o que é frágil (varia por estado, pode ter captcha/rate limit). **Abordagem em duas etapas, a confirmar com o operador antes de implementar:**
  1. Etapa 1: extrair da própria URL/chave de acesso do QR code o valor total e o emitente, sem scraping de HTML — usado para pré-preencher uma despesa "resumo".
  2. Etapa 2 (incremento futuro, não obrigatório no MVP): scraping da página de DANFE do estado relevante para extrair itens individuais, permitindo que o usuário escolha quais participantes ratearão cada item.
  - **Não implementar a Etapa 2 sem validar antes com o operador** qual(is) estado(s)/SEFAZ precisam ser suportados primeiro.

**Rateio (regra de negócio central — não é divisão fixa igual):**
- O grupo funciona por confiança: não existe uma regra fixa de "sempre dividir em 3 partes iguais". A ideia é manter um **saldo por pessoa**, calculado a partir do que cada um pagou versus a parte que lhe cabia nas despesas em que participou.
- O sistema deve ser capaz de gerar um **ranking** de saldo entre as pessoas (quem está mais "devendo" proporcionalmente) e **sugerir quem deveria pagar a próxima despesa** (ex.: o próximo almoço), com base nesse saldo.
- Deve existir uma noção de **fechamento/acerto periódico** (ex.: fim do mês), mostrando o extrato de saldos. Se esse fechamento reseta os contadores ou apenas os "marca como acertado" mantendo histórico é uma decisão de UX/produto que **deve ser validada com o operador** antes de implementar — não assumir.
- **O cálculo de saldo é independente da estrutura de centros de custo** — não travar o design de um no outro.

### 3.3 Infraestrutura — decisões já tomadas

- **Banco de dados: Supabase** (decisão fechada — avaliaram hospedar Postgres localmente nas próprias máquinas, mas optaram por Supabase pelo custo zero no estágio atual e por resolver backup/TLS/gestão sem esforço operacional do time).
- Stack de aplicação: **frontend em React + Vite**, **API em Node**.
- Autenticação: sistema fechado (não é cadastro público) — o modelo de convite/acesso deve ser detalhado na fase de contratos técnicos, não neste brief.

## 4. Ordem de implementação (decisão do operador — seguir estritamente)

A implementação do MVP deve seguir esta ordem, sem pular etapas:

1. **Infraestrutura**: definição do banco (Supabase), estruturação de pastas e arquivos do projeto (monorepo ou multi-repo — a decidir com o operador), setup inicial de configuração/ambiente.
2. **API** (Node): modelagem de dados, endpoints, regras de negócio (Pessoas, Financeiro, cálculo de saldo/ranking).
3. **Frontend** (React + Vite): consumo da API, telas do MVP.

## 5. O que este documento NÃO cobre (fora de escopo aqui)

- Roadmap detalhado de tarefas/sprints
- Contratos de Definition of Done (DoD)
- Especificação OpenAPI da API
- Modelagem técnica final de tabelas/schema (o que está aqui são decisões de produto/negócio, não o schema físico)
- Fases 2, 3 e 4 (Tarefas, Automação/IoT, Assistente de voz)

Esses itens são o **próximo passo, e só devem começar após a aprovação explícita deste scope-brief pelo operador.**

## 6. Regra de trabalho para o Claude Code a partir daqui

- **Nunca assumir decisões de produto, arquitetura ou modelagem que não estejam explicitamente decididas aqui.** Qualquer ponto em aberto ou ambíguo deve ser levado ao operador antes de prosseguir.
- Time é pequeno e informal — processos devem ser leves, mas devem existir por escrito (roadmap, DoD, contratos de API) para dar previsibilidade, já que o time trabalha nas horas vagas.
- Após aprovação deste brief, os próximos artefatos a produzir (em `/docs` do projeto) são: roadmap de implementação, contratos de Definition of Done, e especificação OpenAPI da API — nessa ordem, cada um aguardando validação do operador antes do próximo.
