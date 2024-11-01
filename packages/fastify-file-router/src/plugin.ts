import type { Stats } from 'node:fs';
import path from 'node:path';

import type { FastifyInstance, HTTPMethods, LogLevel } from 'fastify';
import fp from 'fastify-plugin';
import fs from 'fs/promises';

import type {
  FastifyFileRouterOptions,
  FileRouteConvention
} from './FastifyFileRouterOptions.js';
import type { RouteModule } from './types.js';

const validMethods = ['delete', 'get', 'head', 'patch', 'post', 'put'];
const methodRegex = new RegExp(`^(${validMethods.join('|')})(\\..+)?$`);
const segmentRegex = /^[$[]?.*[\]]?$/;

const toHttpMethod = (method: string, fullPath: string): HTTPMethods => {
  // Validate method
  if (method && !methodRegex.test(method)) {
    throw new Error(`Invalid method "${method}" in file ${fullPath}`);
  }
  return method as HTTPMethods;
};

const toRouteRemixStyle = (segments: string[], fullPath: string): string => {
  // ensure that only valid characters or a remix parameter are present
  const remixSegment = /^\$?[^[\]$&]*$/;
  // regex that matches a leading $ and captures the rest as the named capture group "param", regardless of what character it is
  const remixParamRegex = /^\$(?<param>.*)$/;

  return segments
    .map((segment) => {
      // Validate remaining segments
      if (!remixSegment.test(segment)) {
        throw new Error(`Invalid segment "${segment}" in file ${fullPath}`);
      }

      const matchResult = segment.match(remixParamRegex);
      if (matchResult && matchResult.groups) {
        const param = matchResult.groups['param'];
        if (param && param.length > 0) {
          return `:${param}`;
        } else {
          return '*';
        }
      }
      return segment;
    })
    .join('/');
};

const toRouteNextStyle = (segments: string[], fullPath: string): string => {
  // ensures that only valid characters or a next.js parameter are present
  const nextSegment = /^[[]?(\.\.\.|[^[\]&]*)[\]]?$/;
  // regex that matches both a leading [ and trailing ], capturing the rest as the named capture group "param", regardless of what character it is
  const nextParamRegex = /^\[(?<param>.*)\]$/;

  return segments
    .map((segment) => {
      // Validate remaining segments
      if (!nextSegment.test(segment)) {
        throw new Error(`Invalid segment "${segment}" in file ${fullPath}`);
      }

      const matchResult = segment.match(nextParamRegex);
      if (matchResult && matchResult.groups) {
        const param = matchResult.groups['param'];
        if (param && param.substring(0, 2) === '...') {
          return `*`;
        }
        if (param && param.length > 0) {
          return `:${param}`;
        } else {
          throw new Error(`Invalid segment "${segment}" in convention "next"`);
        }
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
  dir: string,
  baseRootDir: string
) {
  const files = await fs.readdir(dir);
  const baseSegments = dir.replace(baseRootDir, '').split('/').filter(Boolean);

  await Promise.all(
    files.map(async (file) => {
      const fullPath = path.join(dir, file);

      const stat = await fs.stat(fullPath);
      if (stat.isDirectory()) {
        await registerRoutes(
          fastify,
          mount,
          extensions,
          convention,
          logLevel,
          fullPath,
          baseRootDir
        );
        return;
      }

      const segments = file.split('.');
      if (segments.length < 2) {
        throw new Error(
          `Invalid file name "${file}" in file ${fullPath}, must have at least 2 segments separated by a dot`
        );
      }
      const fileExtension = `.${segments.pop()}`;
      if (!extensions.includes(fileExtension)) {
        throw new Error(
          `Invalid file extension "${fileExtension}" in file ${fullPath}, expected one of [${extensions.join(
            ','
          )}]`
        );
      }

      // get next to last segment as method
      const typedMethod = toHttpMethod(segments.pop()!, fullPath);

      let routePath;
      switch (convention) {
        case 'remix':
          routePath = toRouteRemixStyle(
            [...baseSegments, ...segments],
            fullPath
          );
          break;
        case 'next':
          routePath = toRouteNextStyle(
            [...baseSegments, ...segments],
            fullPath
          );
          break;
        default:
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
        `Registering route ${typedMethod.toUpperCase()} ${url} ${
          handlerModule.schema ? '(with schema)' : ''
        }`
      );
      fastify.route({
        method: typedMethod,
        url,
        schema: handlerModule.schema,
        handler: handlerModule.default
      });
    })
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
      logLevel = 'info'
    }: FastifyFileRouterOptions
  ) => {
    const cwd = process.env.REMIX_ROOT ?? process.cwd();

    extensions.map((extension) => {
      if (!extension.startsWith('.')) {
        throw new Error(
          `Invalid extension "${extension}", must start with a dot`
        );
      }
    });

    let numberOfValidRouteDirs = 0;
    await Promise.all(
      routesDirs.map(async (routesDir) => {
        const sourceRouteDir = path.join(buildRoot ?? '', routesDir);
        const absoluteSourceRoutesDir = path.resolve(cwd, sourceRouteDir);
        let stats: Stats;
        try {
          stats = await fs.lstat(absoluteSourceRoutesDir);
        } catch (_e) {
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
            absoluteSourceRoutesDir,
            absoluteSourceRoutesDir
          );
        }
      })
    );

    if (numberOfValidRouteDirs === 0) {
      throw new Error(
        `None of routesDirs, [${routesDirs.join(
          ', '
        )}], were valid directories.`
      );
    }
  },
  {
    // replaced with the package name during build
    name: 'fastify-file-router',
    fastify: '5.x'
  }
);
