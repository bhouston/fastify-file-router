import { copyFileSync } from 'node:fs';

// The package README is hand-maintained in packages/fastify-file-router directly;
// only LICENSE and CHANGELOG.md need copying in so pnpm publish includes them.
export function prepare() {
  for (const file of ['LICENSE', 'CHANGELOG.md']) {
    copyFileSync(file, `packages/fastify-file-router/${file}`);
  }
}
