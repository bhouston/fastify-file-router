import type { FastifyInstance } from 'fastify';
import { beforeAll, describe, expect, test } from 'vitest';
import { getApp } from '../../../buildFastify.ts';

describe('POST /api/users', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await getApp();
  });

  test('creates a user successfully', async () => {
    const response = await app.inject({
      method: 'post',
      url: '/api/users',
      payload: {
        email: 'test@example.com',
        password: 'secret123',
      },
    });
    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body).toHaveProperty('message', 'User created successfully');
  });
});
