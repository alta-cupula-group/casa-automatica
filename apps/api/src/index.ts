import { formatCents } from '@casa/shared';
import { loadConfig } from './config.js';

const config = loadConfig(process.env);

console.log(`api ok port=${config.port} sample=${formatCents(1099)}`);
