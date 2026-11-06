import { defineRouteZod } from 'fastify-file-router';
import { z } from 'zod';

const params = z.strictObject({
  orgName: z.string().min(1),
  projectName: z.string().min(1),
  assetName: z.string().min(1),
  version: z.string().optional(),
});

export const route = defineRouteZod({
  schema: {
    operationId: 'get-media-metadata',
    summary: 'Demonstrate an optional version suffix and a compound extension',
    params,
    querystring: z.object({ width: z.coerce.number().positive().optional() }),
    response: { 200: params.extend({ width: z.number().optional() }) },
  },
  handler: async (request) => ({ ...request.params, ...request.query }),
});
