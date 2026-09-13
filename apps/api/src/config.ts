export type Config = {
  port: number;
  nodeEnv: string;
};

const DEFAULT_PORT = 3000;
const DEFAULT_NODE_ENV = 'development';

/**
 * Lê a configuração da API a partir das variáveis de ambiente.
 * PORT precisa ser um inteiro maior que zero. Ausente, vale 3000.
 * NODE_ENV ausente vale 'development'.
 */
export function loadConfig(env: NodeJS.ProcessEnv): Config {
  const rawPort = env.PORT;
  const port = rawPort === undefined ? DEFAULT_PORT : Number(rawPort);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(
      `PORT inválida: "${rawPort}". Informe um número inteiro maior que zero.`,
    );
  }

  return {
    port,
    nodeEnv: env.NODE_ENV ?? DEFAULT_NODE_ENV,
  };
}
