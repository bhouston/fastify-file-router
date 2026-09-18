module.exports = {
  branches: ['main'],
  tagFormat: 'v${version}',
  plugins: [
    ['@semantic-release/commit-analyzer', { preset: 'conventionalcommits' }],
    ['@semantic-release/release-notes-generator', { preset: 'conventionalcommits' }],
    ['@semantic-release/changelog', { changelogFile: 'CHANGELOG.md' }],
    './scripts/release-assets.mjs',
    ['@anolilab/semantic-release-pnpm', { pkgRoot: 'packages/fastify-file-router' }],
    ['@semantic-release/github', { successComment: false, failComment: false, releasedLabels: false }],
  ],
};
