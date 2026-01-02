import type { FastifyInstance } from 'fastify';
import { beforeAll, describe, expect, test } from 'vitest';
import { getApp } from '../../../buildFastify.ts';

describe('POST /api/orders - Mixed JSON Schema querystring + Zod body', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await getApp();
  });

  test('creates order with valid querystring and body', async () => {
    const response = await app.inject({
      method: 'post',
      url: '/api/orders?includeItems=true&currency=USD',
      payload: {
        items: [
          {
            productId: '550e8400-e29b-41d4-a716-446655440000',
            quantity: 2,
            price: 29.99,
          },
        ],
        shippingAddress: {
          street: '123 Main St',
          city: 'New York',
          zipCode: '10001',
          country: 'US',
        },
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body).toHaveProperty('orderId');
    expect(body).toHaveProperty('total', 59.98);
    expect(body).toHaveProperty('items');
    expect(body.items).toHaveLength(1);
  });

  test('creates order without items in response when includeItems is false', async () => {
    const response = await app.inject({
      method: 'post',
      url: '/api/orders?includeItems=false&currency=EUR',
      payload: {
        items: [
          {
            productId: '550e8400-e29b-41d4-a716-446655440000',
            quantity: 1,
            price: 19.99,
          },
        ],
        shippingAddress: {
          street: '456 Oak Ave',
          city: 'Paris',
          zipCode: '75001',
          country: 'FR',
        },
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body).toHaveProperty('orderId');
    expect(body).toHaveProperty('total', 19.99);
    expect(body).not.toHaveProperty('items');
  });

  test('rejects invalid querystring (JSON Schema validation)', async () => {
    const response = await app.inject({
      method: 'post',
      url: '/api/orders?currency=INVALID',
      payload: {
        items: [
          {
            productId: '550e8400-e29b-41d4-a716-446655440000',
            quantity: 1,
            price: 19.99,
          },
        ],
        shippingAddress: {
          street: '123 Main St',
          city: 'New York',
          zipCode: '10001',
          country: 'US',
        },
      },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toContain('Bad Request: querystring');
  });

  test('rejects invalid body - empty items array (Zod validation)', async () => {
    const response = await app.inject({
      method: 'post',
      url: '/api/orders',
      payload: {
        items: [],
        shippingAddress: {
          street: '123 Main St',
          city: 'New York',
          zipCode: '10001',
          country: 'US',
        },
      },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toContain('Bad Request: body');
    expect(body.error).toContain('at least one item');
  });

  test('rejects invalid body - invalid UUID (Zod validation)', async () => {
    const response = await app.inject({
      method: 'post',
      url: '/api/orders',
      payload: {
        items: [
          {
            productId: 'invalid-uuid',
            quantity: 1,
            price: 19.99,
          },
        ],
        shippingAddress: {
          street: '123 Main St',
          city: 'New York',
          zipCode: '10001',
          country: 'US',
        },
      },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toContain('Bad Request: body');
    expect(body.error).toContain('UUID');
  });

  test('rejects invalid body - invalid country code length (Zod validation)', async () => {
    const response = await app.inject({
      method: 'post',
      url: '/api/orders',
      payload: {
        items: [
          {
            productId: '550e8400-e29b-41d4-a716-446655440000',
            quantity: 1,
            price: 19.99,
          },
        ],
        shippingAddress: {
          street: '123 Main St',
          city: 'New York',
          zipCode: '10001',
          country: 'USA', // Invalid: must be 2 letters
        },
      },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toContain('Bad Request: body');
    expect(body.error).toContain('2-letter code');
  });
});
