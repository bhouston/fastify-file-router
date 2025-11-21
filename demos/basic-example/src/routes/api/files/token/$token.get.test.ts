import type { FastifyInstance } from 'fastify';
import { beforeAll, describe, expect, test } from 'vitest';
import { getApp } from '../../../../buildFastify.ts';

describe('GET /api/files/token/$token', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await getApp();
  });

  test('responds with token value', async () => {
    const response = await app.inject({
      method: 'get',
      url: '/api/files/token/my-secret-token',
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('message', 'Token value is my-secret-token');
  });
});
