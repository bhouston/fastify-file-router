import { defineRoute } from 'fastify-file-router';

// GET /api/users/$id

export const route = defineRoute({
  schema: {
    params: {
      type: 'object',
      properties: {
        id: { type: 'string' },
      },
      required: ['id'],
    } as const,
  },
  handler: async (request, reply) => {
    // request.params.id is automatically typed as string - no manual type assertion needed!
    const { id } = request.params;
    console.log({ id });

    // send a response to the client
    reply.status(200).send({
      id,
      name: 'John Doe',
      email: 'john.doe@microsoft.com',
    });
  },
});
