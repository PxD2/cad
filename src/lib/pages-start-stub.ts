/** Browser stand-in for @tanstack/react-start on GitHub Pages (no Node server). */

const offline = async () => ({
  ok: false as const,
  error: "Grok needs a server. On GitHub Pages use Local — stamp, laser, scan still run.",
});

export function createServerFn(_opts?: unknown) {
  const chain = {
    validator() {
      return chain;
    },
    input() {
      return chain;
    },
    handler() {
      return offline;
    },
  };
  return chain;
}

export const createMiddleware = createServerFn;
export const createStart = () => ({});
