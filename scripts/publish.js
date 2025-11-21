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

  const rootDir = process.cwd();

  // Run biome check before publishing
  console.log('Running biome check...');
  try {
    execSync('pnpm check', {
      stdio: 'inherit',
      cwd: rootDir,
    });
  } catch {
    console.error('Biome check failed. Please fix linting/formatting issues before publishing.');
    process.exit(1);
  }

  // Run tests before publishing
  console.log('Running tests...');
  try {
    execSync('pnpm test', {
      stdio: 'inherit',
      cwd: rootDir,
    });
  } catch {
    console.error('Tests failed. Please fix failing tests before publishing.');
    process.exit(1);
  }

  // Build all packages before publishing
  console.log('Building packages...');
  execSync('pnpm build', {
    stdio: 'inherit',
    cwd: rootDir,
  });

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
