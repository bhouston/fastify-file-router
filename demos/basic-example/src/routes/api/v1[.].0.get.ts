import { defineRoute } from 'fastify-file-router';

export const route = defineRoute({
  schema: {},
  handler: async (request, reply) => {
    reply.status(200).send({
      version: '1.0',
      message: 'This route demonstrates literal dots in the path using [.] notation',
    });
  },
});
