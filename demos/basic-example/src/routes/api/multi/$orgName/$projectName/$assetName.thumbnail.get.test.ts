import type { FastifyInstance } from 'fastify';
import { beforeAll, describe, expect, test } from 'vitest';
import { getApp } from '../../../../../buildFastify.ts';

describe('GET /api/multi/$orgName/$projectName/$assetName/thumbnail', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await getApp();
  });

  test('extracts all three parameters correctly', async () => {
    const response = await app.inject({
      method: 'get',
      url: '/api/multi/my-org/my-project/my-asset/thumbnail',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();

    expect(body).toHaveProperty('message', 'All parameters extracted successfully');
    expect(body).toHaveProperty('orgName', 'my-org');
    expect(body).toHaveProperty('projectName', 'my-project');
    expect(body).toHaveProperty('assetName', 'my-asset');
  });

  test('handles different parameter values', async () => {
    const response = await app.inject({
      method: 'get',
      url: '/api/multi/acme-corp/secret-project/image-123/thumbnail',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();

    expect(body.orgName).toBe('acme-corp');
    expect(body.projectName).toBe('secret-project');
    expect(body.assetName).toBe('image-123');
  });
});
