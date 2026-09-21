import { spawn } from 'node:child_process';
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { MIGRATIONS_FOLDER, runMigrations } from './migrate.js';
import {
  API_ROLE_IN_USE_LOCK,
  connectAsAdmin,
  createTestDatabase,
} from './test-database.js';

const DB_TIMEOUT_MS = 60_000;
const API_DIR = fileURLToPath(new URL('../..', import.meta.url));

type Journal = {
  entries: { idx: number; when: number; tag: string; breakpoints: boolean }[];
};

function readJournal(folder: string): Journal {
  return JSON.parse(
    readFileSync(join(folder, 'meta', '_journal.json'), 'utf8'),
  ) as Journal;
}

/** Conta as linhas da tabela de controle do Drizzle no banco da URL. */
async function countMigrationRows(url: string): Promise<number> {
  const admin = connectAsAdmin(url);
  try {
    const rows = await admin<{ count: number }[]>`
      select count(*)::int as count from drizzle.__drizzle_migrations`;
    return rows[0]?.count ?? -1;
  } finally {
    await admin.end();
  }
}

async function apiRoleExists(url: string): Promise<boolean> {
  const admin = connectAsAdmin(url);
  try {
    const rows = await admin`select 1 from pg_roles where rolname = 'api_app'`;
    return rows.length === 1;
  } finally {
    await admin.end();
  }
}

describe('DoD 1: banco vazio', () => {
  it(
    'runMigrations cria api_app e grava uma linha por migração, e a segunda execução não grava',
    async () => {
      const database = await createTestDatabase();
      try {
        const expected = readJournal(MIGRATIONS_FOLDER).entries.length;
        expect(expected).toBeGreaterThan(0);
        expect(await countMigrationRows(database.url)).toBe(expected);
        expect(await apiRoleExists(database.url)).toBe(true);

        await runMigrations({
          url: database.url,
          password: database.password,
          migrationsFolder: MIGRATIONS_FOLDER,
        });
        expect(await countMigrationRows(database.url)).toBe(expected);
      } finally {
        await database.drop();
      }
    },
    DB_TIMEOUT_MS,
  );
});

describe('DoD 2: dois bancos do mesmo cluster', () => {
  it(
    'migra um banco depois do outro',
    async () => {
      const first = await createTestDatabase();
      const second = await createTestDatabase();
      try {
        expect(await countMigrationRows(first.url)).toBeGreaterThan(0);
        expect(await countMigrationRows(second.url)).toBeGreaterThan(0);
      } finally {
        await first.drop();
        await second.drop();
      }
    },
    DB_TIMEOUT_MS,
  );

  it(
    'migra dois bancos ao mesmo tempo, com api_app ainda inexistente no cluster',
    async () => {
      // Tira api_app do cluster para que os dois bancos disputem a criação do papel.
      // O lock exclusivo espera quem está usando o papel em outro arquivo de teste.
      const admin = connectAsAdmin();
      const reserved = await admin.reserve();
      try {
        await reserved`select pg_advisory_lock(${API_ROLE_IN_USE_LOCK})`;
        await reserved`drop role if exists api_app`;
        const results = await Promise.allSettled([
          createTestDatabase(),
          createTestDatabase(),
        ]);
        const created = results.flatMap((result) =>
          result.status === 'fulfilled' ? [result.value] : [],
        );
        try {
          for (const result of results) {
            if (result.status === 'rejected') throw result.reason;
          }
          for (const database of created) {
            expect(await countMigrationRows(database.url)).toBeGreaterThan(0);
            expect(await apiRoleExists(database.url)).toBe(true);
          }
        } finally {
          for (const database of created) await database.drop();
        }
      } finally {
        await reserved`select pg_advisory_unlock(${API_ROLE_IN_USE_LOCK})`;
        reserved.release();
        await admin.end();
      }
    },
    DB_TIMEOUT_MS,
  );
});

describe('DoD 4: falha', () => {
  it(
    'migração com SQL inválido rejeita com a mensagem do Postgres e não grava linha',
    async () => {
      const database = await createTestDatabase();
      const folder = mkdtempSync(join(tmpdir(), 'casa-migracao-invalida-'));
      try {
        cpSync(MIGRATIONS_FOLDER, folder, { recursive: true });
        const journal = readJournal(folder);
        const last = journal.entries.at(-1);
        if (last === undefined) throw new Error('journal sem migração');
        journal.entries.push({
          idx: last.idx + 1,
          when: last.when + 1000,
          tag: '9999_invalida',
          breakpoints: true,
        });
        writeFileSync(
          join(folder, 'meta', '_journal.json'),
          JSON.stringify(journal),
        );
        writeFileSync(
          join(folder, '9999_invalida.sql'),
          'select * from tabela_que_nao_existe;',
        );
        const before = await countMigrationRows(database.url);

        await expect(
          runMigrations({
            url: database.url,
            password: database.password,
            migrationsFolder: folder,
          }),
        ).rejects.toThrow(/relation "tabela_que_nao_existe" does not exist/);
        expect(await countMigrationRows(database.url)).toBe(before);
      } finally {
        rmSync(folder, { recursive: true, force: true });
        await database.drop();
      }
    },
    DB_TIMEOUT_MS,
  );

  it(
    'db:migrate contra host recusado escreve em stderr e sai com 1',
    async () => {
      const env: NodeJS.ProcessEnv = {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
      };
      env.MIGRATION_DATABASE_URL =
        'postgres://postgres@db.example.com:5432/postgres';
      env.MIGRATION_DATABASE_PASSWORD = 'senha-que-nao-pode-aparecer';
      const child = spawn('pnpm', ['run', '--silent', 'db:migrate'], {
        cwd: API_DIR,
        env,
      });
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (chunk: Buffer) => (stdout += chunk.toString()));
      child.stderr.on('data', (chunk: Buffer) => (stderr += chunk.toString()));
      const code = await new Promise<number | null>((resolve) =>
        child.on('close', resolve),
      );

      expect(code).toBe(1);
      expect(stderr).toMatch(/db:migrate falhou/);
      expect(stderr).toMatch(/db\.example\.com/);
      expect(stderr + stdout).not.toContain('senha-que-nao-pode-aparecer');
    },
    DB_TIMEOUT_MS,
  );
});
