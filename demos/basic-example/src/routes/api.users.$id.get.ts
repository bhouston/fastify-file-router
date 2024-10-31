import type { RouteHandler, RouteSchema } from 'fastify-file-router';
import type { FromSchema } from 'json-schema-to-ts';

// GET /api/users/$id

const ParamsSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' }
  },
  required: ['id']
} as const;

type ParamsSchema = FromSchema<typeof ParamsSchema>;

export const schema: RouteSchema = {
  params: ParamsSchema
};

const routeHandler: RouteHandler = async (request, reply) => {
  const { id } = request.params as ParamsSchema;
  console.log({ id });

  // send a response to the client
  reply.status(200).send({
    id,
    name: 'John Doe',
    email: 'john.doe@microsoft.com'
  });
};

export default routeHandler;
