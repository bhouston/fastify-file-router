import type { FastifyInstance } from 'fastify';
import { beforeAll, describe, expect, test } from 'vitest';
import { getApp } from '../../../buildFastify.ts';

describe('GET /api/files/hashes/*', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await getApp();
  });

  test('responds with wildcard value', async () => {
    const response = await app.inject({
      method: 'get',
      url: '/api/files/hashes/some-hash-value',
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('message', 'Wildcard value is some-hash-value');
  });
});
