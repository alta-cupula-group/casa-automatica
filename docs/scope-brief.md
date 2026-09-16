# Casa Automática — Scope Brief v2

> Status: **aprovado pelo operador em 11/09/2026**. Segue pendente a validação do scraping da SEFAZ-SP com nota real.
> Substitui o handoff original (`~/Documents/handoff.md`), incorporando as decisões tomadas em 11/09/2026. Nenhuma implementação começa antes da aprovação explícita deste documento. Pontos ainda não decididos estão marcados como **[A VALIDAR]** e devem ser levados ao operador antes de qualquer trabalho que dependa deles.

## 1. Contexto e objetivo final

Casa Automática é um software desenvolvido por três amigos que moram juntos, para organizar a convivência: pessoas que circulam pela casa, finanças compartilhadas, agenda, e no médio prazo tarefas domésticas e automação residencial. O objetivo final é um "segundo cérebro da casa": um assistente de voz local, com nome e voz próprios, que controla as automações e interage com os módulos do sistema.

É ao mesmo tempo produto real (uso diário pelos três moradores) e projeto de estudo/portfólio. O time é pequeno, informal, trabalha nas horas vagas e não tem papéis fixos. Processos devem ser leves, mas escritos.

Infraestrutura disponível: máquina própria (hoje um notebook antigo, com upgrade previsto) e domínio próprio.

## 2. Fases do roadmap

1. **Fase 1 — MVP: Pessoas + Financeiro + Calendário básico** (escopo deste documento)
2. Fase 2 — Tarefas domésticas (recorrência, revezamento, cobrança), calendário completo
3. Fase 3 — Automação/IoT via Home Assistant (luzes, fechadura, campainha, Alexa como canal)
4. Fase 4 — Assistente de voz local ("Jarvis da casa")

Fases 2 a 4 não são projetadas em detalhe agora. A arquitetura só precisa não fechar portas para elas (ver seção 5).

## 3. Escopo do MVP (Fase 1)

### 3.1 Módulo Pessoas

- `Person` é o cadastro-fonte de qualquer humano relacionado à casa.
- **Morador é um vínculo com período de vigência**, não um atributo fixo: tabela própria ligando `Person` a `House`, com data de entrada e data de saída opcional. Quem sai da casa continua no histórico, some da lista de moradores atuais e perde permissão de edição. Pode voltar depois.
- Visitante, prestador e parente são etiquetas simples na pessoa (uma pessoa pode ter mais de uma).
- **Autenticação via Supabase Auth.** Não existe senha em tabela própria. `User` é um perfil que liga o usuário do Supabase Auth a uma `Person`. Nem toda pessoa tem usuário; só quem acessa o sistema.
- Sessão persistente por padrão (abre logado). Logout por inatividade implementado no cliente, porque o recurso nativo do Supabase é do plano pago.
- Sistema fechado, sem cadastro público. Modelo de convite fica para os contratos técnicos.
- **Permissão:** só moradores ativos editam. Sem níveis de admin nem hierarquia nesta fase.

### 3.2 Módulo Financeiro

**Base: ledger (livro-razão).** Cada movimento financeiro é uma linha imutável que tira valor de uma conta e coloca em outra. Saldo é sempre a soma das linhas, nunca um número editável. Despesa, acerto, depósito no caixa e futura reserva são tipos de movimento sobre a mesma estrutura.

**Contas do ledger:**
- Cada `Person` é uma conta (moradores e convidados).
- **Caixa da Casa** é uma conta do ledger. O dinheiro físico fica na conta bancária de um morador (hoje, o PicPay do operador). O sistema não segura, envia nem lê dinheiro real; ele registra propriedade. Quando alguém deposita no caixa, o ledger já reparte a propriedade entre os moradores. Quando o caixa paga uma conta da casa, o ledger desconta a parte de cada um.
- **Saída de dinheiro é sempre manual**, feita por uma pessoa com o celular. Nunca haverá credencial no servidor capaz de enviar Pix.

**Plano de contas (centros de custo):**
- Entidade hierárquica auto-referenciada (árvore livre, `parent_id`). Taxonomia é dado configurável, não código.
- Cada despesa referencia o nó mais específico. A árvore é genérica e não é modelada em função de nenhuma feature.
- O cálculo de saldo é independente da árvore.

**Despesa:**
- Valor, data, centro de custo, quem pagou, participantes, e forma de divisão **por lançamento** (igual, por item, por percentual; detalhar na modelagem).
- Participante pode ser qualquer `Person`, inclusive convidado.
- **Arredondamento determinístico:** centavos de sobra vão um a um aos participantes em ordem fixa (maior resto). Nunca aleatório, para que qualquer cálculo seja reproduzível.

