import { formatCents } from '@casa/shared';

export function App() {
  const apiUrl = import.meta.env.VITE_API_URL ?? '';

  return (
    <main>
      <h1>Casa Automática</h1>
      <p data-testid="sample">{formatCents(1099)}</p>
      <p data-testid="api-url">{apiUrl}</p>
    </main>
  );
}
