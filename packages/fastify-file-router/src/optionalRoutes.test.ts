import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import Fastify from 'fastify';
import { describe, expect, test } from 'vitest';
import { fastifyFileRouter } from './plugin.js';
import { extractRouteParams } from './routeRegistration.js';

const handler = `export default async function handler(request) { return { params: request.params, query: request.query }; }`;
const jsonSchema = `export const schema = {
  operationId: 'download-asset',
  params: { type: 'object', properties: { assetName: { type: 'string' }, version: { type: 'string' } }, required: ['assetName'], additionalProperties: false }
};`;

describe('optional parameter suffix routing', () => {
  test.each([
    ['remix', 'folder', '[.]webp', 'json'],
    ['remix', 'file', '[.]ultrahdr[.]jpg', 'json'],
    ['next', 'folder', '[.]webp', 'json'],
    ['next', 'file', '', 'json'],
    ['remix', 'folder', '[.]webp', 'zod'],
    ['next', 'file', '[.]webp', 'zod'],
  ] as const)('%s %s routes with %s suffix and %s schema', async (convention, layout, extension, schemaType) => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ffr-optional-'));
    const app = Fastify();
    const schemas: { operationId: unknown; params: string[] }[] = [];
    app.addHook('onRoute', (route) => {
      if (route.method === 'GET' && route.schema) {
        const schema = route.schema as { operationId?: string; params?: { properties?: Record<string, unknown> } };
        schemas.push({ operationId: schema.operationId, params: Object.keys(schema.params?.properties ?? {}) });
      }
    });
    const suffix = extension.replaceAll('[.]', '.');
    const segment = `${convention === 'remix' ? '$assetName' : '[assetName]'}?[@version]`;
    const file =
      layout === 'folder'
        ? path.join(root, segment, `${extension ? extension + '.' : ''}get.js`)
        : path.join(root, `${segment}${extension}.get.js`);
    try {
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(
        file,
        schemaType === 'json'
          ? `${handler}\n${jsonSchema}`
          : `
        import { z } from ${JSON.stringify(import.meta.resolve('zod'))};
        import { defineRouteZod } from ${JSON.stringify(new URL('../dist/index.js', import.meta.url).href)};
        export const route = defineRouteZod({
          schema: { operationId: 'download-asset', params: z.strictObject({ assetName: z.string(), version: z.string().optional() }) },
          handler: async request => ({params: request.params, query: request.query})
        });
      `,
      );
      await app.register(fastifyFileRouter, { routesDirs: [path.relative(process.cwd(), root)], convention });
      for (const version of [undefined, 'latest', '1', '1.2', '1.2.3', 'draft', '1.2.3-beta.1']) {
        const response = await app.inject(`/${version ? `chair@${version}` : 'chair'}${suffix}?width=512`);
        expect(response.statusCode, response.body).toBe(200);
        expect(response.json()).toEqual({
          params: { assetName: 'chair', ...(version ? { version } : {}) },
          query: { width: '512' },
        });
      }
      for (const reference of ['chair@', '@draft', 'chair@one@two']) {
        expect((await app.inject(`/${reference}${suffix}`)).statusCode).toBe(404);
      }
      expect((await app.inject(`/chair@1.2.3${suffix}/extra`)).statusCode).toBe(404);
      expect(schemas).toEqual([
        { operationId: 'download-asset', params: ['assetName', 'version'] },
        { operationId: 'download-asset-optional-1', params: ['assetName'] },
      ]);
    } finally {
      await app.close();
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  test('expands independent optional suffixes in nested segments', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ffr-optional-nested-'));
    const app = Fastify();
    try {
      const dir = path.join(root, '$assetName?[@version]', '$file?[-locale]');
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, 'get.js'), handler);
      await app.register(fastifyFileRouter, { routesDirs: [path.relative(process.cwd(), root)] });
      for (const version of [undefined, '1.2.3']) {
        for (const locale of [undefined, 'en']) {
          const response = await app.inject(
            `/chair${version ? `@${version}` : ''}/manifest${locale ? `-${locale}` : ''}`,
          );
          expect(response.statusCode, response.body).toBe(200);
          expect(response.json().params).toEqual({
            assetName: 'chair',
            file: 'manifest',
            ...(version ? { version } : {}),
            ...(locale ? { locale } : {}),
          });
        }
      }
    } finally {
      await app.close();
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  test('extracts schema parameter names around regex boundaries', () => {
    expect(extractRouteParams('/media/:assetName([^@]+)@:version([^@]+).webp')).toEqual(['assetName', 'version']);
  });
});
