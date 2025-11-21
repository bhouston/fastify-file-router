import type { Stats } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { FastifyInstance, HTTPMethods, LogLevel } from 'fastify';
import fp from 'fastify-plugin';

import type { FastifyFileRouterOptions, FileRouteConvention } from './FastifyFileRouterOptions.js';
import type { RouteModule } from './types.js';

const validMethods = ['delete', 'get', 'head', 'patch', 'post', 'put'];
const methodRegex = new RegExp(`^(${validMethods.join('|')})(\\..+)?$`);
const _segmentRegex = /^[$[]?.*[\]]?$/;

// Regex patterns for route conversion
const remixSegment = /^\$?[^[\]$&]*$/;
const remixParamRegex = /^\$(?<param>.*)$/;
const nextSegment = /^[[]?(?:\.\.\.|[^[\]&]*)[\]]?$/;
const nextParamRegex = /^\[(?<param>.*)\]$/;

// Default exclude patterns
const defaultExcludePatterns = [/^[.|_].*/, /\.(?:test|spec)\.[jt]s$/, /__(?:test|spec)__/, /\.d\.ts$/];

const toHttpMethod = (method: string, fullPath: string): HTTPMethods => {
  // Validate method
  if (method && !methodRegex.test(method)) {
    throw new Error(`Invalid method "${method}" in file ${fullPath}`);
  }
  return method as HTTPMethods;
};

const toRouteRemixStyle = (segments: string[], fullPath: string): string => {
  // ensure that only valid characters or a remix parameter are present
  return segments
    .map((segment) => {
      // Validate remaining segments
      if (!remixSegment.test(segment)) {
        throw new Error(`Invalid segment "${segment}" in file ${fullPath}`);
      }

      const matchResult = segment.match(remixParamRegex);
      if (matchResult?.groups) {
        const param = matchResult.groups.param;
        if (param && param.length > 0) {
          return `:${param}`;
        }
        return '*';
      }
      return segment;
    })
    .join('/');
};

const toRouteNextStyle = (segments: string[], fullPath: string): string => {
  // ensures that only valid characters or a next.js parameter are present
  return segments
    .map((segment) => {
      // Validate remaining segments
      if (!nextSegment.test(segment)) {
        throw new Error(`Invalid segment "${segment}" in file ${fullPath}`);
      }

      const matchResult = segment.match(nextParamRegex);
      if (matchResult?.groups) {
        const param = matchResult.groups.param;
        if (param && param.substring(0, 2) === '...') {
          return `*`;
        }
        if (param && param.length > 0) {
          return `:${param}`;
        }
        throw new Error(`Invalid segment "${segment}" in convention "next"`);
      }
      return segment;
    })
    .join('/');
};

async function registerRoutes(
  fastify: FastifyInstance,
  mount: string,
  extensions: string[],
  convention: FileRouteConvention,
  logLevel: LogLevel,
  exclude: RegExp[],
  dir: string,
  baseRootDir: string,
) {
  const fileNames = await fs.readdir(dir);
  const baseSegments = dir.replace(baseRootDir, '').split('/').filter(Boolean);

  await Promise.all(
    fileNames.map(async (fileName) => {
      // compare against each excludePattern
      let matchingExcludePattern: undefined | RegExp;
      for (const pattern of exclude) {
        if (pattern.test(fileName)) {
          matchingExcludePattern = pattern;
          break;
        }
      }
      if (matchingExcludePattern) {
        fastify.log[logLevel](
          `Ignoring ${fileName} as it matches the exclude pattern ${matchingExcludePattern.source}`,
        );
        return;
      }

      const fullPath = path.join(dir, fileName);

      const stat = await fs.stat(fullPath);
      if (stat.isDirectory()) {
        await registerRoutes(fastify, mount, extensions, convention, logLevel, exclude, fullPath, baseRootDir);
        return;
      }

      const segments = fileName.split('.');
      const extensionSegment = `.${segments[segments.length - 1]}`;
      const methodSegment = segments[segments.length - 2];
      const routeSegments = segments.slice(0, -2);

      if (!extensions.includes(extensionSegment)) {
        fastify.log[logLevel](
          `Ignoring file ${fullPath} as its extension, ${extensionSegment}, isn't in the list of extensions.`,
        );
        return;
      }
      if (segments.length < 2) {
        throw new Error(
          `Invalid file name "${fileName}" in file ${fullPath}, must have at least 2 segments separated by a dot`,
        );
      }

      // get next to last segment as method
      if (!methodSegment) {
        throw new Error(`Invalid file name "${fileName}" in file ${fullPath}, method segment is missing`);
      }
      const typedMethod = toHttpMethod(methodSegment, fullPath);

      let routePath: string;
      if (convention === 'remix') {
        routePath = toRouteRemixStyle([...baseSegments, ...routeSegments], fullPath);
      } else if (convention === 'next') {
        routePath = toRouteNextStyle([...baseSegments, ...routeSegments], fullPath);
      } else {
        throw new Error(`Invalid convention "${convention}"`);
      }

      const handlerModule = (await import(fullPath)) as RouteModule;
      let url = routePath;
      // add mount if present
      if (mount !== '/') {
        url = `${mount}/${url}`;
      }
      // add preceding '/' if missing
      if (!url.startsWith('/')) {
        url = `/${url}`;
      }
      // Validate handler exports
      if (typeof handlerModule.default !== 'function') {
        throw new Error(`Default export in file ${fullPath} is not a function`);
      }
      if (handlerModule.schema && typeof handlerModule.schema !== 'object') {
        throw new Error(`Schema export in file ${fullPath} is not an object`);
      }
      fastify.log[logLevel](
        `Registering route ${typedMethod.toUpperCase()} ${url} ${handlerModule.schema ? '(with schema)' : ''}`,
      );
      fastify.route({
        method: typedMethod,
        url,
        schema: handlerModule.schema,
        handler: handlerModule.default,
      });
    }),
  );
}

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

    let numberOfValidRouteDirs = 0;
    await Promise.all(
      routesDirs.map(async (routesDir) => {
        const sourceRouteDir = path.join(buildRoot ?? '', routesDir);
        const absoluteSourceRoutesDir = path.resolve(cwd, sourceRouteDir);
        let stats: Stats;
        try {
          stats = await fs.lstat(absoluteSourceRoutesDir);
        } catch {
          return;
        }
        if (stats.isDirectory()) {
          numberOfValidRouteDirs++;
          await registerRoutes(
            fastify,
            mount,
            extensions,
            convention,
            logLevel,
            excludePatterns,
            absoluteSourceRoutesDir,
            absoluteSourceRoutesDir,
          );
        }
      }),
    );

    if (numberOfValidRouteDirs === 0) {
      throw new Error(`None of routesDirs, [${routesDirs.join(', ')}], were valid directories.`);
    }
  },
  {
    // replaced with the package name during build
    name: 'fastify-file-router',
    fastify: '5.x',
  },
);
