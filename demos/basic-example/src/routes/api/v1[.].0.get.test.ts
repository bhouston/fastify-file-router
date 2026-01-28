import { describe, expect, test } from 'vitest';
import { getApp } from '../../buildFastify.js';

describe('GET /api/v1.0', () => {
  test('returns version information', async () => {
    const app = await getApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1.0',
    });

    expect(response.statusCode).toBe(200);
    const data = response.json();
    expect(data).toHaveProperty('version', '1.0');
    expect(data).toHaveProperty('message');
    expect(data.message).toContain('literal dots');

    await app.close();
  });
});
