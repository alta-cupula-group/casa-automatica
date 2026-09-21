import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  PROD_CONFIRMATION,
  dumpFileName,
  guardProdAndMigrate,
  parsePgDumpMajorVersion,
  type ProdGuardOptions,
} from './prod-guard.js';

let workDir: string;
let repoRoot: string;
let dumpDir: string;
let events: string[];

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), 'casa-prod-guard-'));
  repoRoot = join(workDir, 'repo');
  dumpDir = join(workDir, 'exportacoes');
  mkdirSync(repoRoot);
  mkdirSync(dumpDir);
  events = [];
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

/** Opções do caminho feliz. Cada teste troca só o que quer exercitar. */
function happyOptions(
  overrides: Partial<ProdGuardOptions> = {},
): ProdGuardOptions {
  return {
    stdinIsTTY: true,
    readConfirmation: () => {
      events.push('confirmação');
      return Promise.resolve(PROD_CONFIRMATION);
    },
    dumpDir,
    repoRoot,
    serverMajorVersion: () => {
      events.push('versão do servidor');
      return Promise.resolve(17);
    },
    pgDumpMajorVersion: () => {
      events.push('versão do pg_dump');
      return Promise.resolve(17);
    },
    runPgDump: async (file) => {
      events.push('pg_dump começou');
      await new Promise((resolve) => setTimeout(resolve, 20));
      writeFileSync(file, 'PGDMP conteúdo da exportação');
      events.push('pg_dump terminou');
      return 0;
    },
    now: () => new Date(Date.UTC(2026, 8, 21, 13, 5, 9)),
    migrate: () => {
      events.push('migração');
      return Promise.resolve();
    },
    ...overrides,
  };
}

describe('DoD 6: trava do prod', () => {
  it('recusa sem terminal, antes de pedir confirmação', async () => {
    await expect(
      guardProdAndMigrate(happyOptions({ stdinIsTTY: false })),
    ).rejects.toThrow(/terminal/i);
    expect(events).toEqual([]);
  });

  it.each(['', 'sim', 'casa-automatica-dev', 'Casa-Automatica-Prod'])(
    'recusa o texto de confirmação %j',
    async (typed) => {
      await expect(
        guardProdAndMigrate(
          happyOptions({ readConfirmation: () => Promise.resolve(typed) }),
        ),
      ).rejects.toThrow(/confirma/i);
      expect(events).toEqual([]);
    },
  );

  it('recusa PROD_DUMP_DIR vazia', async () => {
    await expect(
      guardProdAndMigrate(happyOptions({ dumpDir: '' })),
    ).rejects.toThrow(/PROD_DUMP_DIR/);
    expect(events).not.toContain('migração');
    expect(events).not.toContain('pg_dump começou');
  });

  it('recusa PROD_DUMP_DIR ausente', async () => {
    await expect(
      guardProdAndMigrate(happyOptions({ dumpDir: undefined })),
    ).rejects.toThrow(/PROD_DUMP_DIR/);
  });

  it('recusa PROD_DUMP_DIR que não existe', async () => {
    await expect(
      guardProdAndMigrate(
        happyOptions({ dumpDir: join(workDir, 'nao-existe') }),
      ),
    ).rejects.toThrow(/PROD_DUMP_DIR/);
    expect(events).not.toContain('pg_dump começou');
  });

  it('recusa PROD_DUMP_DIR relativa', async () => {
    await expect(
      guardProdAndMigrate(happyOptions({ dumpDir: 'exportacoes' })),
    ).rejects.toThrow(/PROD_DUMP_DIR/);
  });

  it('recusa PROD_DUMP_DIR dentro do repositório', async () => {
    const inside = join(repoRoot, 'backups');
    mkdirSync(inside);
    await expect(
      guardProdAndMigrate(happyOptions({ dumpDir: inside })),
    ).rejects.toThrow(/reposit/i);
    expect(events).not.toContain('pg_dump começou');
  });

  it('recusa PROD_DUMP_DIR igual à raiz do repositório', async () => {
    await expect(
      guardProdAndMigrate(happyOptions({ dumpDir: repoRoot })),
    ).rejects.toThrow(/reposit/i);
  });

  it('recusa pg_dump de versão maior menor que a do servidor', async () => {
    await expect(
      guardProdAndMigrate(
        happyOptions({ pgDumpMajorVersion: () => Promise.resolve(16) }),
      ),
    ).rejects.toThrow(/pg_dump/);
    expect(events).not.toContain('pg_dump começou');
    expect(events).not.toContain('migração');
  });

  it('aceita pg_dump de versão maior mais nova que a do servidor', async () => {
    await guardProdAndMigrate(
      happyOptions({ pgDumpMajorVersion: () => Promise.resolve(18) }),
    );
    expect(events).toContain('migração');
  });

  it('com pg_dump saindo com código diferente de 0, nada migra', async () => {
    await expect(
      guardProdAndMigrate(
        happyOptions({ runPgDump: () => Promise.resolve(1) }),
      ),
    ).rejects.toThrow(/pg_dump/);
    expect(events).not.toContain('migração');
  });

  it('com pg_dump lançando erro, nada migra', async () => {
    await expect(
      guardProdAndMigrate(
        happyOptions({
          runPgDump: () => Promise.reject(new Error('spawn pg_dump ENOENT')),
        }),
      ),
    ).rejects.toThrow(/pg_dump/);
    expect(events).not.toContain('migração');
  });

  it('com exportação vazia, nada migra', async () => {
    await expect(
      guardProdAndMigrate(
        happyOptions({
          runPgDump: (file) => {
            writeFileSync(file, '');
            return Promise.resolve(0);
          },
        }),
      ),
    ).rejects.toThrow(/vazi|zero/i);
    expect(events).not.toContain('migração');
  });

  it('com exportação que não foi gravada, nada migra', async () => {
    await expect(
      guardProdAndMigrate(
        happyOptions({ runPgDump: () => Promise.resolve(0) }),
      ),
    ).rejects.toThrow(/pg_dump|exporta/i);
    expect(events).not.toContain('migração');
  });

  it('no caminho feliz, a exportação termina antes da migração começar', async () => {
    const result = await guardProdAndMigrate(happyOptions());
    expect(events).toEqual([
      'confirmação',
      'versão do pg_dump',
      'versão do servidor',
      'pg_dump começou',
      'pg_dump terminou',
      'migração',
    ]);
    expect(result.dumpFile).toBe(
      join(dumpDir, 'casa-automatica-prod-20260921T130509Z.dump'),
    );
  });

  it('o nome da exportação usa o horário UTC', () => {
    expect(dumpFileName(new Date(Date.UTC(2026, 0, 2, 3, 4, 5)))).toBe(
      'casa-automatica-prod-20260102T030405Z.dump',
    );
  });

  it.each([
    ['pg_dump (PostgreSQL) 17.6', 17],
    ['pg_dump (PostgreSQL) 18.1 (Debian 18.1-1.pgdg13+2)', 18],
    ['pg_dump (PostgreSQL) 9.6.24', 9],
  ])('lê a versão maior de %j', (output, major) => {
    expect(parsePgDumpMajorVersion(output)).toBe(major);
  });

  it('recusa saída de pg_dump --version que não reconhece', () => {
    expect(() => parsePgDumpMajorVersion('bash: pg_dump: not found')).toThrow(
      /pg_dump/,
    );
  });
});
