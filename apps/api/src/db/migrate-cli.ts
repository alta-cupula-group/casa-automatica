// db:migrate. Aplica as migrações de apps/api/drizzle no alvo de MIGRATION_DATABASE_URL.
// Lê só process.env. No prod, passa pela trava de prod-guard.ts antes de migrar.
//
// O Node roda este arquivo direto do src, sem build. Os imports relativos do projeto usam
// a extensão .js, que só existe depois do build. O hook abaixo tenta o .ts quando o .js
// não existe. Por isso os módulos do projeto entram por import dinâmico, depois do hook.
import { execFile, spawn } from 'node:child_process';
import { registerHooks } from 'node:module';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      const fromTs = context.parentURL?.endsWith('.ts') ?? false;
      if (fromTs && specifier.startsWith('.') && specifier.endsWith('.js')) {
        return nextResolve(`${specifier.slice(0, -3)}.ts`, context);
      }
      throw error;
    }
  },
});

const REPO_ROOT = fileURLToPath(new URL('../../../..', import.meta.url));

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(`${name} não está definida. Veja apps/api/.env.example.`);
  }
  return value;
}

function readConfirmation(prompt: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  return rl.question(prompt).finally(() => rl.close());
}

function pgDumpVersionOutput(): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('pg_dump', ['--version'], (error, stdout) => {
      if (error) {
        reject(
          new Error(
            `pg_dump não encontrado no PATH ou falhou: ${error.message}`,
          ),
        );
        return;
      }
      resolve(stdout);
    });
  });
}

async function main(): Promise<void> {
  const { parseDatabaseUrl, SUPABASE_CA_PATH } = await import('./target.js');
  const { MIGRATIONS_FOLDER, readServerMajorVersion, runMigrations } =
    await import('./migrate.js');

  const url = requireEnv('MIGRATION_DATABASE_URL');
  const password = requireEnv('MIGRATION_DATABASE_PASSWORD');
  const database = parseDatabaseUrl(url);
  console.log(
    `db:migrate alvo=${database.target} host=${database.host} usuário=${database.user}`,
  );

  const migrate = () =>
    runMigrations({ url, password, migrationsFolder: MIGRATIONS_FOLDER });

  if (database.target !== 'prod') {
    await migrate();
    console.log('db:migrate terminou: migrações aplicadas.');
    return;
  }

  const { PROD_CONFIRMATION, guardProdAndMigrate, parsePgDumpMajorVersion } =
    await import('./prod-guard.js');
  const { dumpFile } = await guardProdAndMigrate({
    stdinIsTTY: process.stdin.isTTY === true,
    readConfirmation: () =>
      readConfirmation(
        `Isto migra o prod. Digite ${PROD_CONFIRMATION} para confirmar: `,
      ),
    dumpDir: process.env.PROD_DUMP_DIR,
    repoRoot: REPO_ROOT,
    serverMajorVersion: () => readServerMajorVersion({ url, password }),
    pgDumpMajorVersion: async () =>
      parsePgDumpMajorVersion(await pgDumpVersionOutput()),
    runPgDump: (file) => {
      console.log(`db:migrate exportando o prod para ${file}`);
      return new Promise((resolve, reject) => {
        const child = spawn(
          'pg_dump',
          [
            '--format=custom',
            `--file=${file}`,
            `--host=${database.host}`,
            `--port=${database.port}`,
            `--username=${database.user}`,
            `--dbname=${database.database}`,
            '--no-password',
          ],
          {
            // A senha vai pelo ambiente do processo filho, nunca pela linha de comando.
            env: {
              ...process.env,
              PGPASSWORD: password,
              PGSSLMODE: 'verify-full',
              PGSSLROOTCERT: SUPABASE_CA_PATH,
            },
            stdio: ['ignore', 'inherit', 'inherit'],
          },
        );
        child.once('error', reject);
        child.once('close', (code) => resolve(code ?? 1));
      });
    },
    now: () => new Date(),
    migrate,
  });
  console.log(`db:migrate exportação gravada em ${dumpFile}`);
  console.log('db:migrate terminou: migrações aplicadas no prod.');
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`db:migrate falhou: ${message}\n`);
  process.exitCode = 1;
}
