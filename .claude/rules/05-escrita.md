# Regra 05 — Como escrever os documentos

Os documentos são lidos por um humano nas horas vagas e por um agente com contexto
zerado. Os dois precisam entender na primeira leitura.

## Forma

- Português do Brasil. Código, tabelas e colunas em inglês, mesmo dentro de texto em pt-BR.
- Uma ideia por frase. Frase curta. Sem travessão, sem parêntese explicativo, sem seta.
- Voz ativa e afirmativa. "O executor roda os testes", não "os testes deverão ser rodados".
- Nada de adjetivo vago: "robusto", "escalável", "moderno", "melhor prática" não dizem nada.
  Escreva o comportamento observável.
- Número, comando e trecho de código ficam em bloco de código ou em tabela, nunca no meio
  da frase.
- Caminho de arquivo entre crases, um por frase.

## Conteúdo

- **Critério verificável.** "Funciona bem" não é critério. "`pnpm -r build` passa numa
  máquina limpa" é.
- **Diga o que fica de fora.** Todo contrato tem a seção do que não será feito. É ela que
  evita o executor "aproveitar e já fazer".
- **Evidência, não afirmação.** Exploração e execução mostram a saída do comando, o trecho
  do arquivo, a URL consultada.
- **Não repita o brief.** Referencie `docs/scope-brief.md` e siga. Copiar decisão de
  produto para dentro do contrato cria duas fontes de verdade que vão divergir.
- **Escreva o que descobriu que estava errado.** Exploração que só confirma o esperado
  geralmente não explorou.

## Tamanho

| Documento | Alvo |
|---|---|
| `ordem.md` | meia página |
| `exploracao.md` | o que precisar, com as respostas primeiro e o material bruto no fim |
| `contrato.md` | duas páginas. Se passar disso, a unidade está mal fatiada |
| `execucao.md` | uma página mais a saída dos comandos |
| `revisao.md` | o DoD item a item, mais o veredito |

## Perguntas ao operador

Quando houver, entram numa seção `## Perguntas ao operador` no fim do documento, e cada
pergunta traz:

```markdown
### P1 — <a pergunta, em uma frase>
Por que importa: <o que trava sem a resposta>
Opções:
- **A** — <o que é> · custo: <o que custa> · consequência: <o que fecha ou abre>
- **B** — ...
Recomendação do condutor: <A ou B, e por quê em uma frase>
```

Recomendar é bom. Decidir por ele, não.
