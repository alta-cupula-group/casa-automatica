// Viola só react-hooks/rules-of-hooks.
import { useState } from 'react';

export function Counter({ enabled }: { enabled: boolean }) {
  if (enabled) {
    const [count] = useState(0);
    return <p>{count}</p>;
  }
  return null;
}
