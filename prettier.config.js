/**
 * Configuração do Prettier para todo o monorepo.
 * Aspas simples no código, aspas duplas no YAML e no JSON.
 */
export default {
  singleQuote: true,
  overrides: [
    {
      files: ['*.yaml', '*.yml'],
      options: { singleQuote: false },
    },
  ],
};
