import { copyFileSync } from 'node:fs';

export function prepare() {
  for (const file of ['README.md', 'LICENSE', 'CHANGELOG.md']) {
    copyFileSync(file, `packages/fastify-file-router/${file}`);
  }
}
