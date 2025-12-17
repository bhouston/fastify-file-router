import type { FastifyReply, FastifyRequest, FastifySchema } from 'fastify';
import type { DefinedRoute } from './defineRoute.js';

// types.ts
export type RouteHandler = (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

export type RouteSchema = FastifySchema;

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
