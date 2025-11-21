import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import { describe, expect, test } from 'vitest';
import type { FileRouteConvention } from './FastifyFileRouterOptions.js';
import { buildUrl, convertRoutePath, parseFileName, shouldExcludeFile } from './routeRegistration.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('parseFileName', () => {
  test('parses valid route file names', () => {
    const result = parseFileName('get.ts', ['.ts'], '/test/get.ts');
    expect(result).toEqual({
      routeSegments: [],
      method: 'get',
      extension: '.ts',
    });

    const result2 = parseFileName('api.health.get.ts', ['.ts'], '/test/api.health.get.ts');
    expect(result2).toEqual({
      routeSegments: ['api', 'health'],
      method: 'get',
      extension: '.ts',
    });

    const result3 = parseFileName('api.users.$id.get.ts', ['.ts'], '/test/api.users.$id.get.ts');
    expect(result3).toEqual({
      routeSegments: ['api', 'users', '$id'],
      method: 'get',
      extension: '.ts',
    });
  });

  test('returns null for invalid extensions', () => {
    const result = parseFileName('get.js', ['.ts'], '/test/get.js');
    expect(result).toBeNull();
  });

  test('throws error for files with less than 2 segments', () => {
    expect(() => parseFileName('file', ['.ts'], '/test/file')).toThrow(
      'Invalid file name "file" in file /test/file, must have at least 2 segments separated by a dot',
    );
  });

  test('throws error for missing method segment', () => {
    expect(() => parseFileName('.ts', ['.ts'], '/test/.ts')).toThrow(
      'Invalid file name ".ts" in file /test/.ts, method segment is missing',
    );
  });
});

describe('convertRoutePath', () => {
  test('converts remix-style routes', () => {
    expect(convertRoutePath(['api', 'health'], 'remix', '/test')).toBe('api/health');
    expect(convertRoutePath(['api', 'users', '$id'], 'remix', '/test')).toBe('api/users/:id');
    expect(convertRoutePath(['api', 'files', '$'], 'remix', '/test')).toBe('api/files/*');
  });

  test('converts next-style routes', () => {
    expect(convertRoutePath(['api', 'health'], 'next', '/test')).toBe('api/health');
    expect(convertRoutePath(['api', 'users', '[id]'], 'next', '/test')).toBe('api/users/:id');
    expect(convertRoutePath(['api', 'files', '[...path]'], 'next', '/test')).toBe('api/files/*');
  });

  test('throws error for invalid convention', () => {
    expect(() => convertRoutePath(['api'], 'invalid' as FileRouteConvention, '/test')).toThrow(
      'Invalid convention "invalid"',
    );
  });
});

describe('buildUrl', () => {
  test('builds URL with root mount', () => {
    expect(buildUrl('api/health', '/')).toBe('/api/health');
    expect(buildUrl('/api/health', '/')).toBe('/api/health');
  });

  test('builds URL with custom mount', () => {
    expect(buildUrl('api/health', '/v1')).toBe('/v1/api/health');
    expect(buildUrl('/api/health', '/v1')).toBe('/v1/api/health');
  });

  test('handles routes without leading slash', () => {
    expect(buildUrl('health', '/')).toBe('/health');
    expect(buildUrl('health', '/api')).toBe('/api/health');
  });
});

describe('shouldExcludeFile', () => {
  test('excludes files matching patterns', () => {
    const patterns = [/^[.|_].*/, /\.test\.ts$/];
    expect(shouldExcludeFile('.hidden.ts', patterns)).toBeDefined();
    expect(shouldExcludeFile('_private.ts', patterns)).toBeDefined();
    expect(shouldExcludeFile('file.test.ts', patterns)).toBeDefined();
  });

  test('does not exclude files that do not match', () => {
    const patterns = [/^[.|_].*/, /\.test\.ts$/];
    expect(shouldExcludeFile('get.ts', patterns)).toBeUndefined();
    expect(shouldExcludeFile('api.health.get.ts', patterns)).toBeUndefined();
  });
});

describe('routeRegistration integration', () => {
  test('registers routes from demo directory', async () => {
    const app = Fastify({ logger: false });
    // Path from packages/fastify-file-router/src to demos/basic-example/src/routes
    const demoRoutesDir = path.resolve(__dirname, '../../../demos/basic-example/src/routes');

    // Import registerRoutes dynamically to avoid circular dependencies
    const { registerRoutes } = await import('./routeRegistration.js');

    await registerRoutes(app, '/', ['.ts'], 'remix', 'info', [/\.test\.ts$/], demoRoutesDir, demoRoutesDir);

    // Check that routes are registered by testing actual endpoints
    const healthResponse = await app.inject({
      method: 'GET',
      url: '/api/health',
    });
    expect(healthResponse.statusCode).toBe(204);

    const usersResponse = await app.inject({
      method: 'GET',
      url: '/api/users/123',
    });
    expect(usersResponse.statusCode).toBe(200);
    const usersData = usersResponse.json();
    expect(usersData).toHaveProperty('id', '123');

    const filesResponse = await app.inject({
      method: 'GET',
      url: '/api/files/456',
    });
    expect(filesResponse.statusCode).toBe(200);
    const filesData = filesResponse.json();
    expect(filesData).toHaveProperty('id', '456');

    // Test wildcard route
    const wildcardResponse = await app.inject({
      method: 'GET',
      url: '/api/files/hashes/some/path/here',
    });
    expect(wildcardResponse.statusCode).toBe(200);
    const wildcardData = wildcardResponse.json();
    expect(wildcardData).toHaveProperty('message');
    expect(wildcardData.message).toContain('some/path/here');

    await app.close();
  });
});
