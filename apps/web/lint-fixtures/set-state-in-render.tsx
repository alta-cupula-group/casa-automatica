// Viola só react/set-state-in-render.
import { useState } from 'react';

export function Loop() {
  const [count, setCount] = useState(0);
  setCount(count + 1);
  return <p>{count}</p>;
}
