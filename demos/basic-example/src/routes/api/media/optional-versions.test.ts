import type { FastifyInstance } from 'fastify';
import type { OpenAPIV3 } from 'openapi-types';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { getApp } from '../../../buildFastify.js';

describe('GET optional media version metadata', () => {
  let app: FastifyInstance;
  const prefix = '/api/media/acme/demo/chair';

  beforeAll(async () => {
    app = await getApp({ profileRoutes: false });
    await app.ready();
  });
  afterAll(async () => app.close());

  test.each([undefined, 'latest', '1', '1.2', '1.2.3', 'draft', '1.2.3-beta.1'])(
    'extracts separate parameters for version %s',
    async (version) => {
      const response = await app.inject(`${prefix}${version ? `@${version}` : ''}.metadata.json?width=512`);
      expect(response.statusCode, response.body).toBe(200);
      expect(response.json()).toEqual({
        orgName: 'acme',
        projectName: 'demo',
        assetName: 'chair',
        ...(version ? { version } : {}),
        width: 512,
      });
    },
  );

  test.each(['@', '@one@two'])('rejects malformed suffix %s', async (suffix) => {
    expect((await app.inject(`${prefix}${suffix}.metadata.json`)).statusCode).toBe(404);
  });

  test('preserves method, extension, and query validation', async () => {
    expect((await app.inject({ method: 'POST', url: `${prefix}@draft.metadata.json` })).statusCode).toBe(404);
    expect((await app.inject(`${prefix}@draft.json`)).statusCode).toBe(404);
    expect((await app.inject(`${prefix}@draft.metadata.json?width=invalid`)).statusCode).toBe(400);
  });

  test('documents both concrete paths with distinct operation IDs and matching parameters', () => {
    const document = app.swagger() as OpenAPIV3.Document;
    const versioned = document.paths['/api/media/{orgName}/{projectName}/{assetName}@{version}.metadata.json']?.get;
    const bare = document.paths['/api/media/{orgName}/{projectName}/{assetName}.metadata.json']?.get;
    expect(versioned?.operationId).toBe('get-media-metadata');
    expect(bare?.operationId).toBe('get-media-metadata-optional-1');
    const names = (operation: OpenAPIV3.OperationObject | undefined) =>
      operation?.parameters?.flatMap((parameter) =>
        'name' in parameter && parameter.in === 'path' ? [parameter.name] : [],
      );
    expect(names(versioned)).toEqual(['orgName', 'projectName', 'assetName', 'version']);
    expect(names(bare)).toEqual(['orgName', 'projectName', 'assetName']);
  });
});
