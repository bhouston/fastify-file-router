import type { FastifyReply, FastifyRequest, FastifySchema } from 'fastify';
import type { DefinedRoute } from './defineRoute.js';

/** Handler signature for the legacy default-export route pattern. */
export type RouteHandler = (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

/** Fastify schema for the legacy `schema` export. */
export type RouteSchema = FastifySchema;

/**
 * Generic shape of a schema typed by the types of its parts.
 *
 * @typeParam Query - Type of the query string.
 * @typeParam Body - Type of the body.
 * @typeParam Params - Type of the path parameters.
 * @typeParam Headers - Type used for the `response` field.
 */
export type TypedRouteSchema<Query = object, Body = object, Params = object, Headers = object> = {
  querystring?: Query;
  body?: Body;
  params?: Params;
  response?: Headers;
};

/**
 * Route module that supports both the legacy pattern (default + schema) and the new defineRoute pattern (route export)
 */
export interface RouteModule {
  /** Legacy pattern: default export handler */
  default?: RouteHandler;
  /** Legacy pattern: optional schema export */
  schema?: RouteSchema;
  /** New pattern: route defined using defineRoute() */
  route?: DefinedRoute<FastifySchema>;
}
