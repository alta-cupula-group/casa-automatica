import { describe, expect, it } from 'vitest';
import { formatCents } from './index.js';

describe('formatCents', () => {
  it('formata um valor com reais e centavos', () => {
    expect(formatCents(1099)).toBe('10,99');
  });

  it('preenche os centavos com zero à esquerda', () => {
    expect(formatCents(5)).toBe('0,05');
  });

  it('mantém o sinal negativo antes do valor', () => {
    expect(formatCents(-1099)).toBe('-10,99');
  });
});
