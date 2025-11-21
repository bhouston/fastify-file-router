import type { FastifyInstance } from 'fastify';
import { beforeAll, describe, expect, test } from 'vitest';
import { getApp } from '../buildFastify.ts';

describe('GET /api/users/$id', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await getApp();
  });

  test('responds with user information', async () => {
    const response = await app.inject({
      method: 'get',
      url: '/api/users/user-123',
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('id', 'user-123');
    expect(body).toHaveProperty('name', 'John Doe');
    expect(body).toHaveProperty('email', 'john.doe@microsoft.com');
  });
});
