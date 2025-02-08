import type { FastifyReply, FastifyRequest } from 'fastify';
import type { RouteSchema } from 'fastify-file-router';
import type { FromSchema } from 'json-schema-to-ts';

// GET /api/files/$id

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

export default async function handler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const params = request.params as ParamsSchema;
  const { id } = params;
  reply.status(200).send({
    id,
    mimeType: 'application/octet-stream',
    name: 'example.txt',
    size: 1024
  });
}
