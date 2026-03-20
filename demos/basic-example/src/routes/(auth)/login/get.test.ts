import type { FastifyInstance } from 'fastify';
import { beforeAll, describe, expect, test } from 'vitest';
import { getApp } from '../../../buildFastify.js';

describe('GET /login (route group (auth))', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await getApp();
  });

  test('responds at /login without (auth) in URL', async () => {
    const response = await app.inject({
      method: 'get',
      url: '/login',
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveProperty('route', 'login');
  });

  test('(auth) segment is not in the route path', async () => {
    const response = await app.inject({
      method: 'get',
      url: '/(auth)/login',
    });
    expect(response.statusCode).toBe(404);
  });
});
