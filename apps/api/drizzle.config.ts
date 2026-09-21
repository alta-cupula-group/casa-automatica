import { defineConfig } from 'drizzle-kit';

// Config do drizzle-kit, usado só pelo db:generate.
// Não lê URL de banco: quem aplica as migrações é o db:migrate, em src/db/migrate-cli.ts.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
});
