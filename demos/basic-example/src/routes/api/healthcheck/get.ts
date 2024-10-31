import type { RouteHandler } from 'fastify-file-router';

const routeHandler: RouteHandler = async (request, reply) => {
  reply.status(204).send();
};

export default routeHandler;
