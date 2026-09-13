import { describe, expect, it } from 'vitest';
import { loadConfig } from './config.js';

describe('loadConfig', () => {
  it('usa os padrões quando o ambiente está vazio', () => {
    expect(loadConfig({})).toEqual({ port: 3000, nodeEnv: 'development' });
  });

  it('usa os padrões quando as variáveis vêm sem valor', () => {
    expect(loadConfig({ PORT: '', NODE_ENV: '' })).toEqual({
      port: 3000,
      nodeEnv: 'development',
    });
  });

  it('lê os valores que vêm do ambiente', () => {
    expect(loadConfig({ PORT: '8080', NODE_ENV: 'production' })).toEqual({
      port: 8080,
      nodeEnv: 'production',
    });
  });

  it('lança erro quando PORT não é numérica', () => {
    expect(() => loadConfig({ PORT: 'abc' })).toThrow(/PORT inválida/);
  });
});
