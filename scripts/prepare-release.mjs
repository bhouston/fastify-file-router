import { copyFileSync } from 'node:fs';

// Run after the build, and again after semantic-release generates the changelog.
// The package README is hand-maintained in place and no longer copied from root.
for (const file of ['LICENSE', 'CHANGELOG.md']) {
  copyFileSync(
    new URL(`../${file}`, import.meta.url),
    new URL(`../packages/fastify-file-router/${file}`, import.meta.url),
  );
}
