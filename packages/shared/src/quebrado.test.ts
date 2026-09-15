import { describe, expect, it } from 'vitest';
import { formatCents } from './index.js';

describe('teste quebrado de propósito', () => {
  it('falha para provar que a CI barra o merge', () => {
    expect(formatCents(1099)).toBe('valor errado');
  });
});
