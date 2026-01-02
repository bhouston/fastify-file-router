import type { Dirent } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { FastifyInstance, FastifySchema, LogLevel } from 'fastify';
import type { z } from 'zod';
import { formatZodError } from './defineRouteZod.js';
import type { FileRouteConvention } from './FastifyFileRouterOptions.js';
import { toHttpMethod, toRouteNextStyle, toRouteRemixStyle } from './routeConverter.js';
import type { RouteHandler, RouteModule, RouteSchema } from './types.js';

/**
 * Parses a filename into its components: route segments, method, and extension.
 * @param fileName - The filename to parse
 * @param extensions - Valid file extensions
 * @param fullPath - The full path to the file (for error messages)
 * @returns Object with routeSegments, method, and extension, or null if invalid
 */
export function parseFileName(
  fileName: string,
  extensions: string[],
  fullPath: string,
): { routeSegments: string[]; method: string; extension: string } | null {
  const segments = fileName.split('.');

  // Check segment count first
  if (segments.length < 2) {
    throw new Error(
      `Invalid file name "${fileName}" in file ${fullPath}, must have at least 2 segments separated by a dot`,
    );
  }

  const extensionSegment = `.${segments[segments.length - 1]}`;
  const methodSegment = segments[segments.length - 2];
  const routeSegments = segments.slice(0, -2);

  if (!extensions.includes(extensionSegment)) {
    return null;
  }

  // get next to last segment as method
  if (!methodSegment) {
    throw new Error(`Invalid file name "${fileName}" in file ${fullPath}, method segment is missing`);
  }

  return {
    routeSegments,
    method: methodSegment,
    extension: extensionSegment,
  };
}

/**
 * Converts route segments to a route path based on the convention.
 * @param segments - Array of route segments
 * @param convention - The route convention to use ('remix' or 'next')
 * @param fullPath - The full path to the file (for error messages)
 * @returns The converted route path
 */
export function convertRoutePath(segments: string[], convention: FileRouteConvention, fullPath: string): string {
  if (convention === 'remix') {
    return toRouteRemixStyle(segments, fullPath);
  }
  if (convention === 'next') {
    return toRouteNextStyle(segments, fullPath);
  }
  throw new Error(`Invalid convention "${convention}"`);
}

/**
 * Builds the full URL path from route path and mount point.
 * @param routePath - The route path
 * @param mount - The mount point
 * @returns The full URL path
 */
export function buildUrl(routePath: string, mount: string): string {
  let url = routePath;
  // Remove leading slash from routePath to avoid double slashes
  if (url.startsWith('/')) {
    url = url.substring(1);
  }
  // add mount if present
  if (mount !== '/') {
    url = `${mount}/${url}`;
  }
  // add preceding '/' if missing
  if (!url.startsWith('/')) {
    url = `/${url}`;
  }
  return url;
}

/**
 * Checks if a file should be excluded based on exclude patterns.
 * @param fileName - The filename to check
 * @param excludePatterns - Array of regex patterns to match against
 * @returns The matching exclude pattern, or undefined if not excluded
 */
export function shouldExcludeFile(fileName: string, excludePatterns: RegExp[]): RegExp | undefined {
  for (const pattern of excludePatterns) {
    if (pattern.test(fileName)) {
      return pattern;
    }
  }
  return;
}

/**
 * Registers routes from a directory recursively.
 * @param fastify - The Fastify instance
 * @param mount - The mount point for routes
 * @param extensions - Valid file extensions
 * @param convention - The route convention to use
 * @param logLevel - The log level for messages
 * @param excludePatterns - Patterns for files to exclude
 * @param dir - The directory to scan
 * @param baseRootDir - The base root directory for calculating route paths
 */
