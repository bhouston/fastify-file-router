import type { FastifyInstance } from 'fastify';
import { beforeAll, describe, expect, test } from 'vitest';
import { getApp } from '../../../buildFastify.js';

describe('GET /api/health', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await getApp();
  });

  test('responds with 204 status', async () => {
    const response = await app.inject({
      method: 'get',
      url: '/api/health',
    });
    expect(response.statusCode).toBe(204);
  });
});
