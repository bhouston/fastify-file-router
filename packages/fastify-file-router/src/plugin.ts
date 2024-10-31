import type { Stats } from 'node:fs';
import path from 'node:path';

import type { HTTPMethods, LogLevel } from 'fastify';
import fp from 'fastify-plugin';
import fs from 'fs/promises';

import type { RouteModule } from './types.js';

export type FastifyFileRouterOptions = {
  /**
   * Where the routes should be mounted on the server.
   * @default "/"
   */
  mount: string;
  /**
   * The local directory where the routes are located relative to the build root folder.
   * @default ["./routes", "./src/routes"]
   */
  routesDirs: string[];
  /**
   * The root folder of the source code that should be loaded. If you are transpiling your source code,
   * you should set this to the build output directory, e.g. 'dist' or 'build'.
   * @default '.' (current working directory)
   */
  buildRoot: string;
  /**
   * The file extension for the route files.
   * @default [".js", ".ts", ".jsx", ".tsx"]
   */
  extensions: string[];
  /**
   * Verbosity level for the plugin.
   * @default "info"
   */
  logLevel: LogLevel;
};

const validMethods = ['delete', 'get', 'head', 'patch', 'post', 'put'];
const methodRegex = new RegExp(`^(${validMethods.join('|')})(\\..+)?$`);
const segmentRegex = /^[$[]?.*[\]]?$/;

export const fastifyFileRouter = fp<FastifyFileRouterOptions>(
  async (
    fastify,
    {
      mount = '/',
      routesDirs = ['./routes', './src/routes'],
      buildRoot = '.',
      extensions = ['.js', '.ts', '.jsx', '.tsx'],
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

    async function registerRoutes(dir: string, baseRootDir: string) {
      const files = await fs.readdir(dir);

      const baseSegments = dir
        .replace(baseRootDir, '')
        .split('/')
        .filter(Boolean);
      await Promise.all(
        files.map(async (file) => {
          const fullPath = path.join(dir, file);

          const stat = await fs.stat(fullPath);
          if (stat.isDirectory()) {
            await registerRoutes(fullPath, baseRootDir);
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
          const methodSegment = segments.pop();
          // Validate method
          if (methodSegment && !methodRegex.test(methodSegment)) {
            throw new Error(
              `Invalid method "${methodSegment}" in file ${fullPath}`
            );
          }
          const typedMethod = methodSegment as HTTPMethods;

          //

          // Validate remaining segments
          for (const segment of [...baseSegments, ...segments]) {
            if (!segmentRegex.test(segment)) {
              throw new Error(
                `Invalid segment "${segment}" in file ${fullPath}`
              );
            }
          }
          // regex that matches a leading $ and captures the rest as the named capture group "param", regardless of what character it is
          const remixParamRegex = /^\$(?<param>.*)$/;
          // regex that matches both a leading [ and trailing ], capturing the rest as the named capture group "param", regardless of what character it is
          const nextParamRegex = /^\[(?<param>.*)\]$/;

          const routePath = [...baseSegments, ...segments]
            .map((segment) => {
              const matchResult =
                segment.match(remixParamRegex) ?? segment.match(nextParamRegex);
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
          const handlerModule = (await import(fullPath)) as RouteModule;
          let url = routePath;
          // add apiBase if present
          if (mount !== '/') {
            url = `${mount}/${url}`;
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
          fastify.route({
            method: typedMethod,
            url,
            schema: handlerModule.schema,
            handler: handlerModule.default
          });
        })
      );
    }

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
