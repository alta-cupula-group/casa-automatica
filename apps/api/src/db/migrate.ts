import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { connectionOptions } from './target.js';

/** Pasta das migrações versionadas, `apps/api/drizzle`. */
export const MIGRATIONS_FOLDER = fileURLToPath(
  new URL('../../drizzle', import.meta.url),
);

/**
 * Abre uma conexão com uma única sessão para a URL, com a senha separada.
 * O TLS segue o alvo da URL. Os avisos NOTICE do servidor não vão para o terminal.
 */
export function openConnection(url: string, password: string): postgres.Sql {
  const options = connectionOptions(url);
  return postgres({
    // O driver separa host e porta por ':' quando recebe texto, o que quebra o ::1.
    // Em lista, ele usa host e porta como vieram. Os tipos só declaram o texto.
    host: [options.host] as unknown as string,
    port: [options.port] as unknown as number,
    username: options.username,
    database: options.database,
    password,
    ssl: options.ssl,
    max: 1,
    onnotice: () => {},
  });
}

/** A mensagem original do Postgres, quando o erro veio dele. */
export function postgresMessage(error: unknown): string {
  let current: unknown = error;
  while (current instanceof Error) {
    if (current instanceof postgres.PostgresError) return current.message;
    // Conexão recusada em localhost chega como AggregateError, sem mensagem própria:
    // uma tentativa por endereço, ::1 e 127.0.0.1.
    if (current instanceof AggregateError && current.message === '') {
      return current.errors.map((inner) => postgresMessage(inner)).join('; ');
    }
    if (current.cause === undefined) return current.message;
    current = current.cause;
  }
  return String(current);
}

/**
 * Aplica as migrações pendentes da pasta numa transação.
 * Não faz a trava do prod: quem chama decide se pode migrar.
 */
export async function runMigrations(options: {
  url: string;
  password: string;
  migrationsFolder: string;
}): Promise<void> {
  const sql = openConnection(options.url, options.password);
  try {
    await migrate(drizzle(sql), { migrationsFolder: options.migrationsFolder });
  } catch (error) {
    throw new Error(
      `Falha ao aplicar as migrações: ${postgresMessage(error)}`,
      {
        cause: error,
      },
    );
  } finally {
    await sql.end();
  }
}

/** Versão maior do servidor, como 17. */
export async function readServerMajorVersion(options: {
  url: string;
  password: string;
}): Promise<number> {
  const sql = openConnection(options.url, options.password);
  try {
    const rows = await sql<{ server_version_num: string }[]>`
      show server_version_num`;
    const versionNum = Number(rows[0]?.server_version_num);
    if (!Number.isInteger(versionNum)) {
      throw new Error('O servidor não informou a versão.');
    }
    return Math.floor(versionNum / 10000);
  } finally {
    await sql.end();
  }
}
