import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export type Target = 'local' | 'dev' | 'prod';

export type DatabaseUrl = {
  target: Target;
  host: string;
  port: number;
  user: string;
  database: string;
};

/** TLS desligado, ou ligado com verificação contra a CA do Supabase. */
export type TlsOptions = false | { ca: string; rejectUnauthorized: true };

export type ConnectionOptions = {
  host: string;
  port: number;
  username: string;
  database: string;
  ssl: TlsOptions;
};

/** Certificado da CA do Supabase, o mesmo no painel do dev e no do prod. */
export const SUPABASE_CA_PATH = fileURLToPath(
  new URL('../../certs/supabase-ca.crt', import.meta.url),
);

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
const POOLER_HOSTS: Record<string, Target> = {
  'aws-0-us-west-2.pooler.supabase.com': 'dev',
  'aws-0-sa-east-1.pooler.supabase.com': 'prod',
};
const POOLER_SESSION_PORT = 5432;
const DEFAULT_PORT = 5432;

/**
 * Lê a URL de banco e decide o alvo pelo host.
 * Lança erro em pt-BR nos casos de recusa. A mensagem nunca repete a URL inteira,
 * porque ela pode trazer uma senha.
 */
export function parseDatabaseUrl(url: string): DatabaseUrl {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(
      'URL de banco inválida. Use o formato postgres://<usuário>@<host>:<porta>/<banco>.',
    );
  }
  if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') {
    throw new Error(
      'URL de banco inválida: o esquema tem que ser postgres:// ou postgresql://.',
    );
  }
  if (parsed.password !== '') {
    throw new Error(
      'A URL de banco não pode conter senha. Tire a senha da URL e use a variável de senha separada.',
    );
  }

  const host = parsed.hostname.replace(/^\[(.*)\]$/, '$1');
  const port = parsed.port === '' ? DEFAULT_PORT : Number(parsed.port);
  const user = decodeURIComponent(parsed.username);
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ''));

  let target: Target;
  if (LOCAL_HOSTS.has(host)) {
    target = 'local';
  } else {
    const pooler = POOLER_HOSTS[host];
    if (pooler === undefined) {
      throw new Error(
        `Host de banco recusado: ${host}. Só localhost e os poolers do dev e do prod são aceitos.`,
      );
    }
    if (port !== POOLER_SESSION_PORT) {
      throw new Error(
        `Porta recusada para o ${pooler}: ${port}. Use ${POOLER_SESSION_PORT}, o modo sessão do pooler.`,
      );
    }
    target = pooler;
  }

  if (user === '') {
    throw new Error('A URL de banco não informa o usuário.');
  }
  if (database === '') {
    throw new Error('A URL de banco não informa o banco.');
  }

  return { target, host, port, user, database };
}

/** O alvo que a URL aponta. Lança erro nos casos de recusa. */
export function resolveTarget(url: string): Target {
  return parseDatabaseUrl(url).target;
}

/**
 * Opções de conexão que o driver postgres recebe para a URL.
 * No dev e no prod, o TLS verifica a cadeia contra a CA versionada.
 * Parâmetros de consulta da URL, como sslmode, não entram nas opções.
 */
export function connectionOptions(url: string): ConnectionOptions {
  const { target, host, port, user, database } = parseDatabaseUrl(url);
  const ssl: TlsOptions =
    target === 'local'
      ? false
      : {
          ca: readFileSync(SUPABASE_CA_PATH, 'utf8'),
          rejectUnauthorized: true,
        };
  return { host, port, username: user, database, ssl };
}
