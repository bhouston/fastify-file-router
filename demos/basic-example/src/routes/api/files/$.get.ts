import type { FastifyReply, FastifyRequest } from 'fastify';

export default async function routeHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const params = request.params as Record<string, string>;
  const wildcardParam = params['*'];
  reply.status(200).send({ message: `Wildcard value is ${wildcardParam}` });
}
