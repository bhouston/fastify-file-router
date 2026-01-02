import type { FastifyInstance } from 'fastify';
import { beforeAll, describe, expect, test } from 'vitest';
import { getApp } from '../../../buildFastify.ts';

describe('POST /api/products/:id - Mixed Zod params + JSON Schema body', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await getApp();
  });

  test('creates product with valid UUID and valid body', async () => {
    const response = await app.inject({
      method: 'post',
      url: '/api/products/550e8400-e29b-41d4-a716-446655440000',
      payload: {
        name: 'Test Product',
        price: 29.99,
        description: 'A test product',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body).toHaveProperty('id', '550e8400-e29b-41d4-a716-446655440000');
    expect(body).toHaveProperty('name', 'Test Product');
    expect(body).toHaveProperty('price', 29.99);
  });

  test('rejects invalid UUID in params (Zod validation)', async () => {
    const response = await app.inject({
      method: 'post',
      url: '/api/products/invalid-uuid',
      payload: {
        name: 'Test Product',
        price: 29.99,
      },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toContain('Bad Request: params');
    expect(body.error).toContain('UUID');
  });

  test('rejects invalid body (JSON Schema validation)', async () => {
    const response = await app.inject({
      method: 'post',
      url: '/api/products/550e8400-e29b-41d4-a716-446655440000',
      payload: {
        // Missing required 'name' field
        price: 29.99,
      },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toContain('Bad Request: body');
  });

  test('rejects negative price (JSON Schema validation)', async () => {
    const response = await app.inject({
      method: 'post',
      url: '/api/products/550e8400-e29b-41d4-a716-446655440000',
      payload: {
        name: 'Test Product',
        price: -10, // Invalid: minimum is 0
      },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toContain('Bad Request: body');
  });
});
