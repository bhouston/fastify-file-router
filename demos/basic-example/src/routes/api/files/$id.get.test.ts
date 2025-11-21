import type { FastifyInstance } from 'fastify';
import { beforeAll, describe, expect, test } from 'vitest';
import { getApp } from '../../../buildFastify.ts';

describe('GET /api/files/$id', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await getApp();
  });

  test('responds with file information', async () => {
    const response = await app.inject({
      method: 'get',
      url: '/api/files/test-id-123',
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('id', 'test-id-123');
    expect(body).toHaveProperty('mimeType', 'application/octet-stream');
    expect(body).toHaveProperty('name', 'example.txt');
    expect(body).toHaveProperty('size', 1024);
  });
});
