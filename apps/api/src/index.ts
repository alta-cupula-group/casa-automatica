import { createServer } from 'node:http';
import { formatCents } from '@casa/shared';
import { loadConfig } from './config.js';

const config = loadConfig(process.env);

const server = createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('ok');
});

server.listen(config.port, () => {
  console.log(`api ok port=${config.port} sample=${formatCents(1099)}`);
});
