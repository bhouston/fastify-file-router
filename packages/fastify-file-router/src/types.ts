import type { FastifyReply, FastifyRequest } from 'fastify';

// types.ts
export interface RouteHandler {
  (request: FastifyRequest, reply: FastifyReply): Promise<void>;
}

export type RouteSchema = {
  querystring?: object;
  body?: object;
  params?: object;
  response?: object;
};

export type TypedRouteSchema<
  Query = object,
  Body = object,
  Params = object,
  Headers = object
> = {
  querystring?: Query;
  body?: Body;
  params?: Params;
  response?: Headers;
};

export interface RouteModule {
  default: RouteHandler;
  schema?: RouteSchema;
}
