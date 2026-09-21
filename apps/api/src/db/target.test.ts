import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  SUPABASE_CA_PATH,
  connectionOptions,
  parseDatabaseUrl,
  resolveTarget,
} from './target.js';

const DEV_HOST = 'aws-0-us-west-2.pooler.supabase.com';
const PROD_HOST = 'aws-0-sa-east-1.pooler.supabase.com';
const CA_FILE = fileURLToPath(
  new URL('../../certs/supabase-ca.crt', import.meta.url),
);

/** Captura a mensagem do erro que a função lança. Falha se ela não lançar. */
function errorMessage(fn: () => unknown): string {
  try {
    fn();
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  throw new Error('a função deveria ter lançado erro');
}

describe('DoD 5: alvo pelo host', () => {
  it.each([
    ['postgres://postgres@localhost:54322/postgres', 'local'],
    ['postgres://postgres@127.0.0.1:5432/postgres', 'local'],
    ['postgres://postgres@[::1]:5432/postgres', 'local'],
    [`postgres://postgres.devref@${DEV_HOST}:5432/postgres`, 'dev'],
    [`postgres://postgres.prodref@${PROD_HOST}:5432/postgres`, 'prod'],
    [`postgresql://postgres.prodref@${PROD_HOST}:5432/postgres`, 'prod'],
  ])('%s é %s', (url, target) => {
    expect(resolveTarget(url)).toBe(target);
  });

  it('recusa host desconhecido', () => {
    expect(() =>
      resolveTarget('postgres://postgres@db.example.com:5432/postgres'),
    ).toThrow(/host/i);
  });

  it('recusa o host direto do Supabase, que não é o pooler', () => {
    expect(() =>
      resolveTarget('postgres://postgres@db.abcdef.supabase.co:5432/postgres'),
    ).toThrow(/host/i);
  });

  it.each([DEV_HOST, PROD_HOST])(
    'recusa porta diferente de 5432 em %s',
    (host) => {
      expect(() =>
        resolveTarget(`postgres://postgres.ref@${host}:6543/postgres`),
      ).toThrow(/5432/);
    },
  );

  it('aceita qualquer porta no local', () => {
    expect(resolveTarget('postgres://postgres@localhost:6543/postgres')).toBe(
      'local',
    );
  });

  it('recusa URL com senha, e a mensagem não contém a senha', () => {
    const password = 'S3nh4%Secreta';
    const message = errorMessage(() =>
      resolveTarget(`postgres://postgres.ref:${password}@${PROD_HOST}:5432/db`),
    );
    expect(message).toMatch(/senha/i);
    expect(message).not.toContain(password);
    expect(message).not.toContain('S3nh4');
  });

  it('recusa URL com senha também no local', () => {
    expect(() =>
      resolveTarget('postgres://postgres:abc@localhost:5432/postgres'),
    ).toThrow(/senha/i);
  });

  it('recusa URL que não é Postgres', () => {
    expect(() => resolveTarget('mysql://root@localhost:3306/db')).toThrow();
  });

  it('recusa texto que não é URL, sem ecoar o texto', () => {
    const message = errorMessage(() => resolveTarget('nada:segredo@@'));
    expect(message).not.toContain('segredo');
  });

  it('devolve host, usuário, porta e banco', () => {
    expect(
      parseDatabaseUrl(`postgres://postgres.ref@${DEV_HOST}:5432/postgres`),
    ).toEqual({
      target: 'dev',
      host: DEV_HOST,
      port: 5432,
      user: 'postgres.ref',
      database: 'postgres',
    });
  });
});

describe('DoD 7: TLS pelas opções de conexão', () => {
  it('o certificado versionado é a CA do Supabase', () => {
    expect(SUPABASE_CA_PATH).toBe(CA_FILE);
    expect(readFileSync(CA_FILE, 'utf8')).toContain('BEGIN CERTIFICATE');
  });

  it.each([DEV_HOST, PROD_HOST])(
    'em %s verifica o certificado contra a CA versionada',
    (host) => {
      const options = connectionOptions(
        `postgres://postgres.ref@${host}:5432/postgres`,
      );
      expect(options.ssl).toEqual({
        ca: readFileSync(CA_FILE, 'utf8'),
        rejectUnauthorized: true,
      });
      expect(options.host).toBe(host);
      expect(options.port).toBe(5432);
      expect(options.username).toBe('postgres.ref');
      expect(options.database).toBe('postgres');
    },
  );

  it('no local não usa TLS', () => {
    const options = connectionOptions(
      'postgres://postgres@localhost:54322/postgres',
    );
    expect(options.ssl).toBe(false);
  });

  it('o parâmetro sslmode da URL não desliga a verificação', () => {
    const options = connectionOptions(
      `postgres://postgres.ref@${PROD_HOST}:5432/postgres?sslmode=disable`,
    );
    expect(options.ssl).toMatchObject({ rejectUnauthorized: true });
  });
});
