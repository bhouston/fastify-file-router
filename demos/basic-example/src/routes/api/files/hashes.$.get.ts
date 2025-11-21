import type { FastifyReply, FastifyRequest } from 'fastify';
import type { RouteSchema } from 'fastify-file-router';
import type { FromSchema } from 'json-schema-to-ts';

// GET /api/files/hashes/*

const ParamsSchema = {
  type: 'object',
  properties: {
    '*': { type: 'string' },
  },
  required: ['*'],
} as const;

type ParamsSchema = FromSchema<typeof ParamsSchema>;

export const schema: RouteSchema = {
  params: ParamsSchema,
};

export default async function handler(request: FastifyRequest, reply: FastifyReply) {
  const params = request.params as ParamsSchema;
  reply.status(200).send({ message: `Wildcard value is ${params['*']}` });
}
