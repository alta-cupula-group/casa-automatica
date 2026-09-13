/**
 * Formata um valor inteiro em centavos como reais, sem o símbolo da moeda.
 * O separador decimal é a vírgula, como manda o pt-BR.
 */
export function formatCents(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const absolute = Math.abs(cents);
  const whole = Math.trunc(absolute / 100);
  const fraction = absolute % 100;
  return `${sign}${whole},${String(fraction).padStart(2, '0')}`;
}
