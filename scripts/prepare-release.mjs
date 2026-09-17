import { copyFileSync } from 'node:fs';

// Run after the build, and again after semantic-release generates the changelog.
for (const file of ['README.md', 'LICENSE', 'CHANGELOG.md']) {
  copyFileSync(
    new URL(`../${file}`, import.meta.url),
    new URL(`../packages/fastify-file-router/${file}`, import.meta.url),
  );
}
