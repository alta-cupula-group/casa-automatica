// Viola só typescript/no-floating-promises.
function load(): Promise<number> {
  return Promise.resolve(1);
}

export function start(): void {
  load();
}
