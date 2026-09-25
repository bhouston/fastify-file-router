import { copyFileSync } from 'node:fs';

// Run after the build so `npm pack --dry-run` can inspect the publishable package.
// The package README is hand-maintained in place and no longer copied from root.
for (const file of ['LICENSE']) {
  copyFileSync(
    new URL(`../${file}`, import.meta.url),
    new URL(`../packages/fastify-file-router/${file}`, import.meta.url),
  );
}
