import type { FastifyReply, FastifyRequest, FastifySchema } from 'fastify';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

/**
 * Helper type to extract TypeScript types from JSON schemas in a RouteSchema
 * Returns unknown for properties that don't exist (matching Fastify's default behavior)
 */
type ExtractSchemaTypes<T extends FastifySchema> = {
  Params: 'params' extends keyof T ? (T['params'] extends JSONSchema ? FromSchema<T['params']> : unknown) : unknown;
  Body: 'body' extends keyof T ? (T['body'] extends JSONSchema ? FromSchema<T['body']> : unknown) : unknown;
  Querystring: 'querystring' extends keyof T
    ? T['querystring'] extends JSONSchema
      ? FromSchema<T['querystring']>
      : unknown
    : unknown;
  Headers: 'headers' extends keyof T ? (T['headers'] extends JSONSchema ? FromSchema<T['headers']> : unknown) : unknown;
};

/**
 * Route handler function type with inferred types from schema
 */
type TypedRouteHandler<T extends FastifySchema> = (
  request: FastifyRequest<ExtractSchemaTypes<T>>,
  reply: FastifyReply,
) => unknown; // may be sync or async

/**
 * Route module returned by defineRoute
 */
export interface DefinedRoute<T extends FastifySchema> {
  /** The Fastify schema passed to {@link defineRoute}, unchanged. */
  schema: T;
  /** The request handler, typed from the JSON Schemas in `schema`. */
  handler: TypedRouteHandler<T>;
}

/**
 * Helper to define a route with type inference for request parameters, body, querystring, and headers.
 * It returns the route unchanged at runtime; its value is the inferred handler types.
 *
 * @typeParam T - The Fastify schema; JSON Schemas declared `as const` are converted to TypeScript types.
 * @param route - The route's `schema` and `handler`.
 * @returns The same route object, to be exported as `route` from a route file.
 * @example
 * ```typescript
 * export const route = defineRoute({
 *   schema: {
 *     params: {
 *       type: 'object',
 *       properties: { id: { type: 'string' } },
 *       required: ['id']
 *     } as const
 *   },
 *   handler: async (request, reply) => {
 *     // request.params.id is correctly typed as string
 *     const { id } = request.params;
 *     reply.status(200).send({ id });
 *   }
 * });
 * ```
 */
export function defineRoute<T extends FastifySchema>(route: {
  schema: T;
  handler: TypedRouteHandler<T>;
}): DefinedRoute<T> {
  return route;
}
