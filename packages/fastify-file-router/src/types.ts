import type { FastifyRequest, FastifyReply } from "fastify";

// types.ts
export interface RouteHandler {
  (request: FastifyRequest, reply: FastifyReply): Promise<void>;
}

export interface RouteModule {
  default: RouteHandler;
  schema?: {
    querystring?: object;
    body?: object;
    params?: object;
    response?: object;
  };
}
