import type { FastifyReply, FastifyRequest } from 'fastify';
import type { RouteSchema } from 'fastify-file-router';
import type { FromSchema } from 'json-schema-to-ts';

// GET /api/multi/$orgName/$projectName/$assetName/thumbnail

const ParamsSchema = {
  type: 'object',
  properties: {
    orgName: { type: 'string' },
    projectName: { type: 'string' },
    assetName: { type: 'string' },
  },
  required: ['orgName', 'projectName', 'assetName'],
} as const;

type ParamsSchema = FromSchema<typeof ParamsSchema>;

export const schema: RouteSchema = {
  params: ParamsSchema,
};

export default async function handler(request: FastifyRequest, reply: FastifyReply) {
  const params = request.params as ParamsSchema;
  reply.status(200).send({
    message: 'All parameters extracted successfully',
    orgName: params.orgName,
    projectName: params.projectName,
    assetName: params.assetName,
  });
}
