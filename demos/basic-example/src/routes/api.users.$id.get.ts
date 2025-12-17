import type { FastifyReply, FastifyRequest } from 'fastify';
import type { RouteSchema } from 'fastify-file-router';
import type { FromSchema } from 'json-schema-to-ts';

// GET /api/users/$id

const ParamsSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
  },
  required: ['id'],
} as const;

type ParamsSchema = FromSchema<typeof ParamsSchema>;

export const schema: RouteSchema = {
  params: ParamsSchema,
};

export default async function handler(request: FastifyRequest<{ Params: ParamsSchema }>, reply: FastifyReply) {
  const { id } = request.params;
  console.log({ id });

  // send a response to the client
  reply.status(200).send({
    id,
    name: 'John Doe',
    email: 'john.doe@microsoft.com',
  });
}
