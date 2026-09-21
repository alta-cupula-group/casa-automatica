import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MIGRATIONS_FOLDER } from './migrate.js';
import {
  connectAsAdmin,
  connectAsApiRole,
  createTestDatabase,
} from './test-database.js';

const DB_TIMEOUT_MS = 60_000;

type TestDatabase = Awaited<ReturnType<typeof createTestDatabase>>;
type ApiConnection = Awaited<ReturnType<typeof connectAsApiRole>>;

let database: TestDatabase;
let api: ApiConnection;

beforeAll(async () => {
  database = await createTestDatabase();
  api = await connectAsApiRole(database.url);
}, DB_TIMEOUT_MS);

afterAll(async () => {
  await api?.close();
  await database?.drop();
}, DB_TIMEOUT_MS);

describe('DoD 3: papel api_app', () => {
  it('tem os atributos da tabela do papel', async () => {
    const admin = connectAsAdmin(database.url);
    try {
      const rows = await admin`
        select rolcanlogin, rolsuper, rolbypassrls, rolcreaterole,
               rolcreatedb, rolinherit
        from pg_roles where rolname = 'api_app'`;
      expect(rows).toEqual([
        {
          rolcanlogin: true,
          rolsuper: false,
          rolbypassrls: false,
          rolcreaterole: false,
          rolcreatedb: false,
          rolinherit: false,
        },
      ]);
    } finally {
      await admin.end();
    }
  });

  it('não é dono de nenhum objeto, em nenhum banco do cluster', async () => {
    const admin = connectAsAdmin(database.url);
    try {
      const owned = await admin`
        select classid::regclass::text as catalog, objid
        from pg_shdepend
        where refclassid = 'pg_authid'::regclass
          and refobjid = (select oid from pg_roles where rolname = 'api_app')
          and deptype = 'o'`;
      expect(owned).toEqual([]);
    } finally {
      await admin.end();
    }
  });

  it('nenhuma migração define senha para api_app', () => {
    const files = readdirSync(MIGRATIONS_FOLDER).filter((file) =>
      file.endsWith('.sql'),
    );
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const sql = readFileSync(join(MIGRATIONS_FOLDER, file), 'utf8');
      expect(sql).not.toMatch(/password/i);
    }
  });

  it('conecta como ele mesmo com a senha definida no teste', async () => {
    const rows = await api.sql<
      { current_user: string; session_user: string }[]
    >`
      select current_user, session_user`;
    expect(rows).toEqual([
      { current_user: 'api_app', session_user: 'api_app' },
    ]);
  });
});
