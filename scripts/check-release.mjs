import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import config from '../release.config.cjs';

// Resolve the plugins bundled with semantic-release, rather than installing
// competing copies that can drift out of compatibility with its writer.
const require = createRequire(import.meta.url);
const releaseRequire = createRequire(require.resolve('semantic-release'));
const { analyzeCommits } = await import(pathToFileURL(releaseRequire.resolve('@semantic-release/commit-analyzer')));
const { generateNotes } = await import(
  pathToFileURL(releaseRequire.resolve('@semantic-release/release-notes-generator'))
);
const context = {
  cwd: process.cwd(),
  logger: { log() {} },
  options: { repositoryUrl: 'https://github.com/bhouston/fastify-file-router' },
};

for (const [message, expected] of [
  ['feat: add a route', 'minor'],
  ['fix: correct a route', 'patch'],
  ['docs: explain routes', null],
  ['feat!: remove legacy routes', 'major'],
  ['refactor: replace routes\n\nBREAKING CHANGE: remove the legacy API', 'major'],
]) {
  const actual = await analyzeCommits(config.plugins[0][1], { ...context, commits: [{ message }] });
  assert.equal(actual, expected, message);
}

// Exercise actual note rendering: compatible analysis alone does not prove
// the Conventional Commits preset works with the installed changelog writer.
const notes = await generateNotes(config.plugins[1][1], {
  ...context,
  commits: [{ message: 'fix: correct a route', hash: 'a'.repeat(40) }],
  lastRelease: { version: '3.1.0', gitTag: 'v3.1.0' },
  nextRelease: { version: '3.1.1', gitTag: 'v3.1.1' },
});
assert.match(notes, /correct a route/);
assert.match(notes, /3\.1\.1/);
console.log('Release tooling: version rules and changelog rendering passed.');
