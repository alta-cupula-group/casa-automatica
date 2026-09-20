import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { get } from 'node:http';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const entrypoint = fileURLToPath(new URL('../dist/index.js', import.meta.url));
const STARTUP_TIMEOUT_MS = 15_000;

type HttpResponse = { status: number; body: string };

/** Descobre uma porta livre em 127.0.0.1 para o processo da API usar. */
function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      if (address === null || typeof address === 'string') {
        probe.close();
        reject(new Error('não foi possível descobrir uma porta livre'));
        return;
      }
      const { port } = address;
      probe.close(() => resolve(port));
    });
  });
}

/** Faz uma requisição GET e devolve o código e o corpo da resposta. */
function request(port: number, path: string): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const req = get({ host: '127.0.0.1', port, path }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk: string) => {
        body += chunk;
      });
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
    });
    req.on('error', reject);
  });
}

/** Espera o processo anunciar que está escutando, ou falha com o motivo. */
function waitForListening(
  child: ChildProcessWithoutNullStreams,
  port: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => {
      reject(
        new Error(
          `a API não anunciou a porta ${port} em ${STARTUP_TIMEOUT_MS} ms. Saída: ${output}`,
        ),
      );
    }, STARTUP_TIMEOUT_MS);

    const finish = (failure?: Error) => {
      clearTimeout(timer);
      if (failure) {
        reject(failure);
        return;
      }
      resolve();
    };

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      output += chunk;
      if (output.includes(`api ok port=${port}`)) {
        finish();
      }
    });
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk: string) => {
      output += chunk;
    });
    child.on('error', (failure) => finish(failure));
    child.on('exit', (code) => {
      finish(
        new Error(
          `a API saiu com código ${code} em vez de continuar escutando. Saída: ${output}`,
        ),
      );
    });
  });
}

describe('servidor HTTP de @casa/api', () => {
  let child: ChildProcessWithoutNullStreams;
  let port: number;

  beforeAll(async () => {
    port = await findFreePort();
    child = spawn(process.execPath, [entrypoint], {
      env: { ...process.env, PORT: String(port) },
    });
    await waitForListening(child, port);
  });

  afterAll(() => {
    child?.kill();
  });

  it('responde 200 com corpo "ok" na raiz, na porta de PORT', async () => {
    const res = await request(port, '/');
    expect(res.status).toBe(200);
    expect(res.body).toBe('ok');
  });

  it('responde 200 com corpo "ok" em qualquer outra rota', async () => {
    const res = await request(port, '/rota/que/nao/existe');
    expect(res.status).toBe(200);
    expect(res.body).toBe('ok');
  });
});
