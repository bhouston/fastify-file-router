import type { FastifyReply, FastifyRequest, FastifySchema } from 'fastify';
import { z } from 'zod';

/**
 * Schema definition using Zod schemas instead of JSON Schema
 */
export interface ZodRouteSchema {
  params?: z.ZodTypeAny;
  querystring?: z.ZodTypeAny;
  body?: z.ZodTypeAny;
  headers?: z.ZodTypeAny;
  // Allow other FastifySchema properties like description, tags, etc.
  [key: string]: unknown;
}

/**
 * Helper type to extract TypeScript types from Zod schemas
 * Returns unknown for properties that don't exist (matching Fastify's default behavior)
 */
type ExtractZodSchemaTypes<T extends ZodRouteSchema> = {
  Params: T['params'] extends z.ZodTypeAny ? z.infer<T['params']> : unknown;
  Body: T['body'] extends z.ZodTypeAny ? z.infer<T['body']> : unknown;
  Querystring: T['querystring'] extends z.ZodTypeAny ? z.infer<T['querystring']> : unknown;
  Headers: T['headers'] extends z.ZodTypeAny ? z.infer<T['headers']> : unknown;
};

/**
 * Route handler function type with inferred types from Zod schemas
 */
type TypedZodRouteHandler<T extends ZodRouteSchema> = (
  request: FastifyRequest<ExtractZodSchemaTypes<T>>,
  reply: FastifyReply,
) => Promise<unknown> | unknown;

/**
 * Route module returned by defineRouteZod
 */
export interface DefinedZodRoute<T extends ZodRouteSchema> {
  schema: FastifySchema & { __zodSchemas?: T };
  handler: TypedZodRouteHandler<T>;
}

/**
 * Converts a Zod schema to JSON Schema, removing the $schema property
 */
function zodToJsonSchema(schema: z.ZodTypeAny): Record<string, unknown> {
  const jsonSchema = z.toJSONSchema(schema, {
    target: 'draft-2020-12',
    unrepresentable: 'any',
  });
  // Remove $schema property as Fastify doesn't need it
  const { $schema: _, ...rest } = jsonSchema;
  return rest;
}

/**
 * Formats Zod validation errors into a single error message string.
 * Format: "Bad Request: [component] - [comma-separated list of issues]"
 * This function is exported so it can be used in routeRegistration.ts
 */
export function formatZodError(error: z.ZodError, component: string): string {
  const issueMessages = error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join('.') + ': ' : '';
    return `${path}${issue.message}`;
  });
  return `Bad Request: ${component} - ${issueMessages.join(', ')}`;
}

/**
 * Helper to define a route using Zod schemas directly.
 * This function extracts TypeScript types from Zod schemas using `z.infer`
 * and converts Zod schemas to JSON Schema for Fastify's runtime validation.
 *
 * @example
 * ```typescript
 * import { defineRouteZod } from 'fastify-file-router';
 * import { z } from 'zod';
 *
 * export const route = defineRouteZod({
 *   schema: {
 *     params: z.object({
 *       id: z.string().min(1)
 *     }),
 *     body: z.object({
 *       name: z.string().optional(),
 *       email: z.string().email().optional()
 *     })
 *   },
 *   handler: async (request, reply) => {
 *     // request.params.id is correctly typed as string
 *     // request.body.name and request.body.email are correctly typed
 *     const { id } = request.params;
 *     const { name, email } = request.body;
 *     reply.status(200).send({ id, name, email });
 *   }
 * });
 * ```
 */
export function defineRouteZod<T extends ZodRouteSchema>(route: {
  schema: T;
  handler: TypedZodRouteHandler<T>;
}): DefinedZodRoute<T> {
  const zodSchema = route.schema;
  const fastifySchema: FastifySchema = {};

  // Convert Zod schemas to JSON Schema for Fastify
  if (zodSchema.params) {
    fastifySchema.params = zodToJsonSchema(zodSchema.params);
  }
  if (zodSchema.querystring) {
    fastifySchema.querystring = zodToJsonSchema(zodSchema.querystring);
  }
  if (zodSchema.body) {
    fastifySchema.body = zodToJsonSchema(zodSchema.body);
  }
  if (zodSchema.headers) {
    fastifySchema.headers = zodToJsonSchema(zodSchema.headers);
  }

  // Copy any other properties (like description, tags, etc. for OpenAPI)
  for (const [key, value] of Object.entries(zodSchema)) {
    if (!['params', 'querystring', 'body', 'headers'].includes(key)) {
      (fastifySchema as Record<string, unknown>)[key] = value;
    }
  }

  // Store Zod schemas on the schema object so routeRegistration can access them
  (fastifySchema as FastifySchema & { __zodSchemas: T }).__zodSchemas = zodSchema;

  return {
    schema: fastifySchema as FastifySchema & { __zodSchemas: T },
    handler: route.handler, // Don't wrap here, we'll use preValidation hook instead
  };
}
