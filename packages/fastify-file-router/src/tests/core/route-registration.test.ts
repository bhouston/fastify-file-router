import fastify, { type FastifyInstance } from 'fastify';
import path from 'path';
import { fileURLToPath } from 'url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { fastifyFileRouter } from '../../plugin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Route Registration', () => {
  let app: FastifyInstance;

  beforeEach(() => {
    app = fastify();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Basic HTTP Methods', () => {
    it('should register routes with different HTTP methods', async () => {
      const fixturesPath = path.join(__dirname, 'fixtures/basic-methods');
      console.log('Current working directory:', process.cwd());
      console.log('Fixtures path:', fixturesPath);

      // Register the plugin with test routes directory
      await app.register(fastifyFileRouter, {
        routesDirs: [fixturesPath],
        buildRoot: path.dirname(fixturesPath),
        logLevel: 'error'
      });

      // Test GET route
      const getResponse = await app.inject({
        method: 'GET',
        url: '/hello'
      });
      expect(getResponse.statusCode).toBe(200);
      expect(JSON.parse(getResponse.payload)).toEqual({
        message: 'Hello from GET'
      });

      // Test POST route
      const postResponse = await app.inject({
        method: 'POST',
        url: '/hello'
      });
      expect(postResponse.statusCode).toBe(200);
      expect(JSON.parse(postResponse.payload)).toEqual({
        message: 'Hello from POST'
      });

      // Test PUT route
      const putResponse = await app.inject({
        method: 'PUT',
        url: '/hello'
      });
      expect(putResponse.statusCode).toBe(200);
      expect(JSON.parse(putResponse.payload)).toEqual({
        message: 'Hello from PUT'
      });

      // Test DELETE route
      const deleteResponse = await app.inject({
        method: 'DELETE',
        url: '/hello'
      });
      expect(deleteResponse.statusCode).toBe(200);
      expect(JSON.parse(deleteResponse.payload)).toEqual({
        message: 'Hello from DELETE'
      });
    });
  });
});
