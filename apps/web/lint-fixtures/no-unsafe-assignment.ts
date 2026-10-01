// Viola só typescript/no-unsafe-assignment.
export function parse(text: string): unknown {
  const data = JSON.parse(text);
  return data;
}
