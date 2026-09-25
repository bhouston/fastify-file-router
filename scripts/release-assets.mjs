import { copyFileSync } from 'node:fs';

// The package README is hand-maintained in packages/fastify-file-router directly;
// only LICENSE needs copying in so pnpm publish includes it.
export function prepare() {
  for (const file of ['LICENSE']) {
    copyFileSync(file, `packages/fastify-file-router/${file}`);
  }
}
