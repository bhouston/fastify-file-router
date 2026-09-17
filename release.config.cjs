module.exports = {
  branches: ['main'],
  tagFormat: 'v${version}',
  plugins: [
    ['@semantic-release/commit-analyzer', { preset: 'conventionalcommits' }],
    ['@semantic-release/release-notes-generator', { preset: 'conventionalcommits' }],
    ['@semantic-release/changelog', { changelogFile: 'CHANGELOG.md' }],
    './scripts/release-assets.mjs',
    ['@semantic-release/npm', { pkgRoot: 'packages/fastify-file-router' }],
    [
      '@semantic-release/git',
      {
        assets: ['CHANGELOG.md', 'packages/fastify-file-router/package.json'],
        message: 'chore(release): ${nextRelease.version}\n\n${nextRelease.notes}',
      },
    ],
    ['@semantic-release/github', { successComment: false, failComment: false, releasedLabels: false }],
  ],
};
