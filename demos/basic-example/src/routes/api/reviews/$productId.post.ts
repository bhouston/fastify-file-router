import { defineRouteZod } from 'fastify-file-router';
import { z } from 'zod';

// POST /api/reviews/:productId
// Example: Mixing all field types - Zod params, JSON Schema querystring, Zod body, JSON Schema headers

export const route = defineRouteZod({
  schema: {
    // Zod for params - complex validation
    params: z.object({
      productId: z.string().uuid('Product ID must be a valid UUID'),
    }),
    // JSON Schema for querystring - simple validation
    // Note: For boolean querystring params, use string enum or handle in code
    querystring: {
      type: 'object',
      properties: {
        includeUser: { type: 'string', enum: ['true', 'false'] },
      },
    } as const,
    // Zod for body - complex validation with custom messages
    body: z.object({
      rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
      comment: z
        .string()
        .min(10, 'Comment must be at least 10 characters')
        .max(500, 'Comment must be at most 500 characters'),
      verifiedPurchase: z.boolean().optional(),
    }),
    // JSON Schema for headers - simple validation
    headers: {
      type: 'object',
      properties: {
        'x-user-id': { type: 'string' },
        'x-api-version': { type: 'string', enum: ['v1', 'v2'] },
      },
      required: ['x-user-id'],
    } as const,
    // Mixed response schemas
    response: {
      201: z.object({
        reviewId: z.string(),
        productId: z.string(),
        rating: z.number(),
        createdAt: z.string(),
        userId: z.string().optional(),
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
    // Types are correctly inferred from all schema types!
    // request.params.productId is typed as string (from Zod)
    // request.query.includeUser is typed correctly (from JSON Schema)
    // request.body.rating, comment, verifiedPurchase are typed correctly (from Zod)
    // request.headers['x-user-id'], ['x-api-version'] are typed correctly (from JSON Schema)
    const { productId } = request.params;
    const { includeUser } = request.query;
    const { rating } = request.body;
    const userId = request.headers['x-user-id'];

    // Coerce includeUser from string to boolean
    const shouldIncludeUser = includeUser === 'true';

    const reviewId = `review-${Date.now()}`;

    const response: {
      reviewId: string;
      productId: string;
      rating: number;
      createdAt: string;
      userId?: string;
    } = {
      reviewId,
      productId,
      rating,
      createdAt: new Date().toISOString(),
    };

    if (shouldIncludeUser) {
      response.userId = userId;
    }

    reply.status(201).send(response);
  },
});
