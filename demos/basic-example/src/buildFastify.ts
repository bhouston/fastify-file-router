import path from 'node:path';
import ajvFormats from 'ajv-formats';
import responseValidation from '@fastify/response-validation';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
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

  // Register Swagger plugins for OpenAPI documentation
  await app.register(swagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'Fastify File Router API',
        version: '1.0.0',
        description: 'API documentation for Fastify File Router demo',
      },
      components: {
        securitySchemes: {
          jwtToken: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT token authentication',
          },
          secretToken: {
            type: 'apiKey',
            in: 'header',
            name: 'X-Secret-Token',
            description: 'Secret token authentication',
          },
        },
      },
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/documentation',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
  });

  // Register response validation plugin for JSON Schema response validation
  // Configure with ajv-formats to support date-time and other formats
  await app.register(responseValidation, {
    ajv: {
      plugins: [ajvFormats],
    },
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
    // biome-ignore lint/performance/useTopLevelRegex: just a demo
    exclude: [/^[.|_].*/, /\.(test|spec)\.[jt]s$/, /__(test|spec)__/, /\.d\.ts$/],
    mount: '/',
    zodResponseValidation: true,
  });

  return app;
}
