import { defineRouteZod } from 'fastify-file-router';
import { z } from 'zod';

// POST /api/products/:id
// Example: Mixing Zod for params and JSON Schema for body

export const route = defineRouteZod({
  schema: {
    // Use Zod for complex validation (UUID format)
    params: z.object({
      id: z.string().uuid('ID must be a valid UUID'),
    }),
    // Use JSON Schema for simple body validation
    body: {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 1 },
        price: { type: 'number', minimum: 0 },
        description: { type: 'string' },
      },
      required: ['name', 'price'],
    } as const,
  },
  handler: async (request, reply) => {
    // Types are correctly inferred from both schema types!
    // request.params.id is typed as string (from Zod)
    // request.body.name, price, description are typed correctly (from JSON Schema)
    const { id } = request.params;
    const { name, price, description } = request.body;

    reply.status(201).send({
      id,
      name,
      price,
      description: description ?? 'No description',
      createdAt: new Date().toISOString(),
    });
  },
});