**Ranking e sugestão:**
- Ranking por saldo absoluto em reais, derivado do ledger.
- Sugestão de quem paga a próxima despesa: quem tem o saldo mais negativo.

**Fechamento:**
- Registra acertos como lançamentos e mantém o histórico. Não há reset.
- Periodicidade configurável por casa: mensal ou manual.

**Acerto (pagamento entre pessoas ou para o caixa):**
- Tem status, quem confirmou, quando, e por qual meio. No MVP o meio é sempre `manual`.
- O app gera **QR Pix estático** (padrão BR Code) com o valor da parte de cada um, apontando para a chave Pix informada pelo recebedor. Custo zero, sem provedor.
- Confirmação automática por webhook fica fora do MVP. Se um dia entrar, preenche os mesmos campos com meio `webhook`. Provedor preferido: Mercado Pago (moradores já têm conta), Efí Pro como alternativa. Ambos com tarifa percentual; provedores de tarifa fixa foram descartados.

**Leitura de NFC-e (nota fiscal por QR code):**
- O QR code versão 2 em emissão online carrega só a chave de acesso; **o valor total não vem na URL**. Da chave extraem-se UF, ano/mês, CNPJ do emitente, modelo, série e número.
- **No MVP:** scraping do portal da SEFAZ-SP a partir da URL do QR, extraindo emitente, total e itens. Isolado num adaptador por UF; a chave já diz o estado, então outros estados entram como novos adaptadores sem mexer no resto.
- A nota é guardada **em bruto e imutável** como veio do portal. A despesa gerada a partir dela é o que se edita: remover itens, adicionar itens personalizados, escolher participantes por item. A auditoria de dados cobre essas edições.
- **Preenchimento manual é sempre disponível**, como caminho principal e não como exceção. Scraping quebra quando o portal muda.
- **Validado em 12/09/2026** com nota real: a página da SEFAZ-SP abre pela URL do QR sem captcha e com os itens. Nota usada: https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/Paginas/ConsultaQRCode.aspx?p=35260942591651268030650730000510021158014173%7C3%7C1

### 3.3 Calendário básico

- Entidade genérica `Event`: título, início, fim, dia inteiro, participantes, regra de recorrência, módulo de origem.
- Recorrência no padrão iCalendar (RRULE), com biblioteca pronta.
- Financeiro e Pessoas publicam eventos automaticamente (vencimentos, fechamento, visitas).
- Tela simples de mês e semana com criação manual de evento.
- **Feed ICS** para assinar no Google Calendar ou iPhone. Sincronização bidirecional está fora.
- Revezamento de tarefas é Fase 2; a entidade já deixa o lugar pronto.

### 3.4 Transversal

- **Casa como entidade e como tenant** (`House`), com chave estrangeira nas tabelas centrais. O `prod` guarda só a casa real. A casa de teste, para movimentações irreais, existe só no `dev`. Decidido pelo operador em 15/09/2026. Nenhum dado atravessa de uma casa para outra.
- **Auditoria de dados:** tabela de auditoria alimentada por trigger no Postgres, registrando quem alterou o quê e quando. Lançamentos do ledger já são imutáveis; a auditoria cobre cadastros, categorias, edições de despesa e de notas.
- **Idioma:** código, tabelas e colunas em inglês. Textos de interface em pt-BR numa pasta de i18n desde o início.

## 4. Arquitetura e infraestrutura

- **Banco:** Supabase (Postgres). **Dois projetos gratuitos, `dev` e `prod`**, decidido pelo operador em 15/09/2026. A decisão volta ao veredito de 12/09/2026 da unidade `M1.1` e substitui a de um projeto só, de 13/09/2026. Os dois projetos nascem limpos. Em 16/09/2026 o operador apagou o projeto que existia antes, `omgheudterjqrjunpack`, que a unidade `M1.1` tinha designado como `dev`. O `dev` é compartilhado na nuvem entre os moradores. O `prod` fica numa organização gratuita separada, para que cota e restrição por uso justo do `dev` não atinjam o `prod`. Os outros moradores entram nas organizações como Developer. Toda migração passa num Postgres local, depois no `dev`, e só então no `prod`. O `prod` é exportado antes de cada migração, porque o plano gratuito não faz backup. Testes automatizados rodam contra Postgres local, nunca contra `dev` ou `prod`. Toda consulta filtra por casa. Nenhuma ferramenta de IA se conecta ao `prod`: o MCP do Supabase aponta só para o `dev`, somente leitura. Os dois ambientes existem desde 16/09/2026:

