import type { Stats } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import fp from 'fastify-plugin';
import { defaultExcludePatterns } from './constants.js';
import type { FastifyFileRouterOptions } from './FastifyFileRouterOptions.js';
import { registerRoutes } from './routeRegistration.js';

export const fastifyFileRouter = fp<FastifyFileRouterOptions>(
  async (
    fastify,
    {
      mount = '/',
      routesDirs = ['./routes', './src/routes'],
      buildRoot = '.',
      extensions = ['.js', '.ts', '.jsx', '.tsx'],
      convention = 'remix',
      logLevel = 'info',
      logRoutes = false,
      // ignore files that start with a dot, or underscore.  Also ignore files that end in .test.js or .test.ts or include __tests__ in the path or include .d.ts
      // also ignore files that end in .spec.js or .spec.ts
      exclude: excludePatterns = defaultExcludePatterns,
    }: FastifyFileRouterOptions,
  ) => {
    const cwd = process.env.REMIX_ROOT ?? process.cwd();

    for (const extension of extensions) {
      if (!extension.startsWith('.')) {
        throw new Error(`Invalid extension "${extension}", must start with a dot`);
      }
    }

    if (!mount.startsWith('/')) {
      throw new Error(`Mount point "${mount}" must start with a slash`);
    }

    if (path.isAbsolute(buildRoot)) {
      throw new Error(`Build root "${buildRoot}" is an absolute path, but must be a relative path`);
    }

    // Validate that buildRoot exists and is a directory
    const absoluteBuildRoot = path.resolve(cwd, buildRoot);
    let buildRootStats: Stats;
    try {
      buildRootStats = await fs.lstat(absoluteBuildRoot);
    } catch {
      throw new Error(`Build root directory does not exist: ${absoluteBuildRoot}`);
    }
    if (!buildRootStats.isDirectory()) {
      throw new Error(`Build root is not a directory: ${absoluteBuildRoot}`);
    }

    await Promise.all(
      routesDirs.map(async (routesDir) => {
        if (path.isAbsolute(routesDir)) {
          throw new Error(`Routes directory "${routesDir}" is an absolute path, but must be a relative path`);
        }
        const sourceRouteDir = path.join(buildRoot, routesDir);
        const absoluteSourceRoutesDir = path.resolve(cwd, sourceRouteDir);
        let stats: Stats;
        try {
          stats = await fs.lstat(absoluteSourceRoutesDir);
        } catch {
          throw new Error(`Routes directory does not exist: ${absoluteSourceRoutesDir}`);
        }
        if (!stats.isDirectory()) {
          throw new Error(`Routes directory is not a directory: ${absoluteSourceRoutesDir}`);
        }
        await registerRoutes(
          fastify,
          mount,
          extensions,
          convention,
          logLevel,
          excludePatterns,
          absoluteSourceRoutesDir,
          absoluteSourceRoutesDir,
          logRoutes,
        );
      }),
    );
  },
  {
    // replaced with the package name during build
    name: 'fastify-file-router',
    fastify: '5.x',
  },
);
