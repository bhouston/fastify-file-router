import type { FastifyInstance } from 'fastify';
import { beforeAll, describe, expect, test } from 'vitest';
import { getApp } from '../../../buildFastify.ts';

describe('GET /signup (route group (auth))', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await getApp();
  });

  test('responds at /signup without (auth) in URL', async () => {
    const response = await app.inject({
      method: 'get',
      url: '/signup',
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveProperty('route', 'signup');
  });
});
