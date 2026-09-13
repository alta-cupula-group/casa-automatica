import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('mostra o valor formatado que vem de @casa/shared', () => {
    render(<App />);
    expect(screen.getByTestId('sample').textContent).toBe('10,99');
  });
});
