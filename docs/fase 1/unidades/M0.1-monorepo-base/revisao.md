> Unidade: `M0.1-monorepo-base` · Marco: `M0`
> Estado: aguardando operador
> Revisor: condutor · Data: 2026-09-13

# Revisão — `M0.1-monorepo-base`

## Veredito

`aprovado`

Os catorze itens do DoD do contrato e os itens aplicáveis do DoD da fase passam num clone
limpo rodado pelo condutor, com duas contraprovas que o relato do executor não trazia.

## Quem revisou e por quê

A revisão ficou com o condutor. A regra 01 permite isso em unidade que não muda schema,
contrato de API, dinheiro nem pipeline de deploy, e esta não muda nenhum dos quatro. O
condutor tinha anunciado um revisor separado. Mudou de ideia porque a rodada 2 de execução
caiu por limite de gasto da API, e um revisor separado seria mais uma execução inteira.

## Histórico das execuções

| Rodada | Commit | O que aconteceu |
|---|---|---|
| 1 | `bf241ad` | O executor implementou o contrato ao pé da letra, e o repositório não construiu. Ele parou e devolveu três defeitos do contrato. O condutor reproduziu os três e reabriu o contrato, com novo GATE 1 em 2026-09-12 |
| 2 | `f41eb98` | O executor aplicou as dez mudanças da seção `## Rodada 2` do contrato. O registro foi commitado em `2331a55`. A sessão dele caiu depois do commit, por limite de gasto da API, enquanto conferia uma evidência |

A rodada 1 não foi reprovação de execução. Foi contrato devolvido. Esta é a primeira
revisão da unidade.

## Revisão 1, sobre a rodada 2 de execução

Clone limpo da branch `unidade/M0.1-monorepo-base`, no commit `73dd827`, feito em
diretório descartável fora do repositório. `pnpm` 12.4.1, Node 26.8.2.

### DoD do contrato

| # | Item | Veredito | Evidência rodada pelo condutor |
|---|---|---|---|
| 1 | Instalação reproduzível | atendido | `pnpm install --frozen-lockfile` → `Done in 1.4s using pnpm v12.4.1`, `EXIT=0` |
| 2 | Build completo | atendido | `pnpm -r build` → `EXIT=0`. Os três artefatos existem: `apps/api/dist/index.js`, `packages/shared/dist/index.js`, `apps/web/dist/index.html` |
| 3 | Lint | atendido | `pnpm -r lint` → `EXIT=0` |
| 4 | Tipos | atendido | `pnpm -r typecheck` → `EXIT=0` |
| 5 | Testes | atendido | `pnpm -r test` → `EXIT=0`. Três arquivos de teste, um por pacote de produto |
| 6 | Formatação | atendido | `pnpm format:check` → `All matched files use Prettier code style!`, `EXIT=0` |
| 7 | A API roda | atendido | `node apps/api/dist/index.js` e `pnpm start` em `apps/api` imprimem `api ok port=3000 sample=10,99`, `EXIT=0` |
| 8 | Nenhum pacote fica de fora do `pnpm -r` | atendido | Bloco do contrato → `EXIT=0`. **Contraprova:** com o script `test` removido de `apps/api/package.json`, o bloco imprime `test nao rodou em apps/api` e sai com 1 |
| 9 | Erro de tipo dentro de teste reprova | atendido | `src/index.test.ts(17,7): error TS2322`. Depois de desfazer, `EXIT=0` |
| 10 | Árvore limpa depois do build | atendido | `git status --porcelain` vazio depois de install, `cp` dos dois `.env` e build. Os `.env` copiados aparecem em `git check-ignore` |
| 11 | Nada de segredo nem configuração local versionada | atendido | `git ls-files` lista só `.mcp.json.example`, `apps/api/.env.example` e `apps/web/.env.example` |
| 12 | O exemplo de MCP não carrega o projeto | atendido | `grep -c omgheudterjqrjunpack` → `0`. `grep -c read_only=true` → `1` |
| 13 | O web não lê variável sem prefixo | atendido | Uma ocorrência: `apps/web/src/App.tsx:4`, `import.meta.env.VITE_API_URL` |
| 14 | O README funciona | atendido | A sequência do README rodou inteira no clone descrito acima, do `install` ao `format:check`, sem nenhum passo fora dela |

### DoD geral da fase

