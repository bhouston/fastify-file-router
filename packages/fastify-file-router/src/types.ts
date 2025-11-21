import type { FastifyReply, FastifyRequest, FastifySchema } from 'fastify';

// types.ts
export type RouteHandler = (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

export type RouteSchema = FastifySchema;

export type TypedRouteSchema<Query = object, Body = object, Params = object, Headers = object> = {
  querystring?: Query;
  body?: Body;
  params?: Params;
  response?: Headers;
};

export interface RouteModule {
  default: RouteHandler;
  schema?: RouteSchema;
}
