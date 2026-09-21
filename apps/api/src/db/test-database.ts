// Só para testes. Cria bancos descartáveis no Postgres local de TEST_DATABASE_URL.
import { randomBytes } from 'node:crypto';
import type postgres from 'postgres';
import { MIGRATIONS_FOLDER, openConnection, runMigrations } from './migrate.js';
import { resolveTarget } from './target.js';

/**
 * Lock consultivo no banco de TEST_DATABASE_URL. Quem usa api_app segura o lock
 * compartilhado. Quem apaga o papel segura o exclusivo.
 */
export const API_ROLE_IN_USE_LOCK = 7_310_001;
/** Lock consultivo que serializa a troca de senha de api_app entre arquivos de teste. */
const API_ROLE_PASSWORD_LOCK = 7_310_002;

const MISSING_ENV_MESSAGE =
  'TEST_DATABASE_URL e TEST_DATABASE_PASSWORD não estão definidas. Suba o Postgres de teste ' +
  'como diz a seção "Postgres de teste" do README.md, em "Banco de dados", e exporte as duas variáveis.';

type TestEnv = { url: string; password: string };

function readTestEnv(): TestEnv {
  const url = process.env.TEST_DATABASE_URL;
  const password = process.env.TEST_DATABASE_PASSWORD;
  if (url === undefined || url === '' || password === undefined) {
    throw new Error(MISSING_ENV_MESSAGE);
  }
  if (resolveTarget(url) !== 'local') {
    throw new Error(
      'TEST_DATABASE_URL tem que apontar para um Postgres em localhost.',
    );
  }
  return { url, password };
}

/** A mesma URL, trocando o banco e, se pedido, o usuário. */
function withDatabase(url: string, database: string, user?: string): string {
  const parsed = new URL(url);
  parsed.pathname = `/${database}`;
  if (user !== undefined) parsed.username = user;
  return parsed.toString();
}

/**
 * Conexão como o usuário de TEST_DATABASE_URL, que no teste é `postgres`.
 * Sem URL, conecta ao banco da própria TEST_DATABASE_URL.
 */
export function connectAsAdmin(url?: string): postgres.Sql {
  const env = readTestEnv();
  const target = url ?? env.url;
  if (resolveTarget(target) !== 'local') {
    throw new Error('Teste de banco só conecta em localhost.');
  }
  return openConnection(target, env.password);
}

/** Cria um banco de nome aleatório e aplica as migrações de `apps/api/drizzle`. */
export async function createTestDatabase(): Promise<{
  url: string;
  password: string;
  drop(): Promise<void>;
}> {
  const env = readTestEnv();
  const name = `casa_test_${randomBytes(6).toString('hex')}`;
  const url = withDatabase(env.url, name);

  const admin = connectAsAdmin();
  try {
    await admin.unsafe(`create database "${name}"`);
  } finally {
    await admin.end();
  }

  const drop = async (): Promise<void> => {
    const sql = connectAsAdmin();
    try {
      await sql.unsafe(`drop database if exists "${name}" with (force)`);
    } finally {
      await sql.end();
    }
  };

  try {
    await runMigrations({
      url,
      password: env.password,
      migrationsFolder: MIGRATIONS_FOLDER,
    });
  } catch (error) {
    await drop();
    throw error;
  }
  return { url, password: env.password, drop };
}

/**
 * Define para api_app a senha de TEST_DATABASE_PASSWORD e conecta como ele no banco
 * da URL. Segura o lock compartilhado de uso do papel até o close().
 */
export async function connectAsApiRole(testDatabaseUrl: string): Promise<{
  sql: postgres.Sql;
  close(): Promise<void>;
}> {
  const env = readTestEnv();
  const admin = connectAsAdmin();
  const reserved = await admin.reserve();
  try {
    await reserved`select pg_advisory_lock_shared(${API_ROLE_IN_USE_LOCK})`;
    const literal = `'${env.password.replace(/'/g, "''")}'`;
    await reserved.unsafe('begin');
    try {
      await reserved`select pg_advisory_xact_lock(${API_ROLE_PASSWORD_LOCK})`;
      await reserved.unsafe(`alter role api_app password ${literal}`);
      await reserved.unsafe('commit');
    } catch (error) {
      await reserved.unsafe('rollback');
      throw error;
    }
  } catch (error) {
    reserved.release();
    await admin.end();
    throw error;
  }

  const sql = openConnection(
    withDatabase(
      testDatabaseUrl,
      new URL(testDatabaseUrl).pathname.slice(1),
      'api_app',
    ),
    env.password,
  );
  const close = async (): Promise<void> => {
    await sql.end();
    await reserved`select pg_advisory_unlock_shared(${API_ROLE_IN_USE_LOCK})`;
    reserved.release();
    await admin.end();
  };
  try {
    await sql`select 1`;
  } catch (error) {
    await close();
    throw error;
  }
  return { sql, close };
}
