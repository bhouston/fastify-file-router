import type { Dirent } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import type Ajv from 'ajv';
import type { FastifyInstance, FastifyReply, FastifyRequest, FastifySchema, LogLevel } from 'fastify';
import type { z } from 'zod';
import { formatJsonSchemaError, formatZodError, type SchemaTypeIndicators } from './defineRouteZod.js';
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
  // Replace [.] with a placeholder that doesn't contain dots
  // Since [.] represents a literal dot in the route, we replace it before splitting
  const placeholder = '__LITERAL_DOT__';
  
  // Replace [.] with placeholder (no dots in placeholder to avoid splitting issues)
  const fileNameWithPlaceholder = fileName.replace(/\[\.\]/g, placeholder);
  
  // Split by dots - the placeholder will be part of a segment
  const segments = fileNameWithPlaceholder.split('.');

  // Check segment count first
  if (segments.length < 2) {
    throw new Error(
      `Invalid file name "${fileName}" in file ${fullPath}, must have at least 2 segments separated by a dot`,
    );
  }

  // Process segments: split segments that contain the placeholder and restore [.]
  const processedSegments: string[] = [];
  for (const seg of segments) {
    if (seg === placeholder) {
      // Standalone placeholder segment
      processedSegments.push('[.]');
    } else if (seg.includes(placeholder)) {
      // Segment contains placeholder - split it
      const parts = seg.split(placeholder);
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (part) {
          processedSegments.push(part);
        }
        // Add [.] between parts (but not after the last part)
        if (i < parts.length - 1) {
          processedSegments.push('[.]');
        }
      }
    } else if (seg) {
      // Regular segment (filter out empty strings)
      processedSegments.push(seg);
    }
  }

  const extensionSegment = `.${processedSegments[processedSegments.length - 1]}`;
  const methodSegment = processedSegments[processedSegments.length - 2];
  const routeSegments = processedSegments.slice(0, -2);

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
  zodResponseValidation: boolean = false,
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
          zodResponseValidation,
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

      // Check if this is a mixed schema route (has __zodSchemas or __schemaTypes property)
      const zodSchemas =
        schema && '__zodSchemas' in schema ? (schema as { __zodSchemas: unknown }).__zodSchemas : undefined;
      const schemaTypes =
        schema && '__schemaTypes' in schema ? (schema as { __schemaTypes: unknown }).__schemaTypes : undefined;

      // Check if we have any Zod schemas (if so, we need custom validation)
      const hasZodSchemas = zodSchemas && Object.keys(zodSchemas as Record<string, unknown>).length > 0;
      const hasSchemaTypes = schemaTypes && Object.keys(schemaTypes as Record<string, unknown>).length > 0;

      // Check if we have Zod response schemas specifically
      const zodResponseSchemas =
        zodSchemas && typeof zodSchemas === 'object' && 'response' in zodSchemas
          ? (zodSchemas as { response?: Record<string | number, z.ZodTypeAny> }).response
          : undefined;
      const hasZodResponseSchemas =
        zodResponseValidation && zodResponseSchemas && Object.keys(zodResponseSchemas).length > 0;

      // If we have schema types defined, we need to validate in preValidation for consistent error handling
      const needsCustomValidation = hasZodSchemas || hasSchemaTypes;

      // Always pass schema to Fastify for Swagger/OpenAPI documentation generation.
      // Custom validation happens in preValidation hooks, so passing the schema doesn't interfere.
      // The schema contains JSON Schema (converted from Zod schemas) which Swagger needs for documentation.

      // Create a clean schema object without our internal metadata for Fastify
      // We need to explicitly construct the schema to ensure all properties are present
      const fastifySchema = schema
        ? (() => {
            const cleanSchema: FastifySchema = {};
            if (schema.params) cleanSchema.params = schema.params;
            if (schema.querystring) cleanSchema.querystring = schema.querystring;
            if (schema.body) cleanSchema.body = schema.body;
            if (schema.headers) cleanSchema.headers = schema.headers;
            if (schema.response) cleanSchema.response = schema.response;
            // Copy other properties (description, tags, etc.) but exclude internal metadata
            for (const [key, value] of Object.entries(schema)) {
              if (
                !['params', 'querystring', 'body', 'headers', 'response', '__zodSchemas', '__schemaTypes'].includes(key)
              ) {
                (cleanSchema as Record<string, unknown>)[key] = value;
              }
            }
            return cleanSchema;
          })()
        : undefined;

      // Set up route options - if we have custom validation, disable Fastify's validators
      // BEFORE setting the schema, so Fastify uses our no-op validators
      const routeOptions: Parameters<typeof fastify.route>[0] = {
        method: typedMethod,
        url,
        schema: fastifySchema, // Always pass schema for Swagger/OpenAPI documentation
        handler,
        // Set validatorCompiler and serializerCompiler BEFORE adding preValidation hook
        // to ensure Fastify uses our no-op validators instead of default ones
        ...(needsCustomValidation
          ? {
              // Disable Fastify's validator when we have custom request validation to avoid
              // double validation and conflicts between Zod validation and JSON Schema validation.
              // Swagger will still process the schema for documentation even with no-op validators.
              // The validatorCompiler signature: ({ schema, method, url, httpPart }) => (data) => result
              // Returns a function that always returns true (validation passes)
              // Match the exact signature from Fastify tests to ensure compatibility
              validatorCompiler:
                // biome-ignore lint/correctness/noUnusedFunctionParameters lint/nursery/noShadow: Parameters must match Fastify's signature
                ({ schema, method, url, httpPart }) => {
                  return () => true; // Always pass validation - we handle it in preValidation hook
                },
              // Only disable serializerCompiler if we have Zod response schemas and validation is enabled
              // Otherwise, let Fastify handle JSON Schema response validation
              ...(hasZodResponseSchemas
                ? {
                    // Disable serialization validation for Zod response schemas - we handle it in preSerialization hook
                    // We use JSON.stringify to bypass fast-json-stringify's schema filtering
                    serializerCompiler:
                      // biome-ignore lint/correctness/noUnusedFunctionParameters lint/nursery/noShadow: Parameters must match Fastify's signature
                        ({ schema, method, url, httpStatus, contentType }) =>
                        (data) =>
                          JSON.stringify(data),
                  }
                : {}),
            }
          : {}),
      };

      // Add preValidation hook for routes with Zod schemas or mixed schemas
      if (needsCustomValidation) {
        // Create Ajv instance for JSON Schema validation
        // We use dynamic import to avoid requiring ajv if not using mixed schemas
        let AjvClass: typeof Ajv | undefined;
        try {
          const ajvModule = await import('ajv');
          AjvClass = ajvModule.default;
        } catch {
          // Ajv not available - this should not happen if peer dependency is installed
          // but we handle it gracefully by skipping JSON Schema validation in preValidation
          AjvClass = undefined;
        }

        // Enable type coercion for querystring (HTTP querystring params are always strings)
        const ajvInstance = AjvClass
          ? new AjvClass({ allErrors: true, coerceTypes: true, useDefaults: true })
          : undefined;

        routeOptions.preValidation = async (request, reply) => {
          type ZodTypeAny = z.ZodTypeAny;
          const zodSchema = (zodSchemas || {}) as {
            params?: ZodTypeAny;
            querystring?: ZodTypeAny;
            body?: ZodTypeAny;
            headers?: ZodTypeAny;
          };
          const types = (schemaTypes || {}) as SchemaTypeIndicators;

          // Validate params
          if (types.params === 'zod' && zodSchema.params) {
            const paramsResult = zodSchema.params.safeParse(request.params);
            if (!paramsResult.success) {
              return reply.status(400).send({
                error: formatZodError(paramsResult.error, 'params'),
              });
            }
            // Replace request.params with validated data
            (request as { params: unknown }).params = paramsResult.data;
          } else if (types.params === 'json' && schema?.params && ajvInstance) {
            const validate = ajvInstance.compile(schema.params);
            if (!validate(request.params)) {
              return reply.status(400).send({
                error: formatJsonSchemaError(validate.errors || [], 'params'),
              });
            }
          }

          // Validate querystring (Fastify uses request.query, not request.querystring)
          if (types.querystring === 'zod' && zodSchema.querystring) {
            const querystringResult = zodSchema.querystring.safeParse(request.query);
            if (!querystringResult.success) {
              return reply.status(400).send({
                error: formatZodError(querystringResult.error, 'querystring'),
              });
            }
            // Replace request.query with validated data
            (request as { query: unknown }).query = querystringResult.data;
          } else if (types.querystring === 'json' && schema?.querystring && ajvInstance) {
            // Coerce querystring values (HTTP querystring params are always strings)
            // Convert 'true'/'false' strings to booleans, numbers to numbers, etc.
            const queryObj = request.query as Record<string, unknown>;
            const coercedQuery: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(queryObj || {})) {
              if (typeof value === 'string') {
                // Try to coerce boolean strings
                if (value === 'true') {
                  coercedQuery[key] = true;
                } else if (value === 'false') {
                  coercedQuery[key] = false;
                } else {
                  // Try to coerce to number
                  const numValue = Number(value);
                  if (!Number.isNaN(numValue) && value.trim() !== '' && !value.includes('.')) {
                    coercedQuery[key] = numValue;
                  } else {
                    coercedQuery[key] = value;
                  }
                }
              } else {
                coercedQuery[key] = value;
              }
            }
            const validate = ajvInstance.compile(schema.querystring);
            // Validate the coerced query object
            if (!validate(coercedQuery)) {
              return reply.status(400).send({
                error: formatJsonSchemaError(validate.errors || [], 'querystring'),
              });
            }
            // Update request.query with coerced values (Ajv may have further modified them)
            (request as { query: unknown }).query = coercedQuery;
          }

          // Validate body
          if (types.body === 'zod' && zodSchema.body) {
            const bodyResult = zodSchema.body.safeParse(request.body);
            if (!bodyResult.success) {
              return reply.status(400).send({
                error: formatZodError(bodyResult.error, 'body'),
              });
            }
            // Replace request.body with validated data
            (request as { body: unknown }).body = bodyResult.data;
          } else if (types.body === 'json' && schema?.body && ajvInstance) {
            const validate = ajvInstance.compile(schema.body);
            if (!validate(request.body)) {
              return reply.status(400).send({
                error: formatJsonSchemaError(validate.errors || [], 'body'),
              });
            }
          }

          // Validate headers
          if (types.headers === 'zod' && zodSchema.headers) {
            const headersResult = zodSchema.headers.safeParse(request.headers);
            if (!headersResult.success) {
              return reply.status(400).send({
                error: formatZodError(headersResult.error, 'headers'),
              });
            }
            // Replace request.headers with validated data
            (request as { headers: unknown }).headers = headersResult.data;
          } else if (types.headers === 'json' && schema?.headers && ajvInstance) {
            const validate = ajvInstance.compile(schema.headers);
            if (!validate(request.headers)) {
              return reply.status(400).send({
                error: formatJsonSchemaError(validate.errors || [], 'headers'),
              });
            }
          }
        };
      }

      // Add preSerialization hook for Zod response schemas when validation is enabled
      if (hasZodResponseSchemas && zodResponseSchemas) {
        const zodValidationHook = async (
          // biome-ignore lint/correctness/noUnusedFunctionParameters: Parameters must match Fastify's signature
          request: FastifyRequest,
          reply: FastifyReply,
          payload: unknown,
        ) => {
          const statusCode = reply.statusCode;
          const zodResponseSchema = zodResponseSchemas[statusCode];

          // If we have a Zod schema for this status code, validate the payload
          if (zodResponseSchema) {
            const result = zodResponseSchema.safeParse(payload);
            if (!result.success) {
              // Response validation failure is a server error (500)
              // We need to change the status code and payload before serialization
              fastify.log.error(
                {
                  statusCode,
                  validationError: result.error,
                  payload,
                },
                'Response validation failed',
              );
              // Set status code and replace payload with error
              reply.code(500);
              return {
                error: 'Internal Server Error',
                message: 'Response validation failed',
                details: formatZodError(result.error, 'response'),
              };
            }
            // Return validated data (Zod may have transformed it)
            return result.data;
          }

          // No Zod schema for this status code, return payload as-is
          // (JSON Schema validation will be handled by Fastify's serializerCompiler if enabled)
          return payload;
        };

        // Handle case where preSerialization might already be set (e.g., by @fastify/response-validation)
        // Always use array format to be compatible with plugins that expect arrays
        // Note: @fastify/response-validation registers hooks via onRoute, which runs after route registration
        // So we set up our hook here, and it will be merged with plugin hooks
        if (Array.isArray(routeOptions.preSerialization)) {
          // Append our hook (plugin hooks will be added via onRoute)
          routeOptions.preSerialization.push(zodValidationHook);
        } else if (routeOptions.preSerialization) {
          // If it's already a function, convert to array
          routeOptions.preSerialization = [routeOptions.preSerialization, zodValidationHook];
        } else {
          // Set as array to be compatible with @fastify/response-validation plugin
          routeOptions.preSerialization = [zodValidationHook];
        }
      }

      fastify.route(routeOptions);
    }),
  );
}