| # | Veredito | Evidência |
|---|---|---|
| A1 | atendido | `6759816` e `64da99d`, os dois commits de contrato aprovado, vêm antes de `bf241ad` e `f41eb98` |
| A2 | atendido | `execucao.md` traz a saída real de cada item nas duas rodadas |
| A3 | atendido, com exclusão registrada | Os dois commits do executor tocam 36 arquivos, todos da lista do contrato mais `pnpm-lock.yaml`. O diff da branch também traz `docs/scope-brief.md` e `docs/fase 1/roadmap.md`, só por causa do `73dd827`. Esse commit não é do executor. Ver observação 3 |
| A4 | atendido depois de ajuste | O cabeçalho de `execucao.md` dizia `Rodada: 1`. O condutor corrigiu para `2`. `estado.md` e os cabeçalhos batem |
| A5 | atendido | `feat(M0.1)` e `fix(M0.1)`, em pt-BR |
| B1 a B4 | atendido | DoD do contrato 1, 2, 3, 4 e 6 |
| C1 | atendido | DoD do contrato 5 |
| C2 | atendido | `formatCents` com 3 testes, `loadConfig` com 4, `App` com 1 |
| C4 | atendido | **Contraprova:** `pnpm -r test` dentro de `unshare -rn`, sem interface de rede, sai com 0 |
| C5 | atendido | O teste de variável vazia cobre a correção de `loadConfig` da rodada 2 |
| E1 | atendido | A busca da seção E no diff da unidade, sem o lockfile, só acha a palavra `token` dentro do próprio `execucao.md` |
| E2 a E4 | atendido | DoD do contrato 11 e 13. `apps/api/.env.example` tem as duas variáveis, sem valor, com comentário em pt-BR |
| F1, F2 | atendido | Identificadores em inglês, documentos e commits em pt-BR |
| I1, I2 | atendido | `README.md` mudou junto com `loadConfig`. O passo manual do `.mcp.json` está documentado |
| C3, D, F3, G, H, J | não se aplica | Valem a partir de unidades que ainda não fecharam |

### Regras do repositório

- Código e banco em inglês: `ok`
- Nada assumido fora do brief: `ok`
- Nenhum `[A VALIDAR]` tratado como resolvido pelo executor: `ok`
- Cabeçalhos e `estado.md` coerentes: `ok`, depois do ajuste do A4

### Correções exigidas

Nenhuma.

### Observações

1. **`loadConfig` aceita `PORT=0` e `PORT=3.5`.** O contrato da rodada 2 disse "só valor
   não numérico é erro", e o executor seguiu a letra. Nesta unidade não há servidor, então
   nada quebra. Destino: item de DoD da primeira unidade do M2, a que sobe o servidor HTTP.
   A exigência é porta inteira entre 1 e 65535. Registrado na linha do M2 em `estado.md`.
2. **`formatCents` não recusa valor fracionário.** `formatCents(10.5)` não é centavo válido.
   Destino: nenhum agora. O item G5 do DoD da fase cobre isso a partir do M4.
3. **O commit `73dd827` está na branch da unidade e não pertence a ela.** Ele fecha o
   `[A VALIDAR]` da SEFAZ-SP em `docs/scope-brief.md`, `docs/fase 1/roadmap.md` e
   `docs/fase 1/estado.md`. Não foi feito pelo executor nem pelo condutor desta unidade.
   Destino: vai para a `main` junto com a unidade, e o operador confirma o conteúdo. Ver
   as perguntas abaixo.
4. **`README.md` saiu da checagem de formatação** junto com os documentos, por causa do
   `*.md` no `.prettierignore`. É consequência aceita do contrato. Destino: nenhum.

## Perguntas ao operador

### P1 — O conteúdo do commit `73dd827` é seu e está certo?

Por que importa: ele fecha um `[A VALIDAR]` sem ordem de exploração, o que a regra 04 só
permite com a confirmação do operador. Também quebrou uma linha do roadmap.
Opções:
- **A** — é meu e vale · custo: nenhum · consequência: o condutor conserta a linha quebrada
  do roadmap como correção de digitação e o item fica fechado.
- **B** — não é meu ou não vale · custo: um `git revert` · consequência: o `[A VALIDAR]`
  volta a bloquear o M6.
Recomendação do condutor: A, se a nota abriu também **com os itens**. O registro diz "sem
ReCAPTCHA", e o roadmap exige as duas coisas.

## GATE 2

- Aprovação técnica: condutor em 2026-09-13
- Veredito do operador: —
- Ressalva e destino: observação 1 vira item de DoD da primeira unidade do M2
