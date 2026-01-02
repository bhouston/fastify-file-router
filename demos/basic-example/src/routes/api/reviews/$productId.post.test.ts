import type { FastifyInstance } from 'fastify';
import { beforeAll, describe, expect, test } from 'vitest';
import { getApp } from '../../../buildFastify.ts';

describe('POST /api/reviews/:productId - Mixed all field types', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await getApp();
  });

  test('creates review with all valid inputs', async () => {
    const response = await app.inject({
      method: 'post',
      url: '/api/reviews/550e8400-e29b-41d4-a716-446655440000?includeUser=true',
      headers: {
        'x-user-id': 'user-123',
        'x-api-version': 'v1',
      },
      payload: {
        rating: 5,
        comment: 'This is an excellent product! Highly recommended.',
        verifiedPurchase: true,
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body).toHaveProperty('reviewId');
    expect(body).toHaveProperty('productId', '550e8400-e29b-41d4-a716-446655440000');
    expect(body).toHaveProperty('rating', 5);
    expect(body).toHaveProperty('userId', 'user-123');
  });

  test('rejects invalid UUID in params (Zod validation)', async () => {
    const response = await app.inject({
      method: 'post',
      url: '/api/reviews/invalid-uuid',
      headers: {
        'x-user-id': 'user-123',
      },
      payload: {
        rating: 5,
        comment: 'This is an excellent product!',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toContain('Bad Request: params');
    expect(body.error).toContain('UUID');
  });

  test('rejects invalid querystring (JSON Schema validation)', async () => {
    const response = await app.inject({
      method: 'post',
      url: '/api/reviews/550e8400-e29b-41d4-a716-446655440000?includeUser=not-boolean',
      headers: {
        'x-user-id': 'user-123',
      },
      payload: {
        rating: 5,
        comment: 'This is an excellent product!',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toContain('Bad Request: querystring');
  });

  test('rejects invalid body - rating too high (Zod validation)', async () => {
    const response = await app.inject({
      method: 'post',
      url: '/api/reviews/550e8400-e29b-41d4-a716-446655440000',
      headers: {
        'x-user-id': 'user-123',
      },
      payload: {
        rating: 6, // Invalid: max is 5
        comment: 'This is an excellent product!',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toContain('Bad Request: body');
    expect(body.error).toContain('at most 5');
  });

  test('rejects invalid body - comment too short (Zod validation)', async () => {
    const response = await app.inject({
      method: 'post',
      url: '/api/reviews/550e8400-e29b-41d4-a716-446655440000',
      headers: {
        'x-user-id': 'user-123',
      },
      payload: {
        rating: 5,
        comment: 'Too short', // Invalid: min is 10 characters
      },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toContain('Bad Request: body');
    expect(body.error).toContain('at least 10 characters');
  });

  test('rejects missing required header (JSON Schema validation)', async () => {
    const response = await app.inject({
      method: 'post',
      url: '/api/reviews/550e8400-e29b-41d4-a716-446655440000',
      // Missing x-user-id header
      payload: {
        rating: 5,
        comment: 'This is an excellent product!',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toContain('Bad Request: headers');
  });

  test('rejects invalid header enum value (JSON Schema validation)', async () => {
    const response = await app.inject({
      method: 'post',
      url: '/api/reviews/550e8400-e29b-41d4-a716-446655440000',
      headers: {
        'x-user-id': 'user-123',
        'x-api-version': 'v3', // Invalid: must be v1 or v2
      },
      payload: {
        rating: 5,
        comment: 'This is an excellent product!',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toContain('Bad Request: headers');
  });
});