export async function registerRoutes(
  fastify: FastifyInstance,
  mount: string,
  extensions: string[],
  convention: FileRouteConvention,
  logLevel: LogLevel,
  excludePatterns: RegExp[],
  dir: string,
  baseRootDir: string,
  logRoutes: boolean = false,
): Promise<void> {
  const dirents = await fs.readdir(dir, { withFileTypes: true });
  const baseSegments = dir.replace(baseRootDir, '').split('/').filter(Boolean);

  await Promise.all(
    dirents.map(async (dirent: Dirent) => {
      const fileName = dirent.name;
      // Check if file should be excluded
      const matchingExcludePattern = shouldExcludeFile(fileName, excludePatterns);
      if (matchingExcludePattern) {
        fastify.log[logLevel](
          `Ignoring ${fileName} as it matches the exclude pattern ${matchingExcludePattern.source}`,
        );
        return;
      }

      const fullPath = path.join(dir, fileName);

      if (dirent.isDirectory()) {
        await registerRoutes(
          fastify,
          mount,
          extensions,
          convention,
          logLevel,
          excludePatterns,
          fullPath,
          baseRootDir,
          logRoutes,
        );
        return;
      }

      // Parse filename
      const parsed = parseFileName(fileName, extensions, fullPath);
      if (!parsed) {
        fastify.log[logLevel](
          `Ignoring file ${fullPath} as its extension, ${`.${fileName.split('.').pop()}`}, isn't in the list of extensions.`,
        );
        return;
      }

      const { routeSegments, method } = parsed;
      const typedMethod = toHttpMethod(method, fullPath);

      // Convert route segments to route path
      const routePath = convertRoutePath([...baseSegments, ...routeSegments], convention, fullPath);

      // Import and register the route
      const handlerModule = (await import(fullPath)) as RouteModule;
      const url = buildUrl(routePath, mount);

      // Check if this is a defineRoute pattern (route export)
      let handler: RouteHandler;
      let schema: RouteSchema | undefined;

      if (handlerModule.route) {
        // New pattern: route defined using defineRoute()
        if (typeof handlerModule.route.handler !== 'function') {
          throw new Error(`Route handler in file ${fullPath} is not a function`);
        }
        if (handlerModule.route.schema && typeof handlerModule.route.schema !== 'object') {
          throw new Error(`Route schema in file ${fullPath} is not an object`);
        }
        handler = handlerModule.route.handler as RouteHandler;
        schema = handlerModule.route.schema;
      } else {
        // Legacy pattern: default export + optional schema export
        if (typeof handlerModule.default !== 'function') {
          throw new Error(`Default export in file ${fullPath} is not a function`);
        }
        if (handlerModule.schema && typeof handlerModule.schema !== 'object') {
          throw new Error(`Schema export in file ${fullPath} is not an object`);
        }
        handler = handlerModule.default;
        schema = handlerModule.schema;
      }

      // Check if logLevel is verbose (debug or trace)
      if (logRoutes) {
        fastify.log[logLevel](
          `Registering route ${typedMethod.toUpperCase()} ${url} ${schema ? '(with schema)' : ''} from ${fullPath}`,
        );
      }

      // Check if this is a Zod route (has __zodSchemas property)
      const zodSchemas =
        schema && '__zodSchemas' in schema ? (schema as { __zodSchemas: unknown }).__zodSchemas : undefined;

      const routeOptions: Parameters<typeof fastify.route>[0] = {
        method: typedMethod,
        url,
        schema: zodSchemas ? undefined : schema, // Don't pass schema to Fastify for Zod routes (Zod will validate)
        handler,
      };

      // Add preValidation hook for Zod routes
      if (zodSchemas) {
        routeOptions.preValidation = async (request, reply) => {
          type ZodTypeAny = z.ZodTypeAny;
          const zodSchema = zodSchemas as {
            params?: ZodTypeAny;
            querystring?: ZodTypeAny;
            body?: ZodTypeAny;
            headers?: ZodTypeAny;
          };

          // Validate params
          if (zodSchema.params) {
            const paramsResult = zodSchema.params.safeParse(request.params);
            if (!paramsResult.success) {
              return reply.status(400).send({
                error: formatZodError(paramsResult.error, 'params'),
              });
            }
            // Replace request.params with validated data
            (request as { params: unknown }).params = paramsResult.data;
          }

          // Validate querystring (Fastify uses request.query, not request.querystring)
          if (zodSchema.querystring) {
            const querystringResult = zodSchema.querystring.safeParse(request.query);
            if (!querystringResult.success) {
              return reply.status(400).send({
                error: formatZodError(querystringResult.error, 'querystring'),
              });
            }
            // Replace request.query with validated data
            (request as { query: unknown }).query = querystringResult.data;
          }

          // Validate body
          if (zodSchema.body) {
            const bodyResult = zodSchema.body.safeParse(request.body);
            if (!bodyResult.success) {
              return reply.status(400).send({
                error: formatZodError(bodyResult.error, 'body'),
              });
            }
            // Replace request.body with validated data
            (request as { body: unknown }).body = bodyResult.data;
          }

          // Validate headers
          if (zodSchema.headers) {
            const headersResult = zodSchema.headers.safeParse(request.headers);
            if (!headersResult.success) {
              return reply.status(400).send({
                error: formatZodError(headersResult.error, 'headers'),
              });
            }
            // Replace request.headers with validated data
            (request as { headers: unknown }).headers = headersResult.data;
          }
        };

        // disable default validation
        routeOptions.validatorCompiler = (_validationSchema) => (data) => data;
      }

      fastify.route(routeOptions);
    }),
  );
}
