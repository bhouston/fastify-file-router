import type { FastifySchema } from 'fastify';
import { describe, expect, test } from 'vitest';
import { defineRoute } from './defineRoute.js';

describe('defineRoute', () => {
  test('returns route with schema and handler', () => {
    const handler = async () => ({});
    const schema: FastifySchema = {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
    };

    const route = defineRoute({
      schema,
      handler,
    });

    expect(route.schema).toBe(schema);
    expect(route.handler).toBe(handler);
  });

  test('handles route with params schema', () => {
    const route = defineRoute({
      schema: {
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        } as const,
      },
      handler: async (request) => {
        // Type inference should work here
        const { id } = request.params;
        return { id };
      },
    });

    expect(route.schema.params).toBeDefined();
    expect(route.schema.params).toHaveProperty('type', 'object');
    expect(route.schema.params).toHaveProperty('properties');
  });

  test('handles route with body schema', () => {
    const route = defineRoute({
      schema: {
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            email: { type: 'string' },
          },
          required: ['name', 'email'],
        } as const,
      },
      handler: async (request) => {
        // Type inference should work here
        const { name, email } = request.body;
        return { name, email };
      },
    });

    expect(route.schema.body).toBeDefined();
    expect(route.schema.body).toHaveProperty('type', 'object');
    expect(route.schema.body).toHaveProperty('properties');
  });

  test('handles route with querystring schema', () => {
    const route = defineRoute({
      schema: {
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
          },
        } as const,
      },
      handler: async (request) => {
        // Type inference should work here
        const { page, limit } = request.query;
        return { page, limit };
      },
    });

    expect(route.schema.querystring).toBeDefined();
    expect(route.schema.querystring).toHaveProperty('type', 'object');
    expect(route.schema.querystring).toHaveProperty('properties');
  });

  test('handles route with headers schema', () => {
    const route = defineRoute({
      schema: {
        headers: {
          type: 'object',
          properties: {
            'x-api-key': { type: 'string' },
          },
          required: ['x-api-key'],
        } as const,
      },
      handler: async (request) => {
        // Type inference should work here
        const apiKey = request.headers['x-api-key'];
        return { apiKey };
      },
    });

    expect(route.schema.headers).toBeDefined();
    expect(route.schema.headers).toHaveProperty('type', 'object');
    expect(route.schema.headers).toHaveProperty('properties');
  });

  test('handles route with all schema types', () => {
    const route = defineRoute({
      schema: {
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        } as const,
        querystring: {
          type: 'object',
          properties: {
            include: { type: 'string' },
          },
        } as const,
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
          },
          required: ['name'],
        } as const,
        headers: {
          type: 'object',
          properties: {
            'x-api-key': { type: 'string' },
          },
          required: ['x-api-key'],
        } as const,
      },
      handler: async (request) => {
        // Type inference should work for all
        const { id } = request.params;
        const { include } = request.query;
        const { name } = request.body;
        const apiKey = request.headers['x-api-key'];
        return { id, include, name, apiKey };
      },
    });

    expect(route.schema.params).toBeDefined();
    expect(route.schema.querystring).toBeDefined();
    expect(route.schema.body).toBeDefined();
    expect(route.schema.headers).toBeDefined();
  });

  test('handles route with response schema', () => {
    const route = defineRoute({
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
            },
          },
          400: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
      handler: async () => ({}),
    });

    expect(route.schema.response).toBeDefined();
    expect(route.schema.response?.[200]).toBeDefined();
    expect(route.schema.response?.[400]).toBeDefined();
  });

  test('handles route with empty schema', () => {
    const route = defineRoute({
      schema: {},
      handler: async () => ({}),
    });

    expect(route.schema).toBeDefined();
    expect(route.schema.params).toBeUndefined();
    expect(route.schema.body).toBeUndefined();
    expect(route.schema.querystring).toBeUndefined();
    expect(route.schema.headers).toBeUndefined();
  });

  test('preserves additional schema properties', () => {
    const route = defineRoute({
      schema: {
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        } as const,
        description: 'Test route',
        tags: ['test'],
      } as FastifySchema,
      handler: async () => ({}),
    });

    const schemaWithExtras = route.schema as FastifySchema & { description?: string; tags?: string[] };
    expect(schemaWithExtras.description).toBe('Test route');
    expect(schemaWithExtras.tags).toEqual(['test']);
  });
});
