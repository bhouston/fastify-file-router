import { defineRoute } from 'fastify-file-router';
import type { OpenAPIFastifySchema } from '../../../types/OpenAPIFastifySchema.js';

// PUT /api/users/:id

const paramsSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
  },
  required: ['id'],
} as const;

const bodySchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    email: { type: 'string', format: 'email' },
  },
  required: ['name', 'email'],
} as const;

const response200Schema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    email: { type: 'string' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
  required: ['id', 'name', 'email', 'updatedAt'],
} as const;

const response404Schema = {
  type: 'object',
  properties: {
    error: { type: 'string' },
    message: { type: 'string' },
  },
  required: ['error', 'message'],
} as const;

export const route = defineRoute({
  schema: {
    description: 'Update a user by ID. Updates the user name and/or email.',
    summary: 'Update user',
    tags: ['users'],
    operationId: 'update-user',
    security: [{ jwtToken: [] }, { secretToken: [] }],
    params: paramsSchema,
    body: bodySchema,
    response: {
      200: response200Schema,
      404: response404Schema,
    },
  } satisfies OpenAPIFastifySchema,
  handler: async (request, reply) => {
    // request.params.id is automatically typed as string - no manual type assertion needed!
    // request.body.name and request.body.email are also correctly typed
    const { id } = request.params;
    const { name, email } = request.body;

    // In a real application, you would update the user in the database here
    // For this example, we'll simulate a user not found scenario
    if (id === 'not-found') {
      return reply.status(404).send({
        error: 'Not Found',
        message: `User with id ${id} does not exist`,
      });
    }

    // Simulate successful update
    reply.status(200).send({
      id,
      name,
      email,
      updatedAt: new Date().toISOString(),
    });
  },
});
