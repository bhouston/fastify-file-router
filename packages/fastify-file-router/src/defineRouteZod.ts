import type { FastifyReply, FastifyRequest, FastifySchema } from 'fastify';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { z } from 'zod';

/**
 * Type helper to check if a value is a Zod schema
 * Exported for use in routeRegistration.ts
 */
export function isZodSchema(value: unknown): value is z.ZodTypeAny {
  return typeof value === 'object' && value !== null && '_def' in value && 'safeParse' in value;
}

/**
 * Schema definition that accepts both Zod schemas and JSON Schema
 * This allows mixing validation approaches within a single route definition.
 */
export interface ZodRouteSchema {
  params?: z.ZodTypeAny | JSONSchema;
  querystring?: z.ZodTypeAny | JSONSchema;
  body?: z.ZodTypeAny | JSONSchema;
  headers?: z.ZodTypeAny | JSONSchema;
  response?: Record<string | number, z.ZodTypeAny | JSONSchema>;
  // Allow other FastifySchema properties like description, tags, etc.
  [key: string]: unknown;
}

/**
 * Schema type indicators to track which fields use Zod vs JSON Schema
 */
export interface SchemaTypeIndicators {
  params?: 'zod' | 'json';
  querystring?: 'zod' | 'json';
  body?: 'zod' | 'json';
  headers?: 'zod' | 'json';
  response?: Record<string | number, 'zod' | 'json'>;
}

/**
 * Helper type to extract TypeScript types from mixed Zod and JSON Schema schemas
 * Returns unknown for properties that don't exist (matching Fastify's default behavior)
 */
type ExtractZodSchemaTypes<T extends ZodRouteSchema> = {
  Params: T['params'] extends z.ZodTypeAny
    ? z.infer<T['params']>
    : T['params'] extends JSONSchema
      ? FromSchema<T['params']>
      : unknown;
  Body: T['body'] extends z.ZodTypeAny
    ? z.infer<T['body']>
    : T['body'] extends JSONSchema
      ? FromSchema<T['body']>
      : unknown;
  Querystring: T['querystring'] extends z.ZodTypeAny
    ? z.infer<T['querystring']>
    : T['querystring'] extends JSONSchema
      ? FromSchema<T['querystring']>
      : unknown;
  Headers: T['headers'] extends z.ZodTypeAny
    ? z.infer<T['headers']>
    : T['headers'] extends JSONSchema
      ? FromSchema<T['headers']>
      : unknown;
  Response: T['response'] extends Record<string | number, z.ZodTypeAny | JSONSchema>
    ? {
        [K in keyof T['response']]: T['response'][K] extends z.ZodTypeAny
          ? z.infer<T['response'][K]>
          : T['response'][K] extends JSONSchema
            ? FromSchema<T['response'][K]>
            : never;
      }
    : unknown;
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
  schema: FastifySchema & {
    __zodSchemas?: Partial<{
      params?: z.ZodTypeAny;
      querystring?: z.ZodTypeAny;
      body?: z.ZodTypeAny;
      headers?: z.ZodTypeAny;
      response?: Record<string | number, z.ZodTypeAny>;
    }>;
    __schemaTypes?: SchemaTypeIndicators;
  };
  handler: TypedZodRouteHandler<T>;
}

/**
 * Converts a Zod schema to JSON Schema, removing the $schema property
 */
function zodToJsonSchema(schema: z.ZodTypeAny): Record<string, unknown> {
  const jsonSchema = z.toJSONSchema(schema, {
    target: 'draft-2020-12',
    unrepresentable: 'any',
    override: (ctx) => {
      // Guard against undefined zodSchema._zod (can happen with certain nested optional structures in zod v4)
      if (ctx.zodSchema?._zod?.def) {
        const def = ctx.zodSchema._zod.def;
        if (def.type === 'date') {
          ctx.jsonSchema.type = 'string';
          ctx.jsonSchema.format = 'date-time';
        }
      }
    },
  });
  delete jsonSchema.$schema;
  return jsonSchema as Record<string, unknown>;
}

/**
 * Formats Zod validation errors into a single error message string.
 * Format: "Bad Request: [component] - [comma-separated list of issues]"
 * This function is exported so it can be used in routeRegistration.ts
 */
export function formatZodError(error: z.ZodError, component: string): string {
  const issueMessages = error.issues.map((issue) => {
    const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
    return `${path}${issue.message}`;
  });
  return `Bad Request: ${component} - ${issueMessages.join(', ')}`;
}

/**
 * Formats JSON Schema validation errors into a single error message string.
 * Format: "Bad Request: [component] - [comma-separated list of issues]"
 * This function is exported so it can be used in routeRegistration.ts
 */
export function formatJsonSchemaError(
  errors: Array<{ instancePath: string; message?: string }>,
  component: string,
): string {
  const issueMessages = errors.map((error) => {
    const path = error.instancePath ? `${error.instancePath.substring(1)}: ` : '';
    const message = error.message || 'validation failed';
    return `${path}${message}`;
  });
  return `Bad Request: ${component} - ${issueMessages.join(', ')}`;
}

