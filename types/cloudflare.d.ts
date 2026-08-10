// Minimal ambient declarations for the Cloudflare Workers runtime surface used
// by the worker entry and D1 binding. The real types are provided by the
// vinext / @cloudflare/vite-plugin toolchain at build time; these keep
// `tsc --noEmit` clean without pulling in the full @cloudflare/workers-types.

declare module "cloudflare:workers" {
  export const env: {
    DB?: D1Database;
    [key: string]: unknown;
  };
}

// Runtime globals surfaced by the Workers environment.
type Fetcher = { fetch(input: Request | string, init?: RequestInit): Promise<Response> };

interface D1Database {
  prepare(query: string): unknown;
  dump(): Promise<ArrayBuffer>;
  batch(statements: unknown[]): Promise<unknown[]>;
  exec(query: string): Promise<unknown>;
}
