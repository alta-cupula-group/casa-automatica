import { realpathSync, statSync } from 'node:fs';
import { isAbsolute, join, relative, sep } from 'node:path';

/** Texto que o morador digita para migrar o prod. */
export const PROD_CONFIRMATION = 'casa-automatica-prod';

/**
 * O que a trava do prod precisa do mundo externo. O db:migrate passa o terminal, o
 * pg_dump e o banco reais. O teste passa substitutos.
 */
export type ProdGuardOptions = {
  /** A entrada padrão é um terminal. */
  stdinIsTTY: boolean;
  /** Pede o texto de confirmação ao morador e devolve o que ele digitou. */
  readConfirmation: () => Promise<string>;
  /** Valor de PROD_DUMP_DIR. */
  dumpDir: string | undefined;
  /** Raiz do repositório git. A exportação nunca fica dentro dela. */
  repoRoot: string;
  /** Versão maior do servidor do prod. Abre conexão. */
  serverMajorVersion: () => Promise<number>;
  /** Versão maior do pg_dump do PATH. */
  pgDumpMajorVersion: () => Promise<number>;
  /** Roda o pg_dump do banco inteiro para o arquivo e devolve o código de saída. */
  runPgDump: (file: string) => Promise<number>;
  /** Relógio, para o nome da exportação. */
  now: () => Date;
  /** Aplica as migrações. Só roda depois da exportação. */
  migrate: () => Promise<void>;
};

/** Nome da exportação: `casa-automatica-prod-<AAAAMMDDTHHMMSSZ>.dump`, em UTC. */
export function dumpFileName(now: Date): string {
  const stamp = now
    .toISOString()
    .replace(/\.\d{3}Z$/, 'Z')
    .replace(/[-:]/g, '');
  return `casa-automatica-prod-${stamp}.dump`;
}

/** Versão maior na saída de `pg_dump --version`, como `pg_dump (PostgreSQL) 17.6`. */
export function parsePgDumpMajorVersion(output: string): number {
  const match = /^pg_dump \(PostgreSQL\) (\d+)/m.exec(output);
  if (match?.[1] === undefined) {
    throw new Error(
      'Não foi possível ler a versão do pg_dump. Confira se o pg_dump está no PATH.',
    );
  }
  return Number(match[1]);
}

/** Recusa PROD_DUMP_DIR vazia, relativa, inexistente ou dentro do repositório. */
function checkDumpDir(dumpDir: string | undefined, repoRoot: string): string {
  if (dumpDir === undefined || dumpDir.trim() === '') {
    throw new Error(
      'PROD_DUMP_DIR está vazia. Informe o diretório absoluto onde a exportação do prod é gravada.',
    );
  }
  if (!isAbsolute(dumpDir)) {
    throw new Error(
      `PROD_DUMP_DIR tem que ser um caminho absoluto: ${dumpDir}.`,
    );
  }
  let resolved: string;
  try {
    if (!statSync(dumpDir).isDirectory()) throw new Error('não é diretório');
    resolved = realpathSync(dumpDir);
  } catch {
    throw new Error(
      `PROD_DUMP_DIR não existe ou não é um diretório: ${dumpDir}.`,
    );
  }
  const fromRepo = relative(realpathSync(repoRoot), resolved);
  const outside =
    fromRepo === '..' ||
    fromRepo.startsWith(`..${sep}`) ||
    isAbsolute(fromRepo);
  if (!outside) {
    throw new Error(
      `PROD_DUMP_DIR fica dentro do repositório git: ${dumpDir}. Use um diretório fora dele.`,
    );
  }
  return resolved;
}

/**
 * Trava do prod. Recusa sem terminal, sem a confirmação digitada ou com PROD_DUMP_DIR
 * inválida, tudo antes de abrir conexão. Depois exporta o banco com pg_dump e só migra
 * se a exportação terminou bem.
 */
export async function guardProdAndMigrate(
  options: ProdGuardOptions,
): Promise<{ dumpFile: string }> {
  if (!options.stdinIsTTY) {
    throw new Error(
      'O prod só migra de um terminal interativo. A entrada padrão não é um terminal.',
    );
  }
  const typed = await options.readConfirmation();
  if (typed !== PROD_CONFIRMATION) {
    throw new Error(
      `Confirmação recusada. Para migrar o prod, digite exatamente ${PROD_CONFIRMATION}.`,
    );
  }
  const dumpDir = checkDumpDir(options.dumpDir, options.repoRoot);

  // O pg_dump vem primeiro: sem ele, nem se abre conexão com o prod.
  const pgDumpMajor = await options.pgDumpMajorVersion();
  const serverMajor = await options.serverMajorVersion();
  if (pgDumpMajor < serverMajor) {
    throw new Error(
      `O pg_dump do PATH é da versão ${pgDumpMajor}, menor que a do servidor, ${serverMajor}. Instale o pg_dump ${serverMajor} ou mais novo.`,
    );
  }

  const dumpFile = join(dumpDir, dumpFileName(options.now()));
  let exitCode: number;
  try {
    exitCode = await options.runPgDump(dumpFile);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`O pg_dump falhou: ${message}. Nada foi migrado.`, {
      cause: error,
    });
  }
  if (exitCode !== 0) {
    throw new Error(`O pg_dump saiu com código ${exitCode}. Nada foi migrado.`);
  }
  let size: number;
  try {
    size = statSync(dumpFile).size;
  } catch {
    throw new Error(
      `O pg_dump terminou, mas a exportação não existe: ${dumpFile}. Nada foi migrado.`,
    );
  }
  if (size === 0) {
    throw new Error(
      `A exportação está vazia, com zero byte: ${dumpFile}. Nada foi migrado.`,
    );
  }

  await options.migrate();
  return { dumpFile };
}