/**
 * Helper to define a route using Zod schemas and/or JSON Schema.
 * This function extracts TypeScript types from Zod schemas using `z.infer`
 * and from JSON Schema using `FromSchema`, allowing you to mix validation approaches.
 *
 * @example
 * ```typescript
 * import { defineRouteZod } from 'fastify-file-router';
 * import { z } from 'zod';
 *
 * // Pure Zod example
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
 *
 * @example
 * ```typescript
 * // Mixed Zod and JSON Schema example
 * export const route = defineRouteZod({
 *   schema: {
 *     params: z.object({ id: z.string() }), // Zod schema
 *     body: {
 *       type: 'object',
 *       properties: { name: { type: 'string' } },
 *       required: ['name']
 *     } as const // JSON Schema
 *   },
 *   handler: async (request, reply) => {
 *     // Types are correctly inferred from both schema types
 *     const { id } = request.params; // string (from Zod)
 *     const { name } = request.body; // string (from JSON Schema)
 *     reply.status(200).send({ id, name });
 *   }
 * });
 * ```
 */
export function defineRouteZod<T extends ZodRouteSchema>(route: {
  schema: T;
  handler: TypedZodRouteHandler<T>;
}): DefinedZodRoute<T> {
  const inputSchema = route.schema;
  const fastifySchema: FastifySchema = {};
  const zodSchemas: Partial<{
    params?: z.ZodTypeAny;
    querystring?: z.ZodTypeAny;
    body?: z.ZodTypeAny;
    headers?: z.ZodTypeAny;
    response?: Record<string | number, z.ZodTypeAny>;
  }> = {};
  const schemaTypes: SchemaTypeIndicators = {};

  // Process params
  if (inputSchema.params) {
    if (isZodSchema(inputSchema.params)) {
      fastifySchema.params = zodToJsonSchema(inputSchema.params);
      zodSchemas.params = inputSchema.params;
      schemaTypes.params = 'zod';
    } else {
      fastifySchema.params = inputSchema.params as JSONSchema;
      schemaTypes.params = 'json';
    }
  }

  // Process querystring
  if (inputSchema.querystring) {
    if (isZodSchema(inputSchema.querystring)) {
      fastifySchema.querystring = zodToJsonSchema(inputSchema.querystring);
      zodSchemas.querystring = inputSchema.querystring;
      schemaTypes.querystring = 'zod';
    } else {
      fastifySchema.querystring = inputSchema.querystring as JSONSchema;
      schemaTypes.querystring = 'json';
    }
  }

  // Process body
  if (inputSchema.body) {
    if (isZodSchema(inputSchema.body)) {
      fastifySchema.body = zodToJsonSchema(inputSchema.body);
      zodSchemas.body = inputSchema.body;
      schemaTypes.body = 'zod';
    } else {
      fastifySchema.body = inputSchema.body as JSONSchema;
      schemaTypes.body = 'json';
    }
  }

  // Process headers
  if (inputSchema.headers) {
    if (isZodSchema(inputSchema.headers)) {
      fastifySchema.headers = zodToJsonSchema(inputSchema.headers);
      zodSchemas.headers = inputSchema.headers;
      schemaTypes.headers = 'zod';
    } else {
      fastifySchema.headers = inputSchema.headers as JSONSchema;
      schemaTypes.headers = 'json';
    }
  }

  // Process response schemas (can mix Zod and JSON Schema)
  if (inputSchema.response) {
    const responseSchemas: Record<string, Record<string, unknown>> = {};
    const zodResponseSchemas: Record<string | number, z.ZodTypeAny> = {};
    const responseSchemaTypes: Record<string | number, 'zod' | 'json'> = {};

    for (const [statusCode, responseSchema] of Object.entries(inputSchema.response)) {
      if (isZodSchema(responseSchema)) {
        responseSchemas[String(statusCode)] = zodToJsonSchema(responseSchema);
        zodResponseSchemas[statusCode] = responseSchema;
        responseSchemaTypes[statusCode] = 'zod';
      } else {
        responseSchemas[String(statusCode)] = responseSchema as Record<string, unknown>;
        responseSchemaTypes[statusCode] = 'json';
      }
    }

    fastifySchema.response = responseSchemas;
    if (Object.keys(zodResponseSchemas).length > 0) {
      zodSchemas.response = zodResponseSchemas;
    }
    schemaTypes.response = responseSchemaTypes;
  }

  // Copy any other properties (like description, tags, etc. for OpenAPI)
  for (const [key, value] of Object.entries(inputSchema)) {
    if (!['params', 'querystring', 'body', 'headers', 'response'].includes(key)) {
      (fastifySchema as Record<string, unknown>)[key] = value;
    }
  }

  // Store Zod schemas and schema type indicators on the schema object
  const schemaWithMetadata = fastifySchema as FastifySchema & {
    __zodSchemas?: typeof zodSchemas;
    __schemaTypes?: SchemaTypeIndicators;
  };

  if (Object.keys(zodSchemas).length > 0) {
    schemaWithMetadata.__zodSchemas = zodSchemas;
  }
  schemaWithMetadata.__schemaTypes = schemaTypes;

  return {
    schema: schemaWithMetadata,
    handler: route.handler, // Don't wrap here, we'll use preValidation hook instead
  };
}
