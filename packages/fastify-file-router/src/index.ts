/**
 * Register Fastify routes from filenames and directories, with typed request handlers.
 *
 * Register {@link fastifyFileRouter} on a Fastify 5 server, then export a route from each file using
 * {@link defineRoute} (JSON Schema) or {@link defineRouteZod} (Zod and JSON Schema).
 *
 * @packageDocumentation
 */
export * from './defineRoute.js';
export * from './defineRouteZod.js';
export * from './plugin.js';
export * from './types.js';
export type {
  FastifyFileRouterOptions,
  FastifyFileRouterProfileOptions,
  FileRouteConvention,
} from './FastifyFileRouterOptions.js';
