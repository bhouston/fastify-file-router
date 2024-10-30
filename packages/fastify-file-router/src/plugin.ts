import path from 'node:path';

import type { LogLevel } from 'fastify';
import fp from 'fastify-plugin';
import fs from 'fs/promises';

import type { RouteModule } from './types';

export type FastifyFileRouterOptions = {
  /**
   * The base path for the routes.
   * @default "/"
   */
  basename?: string;
  /**
   * The directory where the routes are located.
   * @default "./routes"
   */
  routeDirectory?: string;
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
      basename = '/',
      routeDirectory = './src/routes',
      routeFileExtension = '.js',
      logLevel = 'info'
    }: FastifyFileRouterOptions
  ) => {
    const cwd = process.env.REMIX_ROOT ?? process.cwd();

    if (!(await fs.lstat(routeDirectory)).isDirectory()) {
      throw new Error(`Route directory ${routeDirectory} does not exist.`);
    }

    async function registerRoutes(dir: string, basePath = '') {
      const files = await fs.readdir(dir);
      await Promise.all(
        files.map(async (file) => {
          const fullPath = path.join(dir, file);
          const stat = await fs.stat(fullPath);
          if (stat.isDirectory()) {
            await registerRoutes(fullPath, `${basePath}/${file}`);
            return;
          }

          const [method, ...segments] = file.split('.');

          // Validate method
          if (method && !methodRegex.test(method)) {
            throw new Error(`Invalid method "${method}" in file ${fullPath}`);
          }
          const typedMethod = method as
            | 'delete'
            | 'get'
            | 'head'
            | 'patch'
            | 'post'
            | 'put';

          // Validate segments
          for (const segment of segments) {
            if (!segmentRegex.test(segment)) {
              throw new Error(
                `Invalid segment "${segment}" in file ${fullPath}`
              );
            }
          }
          const routePath = segments
            .map((segment) =>
              segment.startsWith('$') ? `:${segment.slice(1)}` : segment
            )
            .join('/');
          const handlerModule = (await import(fullPath)) as RouteModule;
          const url = `${basePath}/${routePath}`;
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
            `Registering route ${typedMethod.toUpperCase()} ${url}`
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

    await registerRoutes(routeDirectory);
  },
  {
    // replaced with the package name during build
    name: process.env.__PACKAGE_NAME__,
    fastify: process.env.__FASTIFY_VERSION__
  }
);