| Ambiente | Organização | Projeto | Região |
|---|---|---|---|
| `prod` | `Alta Cúpula` | `casa-automatica-prod` | São Paulo, `sa-east-1` |
| `dev` | `Alta Cúpula Dev` | `casa-automatica-dev` | Oregon, `us-west-2` |

O `prod` fica em São Paulo porque a API roda no servidor da casa, e cada consulta paga a distância. O `dev` ficou onde já estava, porque ninguém vive nele. A Data API está desligada nos dois. Supabase local via CLI/Docker é opcional para quem quiser. Migrações versionadas no repositório. O plano gratuito permite dois projetos ativos por pessoa, validado em 12/09/2026 na unidade `M1.1`. Projetos gratuitos pausam após 7 dias sem uso; reativar é um clique.
- **API:** Node com Fastify e Zod. REST descrita em OpenAPI, gerada a partir dos schemas. Acesso direto ao Postgres pelo pooler do Supabase, com Drizzle. Valida o JWT do Supabase Auth em cada requisição. Frontend usa o Supabase só para autenticação; dados passam sempre pela API.
- **Monólito modular:** um único serviço, organizado internamente por módulos (people, finance, calendar, integrations). Sem microsserviços e sem tRPC. Programas em outras linguagens entram como clientes dos contratos (OpenAPI hoje; MQTT nas fases 3 e 4).
- **Frontend:** React + Vite como PWA mobile-first (câmera para QR, ícone na tela inicial). Capacitor para publicar nas lojas quando houver necessidade, sem reescrita.
- **Repositório:** monorepo com pnpm workspaces: `apps/web`, `apps/api`, `packages/*` (tipos, schemas Zod, cliente gerado do OpenAPI).
- **Onde o repositório vive:** `alta-cupula-group/casa-automatica`, público, numa organização gratuita do GitHub. Decidido pelo operador em 15/09/2026, substituindo a conta pessoal que era dona antes. Motivo: em conta pessoal, colaborador só tem `write`, e só o dono configura proteção de branch. Os moradores são admin do repositório, no mesmo padrão já usado nas organizações do Supabase. A `main` é protegida por ruleset, sem lista de bypass: código entra por pull request com a CI verde, e push direto e force push são recusados. A forma dessa proteção está no contrato da unidade `M1.4-ci-verificacao`.
- **Hospedagem:** servidor em casa com Docker Compose, Caddy como proxy reverso e TLS automático, Cloudflare Tunnel para expor o domínio sem abrir portas. API e build do frontend no mesmo domínio.
- **Testes e CI desde o início:** pipeline roda lint, checagem de tipos, testes e build a cada push e a cada pull request. Um hook local recusa commit com erro de lint ou de tipo. Deploy automático por SSH do CI para o servidor. Fazem parte do DoD.
- **Recursos limitados:** o servidor atual é um notebook antigo. Nada no MVP pode exigir GPU ou muita memória.

## 5. Portas que a arquitetura deixa abertas (sem implementar agora)

- **Dispositivos e voz:** autenticação de serviço por chave de API para máquinas; camada de eventos internos na API que depois pode ser exposta via MQTT. Home Assistant como camada de IoT. Alexa permitida como canal de automação **via Home Assistant apenas**, sem acesso à API nem ao banco. Assistente de voz local (openWakeWord, Whisper, Ollama, Piper) só após upgrade de hardware.
- **Multi-casa:** `House` já existe.
- **Webhook de pagamento:** campos de confirmação no acerto já existem.
- **Outros estados de NFC-e:** adaptador por UF.
- **Tarefas e revezamento:** `Event` com participantes e recorrência.
- **Apps nas lojas:** Capacitor sobre o mesmo PWA.

## 6. Ordem de implementação (seguir estritamente)

1. **Infraestrutura:** projetos Supabase, monorepo, configuração de ambiente, Docker Compose, Caddy, pipeline de CI com deploy por SSH.
2. **API:** schema e migrações, ledger, Pessoas, Financeiro, Calendário, NFC-e, OpenAPI, testes.
3. **Frontend:** PWA consumindo o cliente gerado, telas do MVP.

## 7. Fora de escopo deste documento

Roadmap detalhado, contratos de DoD, especificação OpenAPI, schema físico final, Fases 2 a 4. Esses são os próximos artefatos, produzidos nesta ordem em `/docs`, cada um aguardando validação do operador antes do seguinte.

## 8. Regras de trabalho

- Nunca assumir decisão de produto, arquitetura ou modelagem que não esteja aqui. Ponto aberto vai para o operador antes de prosseguir.
- Itens **[A VALIDAR]** são verificados e reportados antes de qualquer trabalho que dependa deles.
- Processos leves, mas escritos.
