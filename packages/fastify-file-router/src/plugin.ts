import path from 'node:path';

import type { LogLevel } from 'fastify';
import fp from 'fastify-plugin';
import fs from 'fs/promises';

import type { RouteModule } from './types.js';

export type FastifyFileRouterOptions = {
  /**
   * The base path for the routes.
   * @default "/"
   */
  apiBase?: string;
  /**
   * The directory where the routes are located.
   * @default "./routes"
   */
  routesDir?: string;
  /**
   * The file extension for the route files.
   * @default ".js"
   */
  routeFileExtension?: string;
  /**
   * Verbosity level for the plugin.
   */
  logLevel?: LogLevel;
};

const validMethods = ['delete', 'get', 'head', 'patch', 'post', 'put'];
const methodRegex = new RegExp(`^(${validMethods.join('|')})(\\..+)?$`);
const segmentRegex = /^[a-zA-Z0-9$]+$/;

export const fastifyFileRouter = fp<FastifyFileRouterOptions>(
  async (
    fastify,
    {
      apiBase = '/',
      routesDir = './src/routes',
      routeFileExtension = '.js',
      logLevel = 'info'
    }: FastifyFileRouterOptions
  ) => {
    const cwd = process.env.REMIX_ROOT ?? process.cwd();

    const routesDirPath = path.resolve(cwd, routesDir);
    if (!(await fs.lstat(routesDirPath)).isDirectory()) {
      throw new Error(`Route directory ${routesDir} does not exist.`);
    }

    async function registerRoutes(dir: string) {
      const files = await fs.readdir(dir);

      const baseSegments = dir
        .replace(routesDirPath, '')
        .split('/')
        .filter(Boolean);
      await Promise.all(
        files.map(async (file) => {
          const fullPath = path.join(dir, file);

          const stat = await fs.stat(fullPath);
          if (stat.isDirectory()) {
            await registerRoutes(fullPath);
            return;
          }

          const segments = file.split('.');
          if (segments.length < 2) {
            throw new Error(
              `Invalid file name "${file}" in file ${fullPath}, must have at least 2 segments separated by a dot`
            );
          }
          const fileExtension = segments.pop();
          if (fileExtension !== routeFileExtension.slice(1)) {
            throw new Error(
              `Invalid file extension "${fileExtension}" in file ${fullPath}, expected "${routeFileExtension}"`
            );
          }

          // get next to last segement as method
          const methodSegment = segments.pop();

          // Validate method
          if (methodSegment && !methodRegex.test(methodSegment)) {
            throw new Error(
              `Invalid method "${methodSegment}" in file ${fullPath}`
            );
          }
          const typedMethod = methodSegment as
            | 'delete'
            | 'get'
            | 'head'
            | 'patch'
            | 'post'
            | 'put';

          //

          // Validate remaining segments
          for (const segment of [...baseSegments, ...segments]) {
            if (!segmentRegex.test(segment)) {
              throw new Error(
                `Invalid segment "${segment}" in file ${fullPath}`
              );
            }
          }
          const routePath = [...baseSegments, ...segments]
            .map((segment) =>
              segment.startsWith('$') ? `:${segment.slice(1)}` : segment
            )
            .join('/');
          const handlerModule = (await import(fullPath)) as RouteModule;
          let url = routePath;
          // add apiBase if present
          if (apiBase !== '/') {
            url = `${apiBase}/${url}`;
          }
          // add preceeding '/' if missing
          if (!url.startsWith('/')) {
            url = `/${url}`;
          }
          // Validate handler exports
          if (typeof handlerModule.default !== 'function') {
            throw new Error(
              `Default export in file ${fullPath} is not a function`
            );
          }
          if (
            handlerModule.schema &&
            typeof handlerModule.schema !== 'object'
          ) {
            throw new Error(
              `Schema export in file ${fullPath} is not an object`
            );
          }
          fastify.log[logLevel](
            `Registering route ${typedMethod.toUpperCase()} ${url} ${
              handlerModule.schema ? '(with schema)' : ''
            }`
          );
          if (handlerModule.schema) {
            fastify[typedMethod](
              url,
              { schema: handlerModule.schema },
              handlerModule.default
            );
          } else {
            fastify[typedMethod](url, handlerModule.default);
          }
        })
      );
    }

    await registerRoutes(routesDirPath);
  },
  {
    // replaced with the package name during build
    name: 'fastify-file-router',
    fastify: '5.x'
  }
);
