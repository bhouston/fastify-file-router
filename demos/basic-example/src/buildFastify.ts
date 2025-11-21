import fs from 'node:fs';
import path from 'node:path';
import Fastify, { type LogLevel } from 'fastify';
import { fastifyFileRouter } from 'fastify-file-router';

type GetAppOptions = {
  logRoutes?: boolean;
  logLevel?: LogLevel;
};

export async function getApp(options: GetAppOptions = {}) {
  const { logRoutes = false, logLevel = 'info' } = options;
  const app = Fastify({
    logger: { level: logLevel },
    trustProxy: true,
  });

  // get current directory on node.
  const currentDir = path.dirname(new URL(import.meta.url).pathname);
  const routesDir = path.join(currentDir, '../src/routes');
  const buildRoot = path.join(currentDir, '../src');
  const cwd = process.cwd();
  const relativeBuild = path.relative(cwd, buildRoot);
  const relativeRoutes = path.relative(buildRoot, routesDir);

  await app.register(fastifyFileRouter, {
    logLevel,
    logRoutes,
    routesDirs: [relativeRoutes],
    buildRoot: relativeBuild,
    extensions: ['.js', '.ts', '.jsx', '.tsx'],
    convention: 'remix',
    exclude: [/^[.|_].*/, /\.(test|spec)\.[jt]s$/, /__(test|spec)__/, /\.d\.ts$/],
    mount: '/',
  });

  return app;
}
