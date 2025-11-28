#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function main() {
  const packagePath = process.argv[2];

  if (!packagePath) {
    throw new Error('Error: Package path is required');
  }

  const resolvedPackagePath = resolve(packagePath);
  const publishPath = join(resolvedPackagePath, 'publish');
  const rootPath = resolve(__dirname, '..');

  // Verify package directory exists
  if (!existsSync(resolvedPackagePath)) {
    throw new Error(`Error: Package directory does not exist: ${resolvedPackagePath}`);
  }

  // Verify package.json exists
  const packageJsonPath = join(resolvedPackagePath, 'package.json');
  if (!existsSync(packageJsonPath)) {
    throw new Error(`Error: package.json not found in: ${resolvedPackagePath}`);
  }

  console.log(`Cleaning publish dir`);
  if (existsSync(publishPath)) {
    rmSync(publishPath, { recursive: true, force: true });
  }
  mkdirSync(publishPath, { recursive: true });

  console.log(`Building package`);
  execSync('pnpm -s build', { cwd: resolvedPackagePath, stdio: 'inherit' });

  console.log('Copying files to publish directory...');

  // Copy dist directory
  console.log(`Copying dist directory`);
  const distPath = join(resolvedPackagePath, 'dist');
  if (!existsSync(distPath)) {
    throw new Error(`Error: dist directory not found at ${distPath}`);
  }
  cpSync(distPath, join(publishPath, 'dist'), { recursive: true });

  console.log(`Copying package.json`);
  cpSync(packageJsonPath, join(publishPath, 'package.json'));

  console.log(`Copying LICENSE from root`);
  const licensePath = join(rootPath, 'LICENSE');
  if (!existsSync(licensePath)) {
    throw new Error(`Error: LICENSE not found at ${licensePath}`);
  }
  cpSync(licensePath, join(publishPath, 'LICENSE'));

  console.log(`Copying README from root`);
  const readmePath = join(rootPath, 'README.md');
  if (!existsSync(readmePath)) {
    throw new Error(`Error: README.md not found at ${readmePath}`);
  }
  cpSync(readmePath, join(publishPath, 'README.md'));

  console.log(`Publishing package`);
  execSync('npm publish ./publish/ --access public', {
    cwd: resolvedPackagePath,
    stdio: 'inherit',
  });

  console.log(`Release completed successfully!`);
}

try {
  main();
} catch (error) {
  console.error(`Error: Release failed: ${error}`);
  process.exit(1);
}
