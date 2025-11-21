#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { globSync } from 'glob';
import semver from 'semver';

const packages = globSync('packages/*', { absolute: true });

function getTaggedVersion() {
  const output = execSync('git tag --list --points-at HEAD').toString().trim();
  return output.replace(/^v/g, '');
}

/**
 * @param {string} dir
 * @param {string} tag
 */
function publish(dir, tag) {
  execSync(`npm publish --access public --tag ${tag} ${dir}`, {
    stdio: 'inherit',
  });
}

async function run() {
  // Make sure there's a current tag
  const taggedVersion = getTaggedVersion();
  if (taggedVersion === '') {
    console.error('Missing release version. Run the version script first.');
    process.exit(1);
  }

  const prerelease = semver.prerelease(taggedVersion);
  const prereleaseTag = prerelease ? String(prerelease[0]) : undefined;
  const tag = prereleaseTag
    ? prereleaseTag.includes('nightly')
      ? 'nightly'
      : prereleaseTag.includes('experimental')
        ? 'experimental'
        : prereleaseTag
    : 'latest';

  for (const name of packages) {
    publish(name, tag);
  }
}

run().then(
  () => {
    process.exit(0);
  },
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
