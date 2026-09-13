export type Config = {
  port: number;
  nodeEnv: string;
};

const DEFAULT_PORT = 3000;
const DEFAULT_NODE_ENV = 'development';

/**
 * Lê a configuração da API a partir das variáveis de ambiente.
 * PORT ausente ou vazia vale 3000. Valor não numérico é erro.
 * NODE_ENV ausente ou vazia vale 'development'.
 */
export function loadConfig(env: NodeJS.ProcessEnv): Config {
  const rawPort = env.PORT;
  const rawNodeEnv = env.NODE_ENV;

  let port = DEFAULT_PORT;
  if (rawPort !== undefined && rawPort !== '') {
    port = Number(rawPort);
    if (!Number.isFinite(port)) {
      throw new Error(
        `PORT inválida: "${rawPort}". Informe um número ou deixe a variável vazia.`,
      );
    }
  }

  const nodeEnv =
    rawNodeEnv === undefined || rawNodeEnv === ''
      ? DEFAULT_NODE_ENV
      : rawNodeEnv;

  return { port, nodeEnv };
}
