import type { FastifyReply, FastifyRequest } from 'fastify';

export default async function routeHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  reply.status(204).send();
}
