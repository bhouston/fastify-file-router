import type { FastifyInstance } from 'fastify';
import { beforeAll, describe, expect, test } from 'vitest';
import { getApp } from '../../../buildFastify.ts';

describe('PUT /api/users/:id', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await getApp();
  });

  test('updates a user successfully', async () => {
    const response = await app.inject({
      method: 'put',
      url: '/api/users/user-123',
      payload: {
        name: 'Jane Doe',
        email: 'jane.doe@example.com',
      },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('id', 'user-123');
    expect(body).toHaveProperty('name', 'Jane Doe');
    expect(body).toHaveProperty('email', 'jane.doe@example.com');
    expect(body).toHaveProperty('updatedAt');
    expect(typeof body.updatedAt).toBe('string');
  });

  test('returns 404 when user is not found', async () => {
    const response = await app.inject({
      method: 'put',
      url: '/api/users/not-found',
      payload: {
        name: 'Jane Doe',
        email: 'jane.doe@example.com',
      },
    });
    expect(response.statusCode).toBe(404);
    const body = response.json();
    expect(body).toHaveProperty('error', 'Not Found');
    expect(body).toHaveProperty('message');
    expect(body.message).toContain('not-found');
  });

  test('validates required body fields', async () => {
    const response = await app.inject({
      method: 'put',
      url: '/api/users/user-123',
      payload: {
        name: 'Jane Doe',
        // Missing email
      },
    });
    expect(response.statusCode).toBe(400);
  });

  test('validates email format', async () => {
    const response = await app.inject({
      method: 'put',
      url: '/api/users/user-123',
      payload: {
        name: 'Jane Doe',
        email: 'invalid-email',
      },
    });
    expect(response.statusCode).toBe(400);
  });
});

