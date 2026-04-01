import type { Stats } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { defaultExcludePatterns } from './constants.js';
import type { FastifyFileRouterOptions } from './FastifyFileRouterOptions.js';
import { createRouteRegistrationRuntimeContext, registerRoutes } from './routeRegistration.js';

const fastifyFileRouterPlugin: FastifyPluginAsync<FastifyFileRouterOptions> = async (
  fastify,
  {
    mount = '/',
    routesDirs = ['./routes', './src/routes'],
    buildRoot = '.',
    extensions = ['.js', '.ts', '.jsx', '.tsx'],
    convention = 'remix',
    logLevel = 'info',
    logRoutes = false,
    zodResponseValidation = false,
    maxConcurrentTasks = 4,
    profile: profileOptions = {},
    // ignore files that start with a dot, or underscore.  Also ignore files that end in .test.js or .test.ts or include __tests__ in the path or include .d.ts
    // also ignore files that end in .spec.js or .spec.ts
    exclude: excludePatterns = defaultExcludePatterns.slice(),
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

  if (!Number.isInteger(maxConcurrentTasks) || maxConcurrentTasks < 1) {
    throw new Error(`Invalid maxConcurrentTasks "${maxConcurrentTasks}", must be an integer greater than 0`);
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

  const profileEnabled = profileOptions.enabled ?? false;
  const logIndividualRoutes = profileOptions.logIndividualRoutes ?? false;
  const slowestRoutesCount = profileOptions.slowestRoutesCount ?? 10;

  if (!Number.isInteger(slowestRoutesCount) || slowestRoutesCount < 1) {
    throw new Error(`Invalid profile.slowestRoutesCount "${slowestRoutesCount}", must be an integer greater than 0`);
  }

  const absoluteRoutesDirs: string[] = [];
  for (const routesDir of routesDirs) {
    if (path.isAbsolute(routesDir)) {
      throw new Error(`Routes directory "${routesDir}" is an absolute path, but must be a relative path`);
    }
    const sourceRouteDir = path.join(buildRoot, routesDir);
    absoluteRoutesDirs.push(path.resolve(cwd, sourceRouteDir));
  }

  const sortedDirs = absoluteRoutesDirs.toSorted();
  const warnedPairs = new Set<string>();
  for (let i = 0; i < sortedDirs.length; i += 1) {
    for (let j = i + 1; j < sortedDirs.length; j += 1) {
      const a = sortedDirs.at(i);
      const b = sortedDirs.at(j);
      if (!a || !b) {
        continue;
      }
      const overlap = b === a || b.startsWith(`${a}${path.sep}`);
      if (!overlap) {
        continue;
      }
      const key = `${a}::${b}`;
      if (warnedPairs.has(key)) {
        continue;
      }
      warnedPairs.add(key);
      fastify.log.warn(
        `Overlapping routesDirs detected: "${a}" and "${b}". This can cause redundant scanning and duplicate route registration.`,
      );
    }
  }

  const runtimeContext = createRouteRegistrationRuntimeContext({
    maxConcurrentTasks,
    profiling: {
      enabled: profileEnabled,
      logIndividualRoutes,
      slowestRoutesCount,
    },
  });
  const pluginStart = performance.now();

  await Promise.all(
    absoluteRoutesDirs.map(async (absoluteSourceRoutesDir) => {
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
        zodResponseValidation,
        runtimeContext,
      );
    }),
  );

  if (profileEnabled) {
    const pluginTotalMs = performance.now() - pluginStart;
    const routeCount = runtimeContext.profiling.routes.length;
    const dirCount = runtimeContext.profiling.directories.length;
    const totalImportMs = runtimeContext.profiling.routes.reduce((sum, route) => sum + route.importMs, 0);
    const totalPrepareMs = runtimeContext.profiling.routes.reduce((sum, route) => sum + route.prepareMs, 0);
    const totalRegisterMs = runtimeContext.profiling.routes.reduce((sum, route) => sum + route.registerMs, 0);

    fastify.log[logLevel](
      `[fastify-file-router profile] loaded ${routeCount} routes from ${dirCount} directories in ${pluginTotalMs.toFixed(2)}ms (import ${totalImportMs.toFixed(2)}ms, prepare ${totalPrepareMs.toFixed(2)}ms, register ${totalRegisterMs.toFixed(2)}ms)`,
    );

    const slowest = runtimeContext.profiling.routes
      .toSorted((a, b) => b.totalMs - a.totalMs)
      .slice(0, slowestRoutesCount);
    for (const route of slowest) {
      fastify.log[logLevel](
        `[fastify-file-router profile] slow route ${route.method.toUpperCase()} ${route.url} total=${route.totalMs.toFixed(2)}ms import=${route.importMs.toFixed(2)}ms prepare=${route.prepareMs.toFixed(2)}ms register=${route.registerMs.toFixed(2)}ms file=${route.filePath}`,
      );
    }

    if (logIndividualRoutes) {
      for (const route of runtimeContext.profiling.routes) {
        fastify.log[logLevel](
          `[fastify-file-router profile] route ${route.method.toUpperCase()} ${route.url} total=${route.totalMs.toFixed(2)}ms import=${route.importMs.toFixed(2)}ms prepare=${route.prepareMs.toFixed(2)}ms register=${route.registerMs.toFixed(2)}ms file=${route.filePath}`,
        );
      }
    }
  }
};

export const fastifyFileRouter = fp<FastifyFileRouterOptions>(fastifyFileRouterPlugin, {
  // replaced with the package name during build
  name: 'fastify-file-router',
  fastify: '5.x',
});
