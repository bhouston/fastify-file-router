import { defineRouteZod } from 'fastify-file-router';
import { z } from 'zod';

// POST /api/orders
// Example: Mixing JSON Schema for querystring and Zod for body

export const route = defineRouteZod({
  schema: {
    // Use JSON Schema for simple querystring validation
    // Note: For boolean querystring params, use string enum or let Fastify handle coercion
    querystring: {
      type: 'object',
      properties: {
        includeItems: { type: 'string', enum: ['true', 'false'] },
        currency: { type: 'string', enum: ['USD', 'EUR', 'GBP'] },
      },
    } as const,
    // Use Zod for complex body validation with custom messages
    body: z.object({
      items: z
        .array(
          z.object({
            productId: z.string().uuid('Product ID must be a valid UUID'),
            quantity: z.number().int().positive('Quantity must be a positive integer'),
            price: z.number().positive('Price must be positive'),
          }),
        )
        .min(1, 'Order must have at least one item'),
      shippingAddress: z.object({
        street: z.string().min(1, 'Street is required'),
        city: z.string().min(1, 'City is required'),
        zipCode: z.string().min(1, 'Zip code is required'),
        country: z.string().length(2, 'Country must be a 2-letter code'),
      }),
    }),
    // Mix response schemas too
    response: {
      201: z.object({
        orderId: z.string(),
        total: z.number(),
        items: z.array(z.object({ productId: z.string(), quantity: z.number() })),
      }),
      400: {
        type: 'object',
        properties: {
          error: { type: 'string' },
        },
        required: ['error'],
      } as const,
    },
  },
  handler: async (request, reply) => {
    // Types are correctly inferred from both schema types!
    // request.query.includeItems is typed correctly (from JSON Schema)
    // request.query.currency is typed correctly (from JSON Schema)
    // request.body.items, shippingAddress are typed correctly (from Zod)
    const { includeItems } = request.query;
    const { items } = request.body;

    // Coerce includeItems from string to boolean
    const shouldIncludeItems = includeItems === 'true';

    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const orderId = `order-${Date.now()}`;

    const response: {
      orderId: string;
      total: number;
      items?: Array<{ productId: string; quantity: number }>;
    } = {
      orderId,
      total,
    };

    if (shouldIncludeItems) {
      response.items = items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      }));
    }

    reply.status(201).send(response);
  },
});
