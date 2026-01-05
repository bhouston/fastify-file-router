import type { FastifySchema } from 'fastify';
import { describe, expect, test } from 'vitest';
import { z } from 'zod';
import { defineRouteZod, formatJsonSchemaError, formatZodError } from './defineRouteZod.js';

describe('defineRouteZod - zodToJsonSchema conversion', () => {
  test('removes $schema property from converted JSON Schema', () => {
    const route = defineRouteZod({
      schema: {
        params: z.object({
          id: z.string(),
        }),
      },
      handler: async () => ({}),
    });

    // Verify $schema is not present
    expect(route.schema.params).not.toHaveProperty('$schema');
    expect(route.schema.params).toHaveProperty('type', 'object');
    expect(route.schema.params).toHaveProperty('properties');
  });

  test('converts date schemas to string with date-time format', () => {
    const route = defineRouteZod({
      schema: {
        body: z.object({
          createdAt: z.date(),
          updatedAt: z.date(),
        }),
      },
      handler: async () => ({}),
    });

    const bodySchema = route.schema.body as Record<string, unknown>;
    expect(bodySchema).toHaveProperty('type', 'object');
    expect(bodySchema).toHaveProperty('properties');

    const properties = bodySchema.properties as Record<string, unknown>;
    expect(properties.createdAt).toHaveProperty('type', 'string');
    expect(properties.createdAt).toHaveProperty('format', 'date-time');
    expect(properties.updatedAt).toHaveProperty('type', 'string');
    expect(properties.updatedAt).toHaveProperty('format', 'date-time');
  });

  test('handles date schemas in params', () => {
    const route = defineRouteZod({
      schema: {
        params: z.object({
          date: z.date(),
        }),
      },
      handler: async () => ({}),
    });

    const paramsSchema = route.schema.params as Record<string, unknown>;
    const properties = paramsSchema.properties as Record<string, unknown>;
    expect(properties.date).toHaveProperty('type', 'string');
    expect(properties.date).toHaveProperty('format', 'date-time');
  });

  test('handles date schemas in querystring', () => {
    const route = defineRouteZod({
      schema: {
        querystring: z.object({
          startDate: z.date(),
          endDate: z.date(),
        }),
      },
      handler: async () => ({}),
    });

    const querystringSchema = route.schema.querystring as Record<string, unknown>;
    const properties = querystringSchema.properties as Record<string, unknown>;
    expect(properties.startDate).toHaveProperty('type', 'string');
    expect(properties.startDate).toHaveProperty('format', 'date-time');
    expect(properties.endDate).toHaveProperty('type', 'string');
    expect(properties.endDate).toHaveProperty('format', 'date-time');
  });

  test('handles date schemas in headers', () => {
    const route = defineRouteZod({
      schema: {
        headers: z.object({
          'x-timestamp': z.date(),
        }),
      },
      handler: async () => ({}),
    });

    const headersSchema = route.schema.headers as Record<string, unknown>;
    const properties = headersSchema.properties as Record<string, unknown>;
    expect(properties['x-timestamp']).toHaveProperty('type', 'string');
    expect(properties['x-timestamp']).toHaveProperty('format', 'date-time');
  });

  test('handles nested optional structures with dates', () => {
    const route = defineRouteZod({
      schema: {
        body: z.object({
          user: z
            .object({
              name: z.string(),
              createdAt: z.date(),
            })
            .optional(),
          metadata: z
            .object({
              updatedAt: z.date(),
            })
            .optional(),
        }),
      },
      handler: async () => ({}),
    });

    const bodySchema = route.schema.body as Record<string, unknown>;
    const properties = bodySchema.properties as Record<string, unknown>;

    // Should handle nested optional structures without errors
    expect(properties.user).toBeDefined();
    const userSchema = properties.user as Record<string, unknown>;
    if (userSchema.properties) {
      const userProperties = userSchema.properties as Record<string, unknown>;
      expect(userProperties.createdAt).toHaveProperty('type', 'string');
      expect(userProperties.createdAt).toHaveProperty('format', 'date-time');
    }
  });

  test('handles complex schemas with mixed types including dates', () => {
    const route = defineRouteZod({
      schema: {
        body: z.object({
          id: z.string(),
          count: z.number(),
          isActive: z.boolean(),
          createdAt: z.date(),
          tags: z.array(z.string()),
          metadata: z
            .object({
              updatedAt: z.date(),
              version: z.number(),
            })
            .optional(),
        }),
      },
      handler: async () => ({}),
    });

    const bodySchema = route.schema.body as Record<string, unknown>;
    expect(bodySchema).toHaveProperty('type', 'object');

    const properties = bodySchema.properties as Record<string, unknown>;

    // Verify date conversion
    expect(properties.createdAt).toHaveProperty('type', 'string');
    expect(properties.createdAt).toHaveProperty('format', 'date-time');

    // Verify other types are preserved
    expect(properties.id).toHaveProperty('type', 'string');
    expect(properties.count).toHaveProperty('type', 'number');
    expect(properties.isActive).toHaveProperty('type', 'boolean');
    expect(properties.tags).toHaveProperty('type', 'array');

    // Verify nested optional structure with date
    if (properties.metadata) {
      const metadataSchema = properties.metadata as Record<string, unknown>;
      if (metadataSchema.properties) {
        const metadataProperties = metadataSchema.properties as Record<string, unknown>;
        expect(metadataProperties.updatedAt).toHaveProperty('type', 'string');
        expect(metadataProperties.updatedAt).toHaveProperty('format', 'date-time');
      }
    }
  });

  test('handles arrays of dates', () => {
    const route = defineRouteZod({
      schema: {
        body: z.object({
          timestamps: z.array(z.date()),
        }),
      },
      handler: async () => ({}),
    });

    const bodySchema = route.schema.body as Record<string, unknown>;
    const properties = bodySchema.properties as Record<string, unknown>;
    const timestampsSchema = properties.timestamps as Record<string, unknown>;

    expect(timestampsSchema).toHaveProperty('type', 'array');
    const itemsSchema = timestampsSchema.items as Record<string, unknown>;
    expect(itemsSchema).toHaveProperty('type', 'string');
    expect(itemsSchema).toHaveProperty('format', 'date-time');
  });

  test('handles union types with dates', () => {
    const route = defineRouteZod({
      schema: {
        body: z.object({
          value: z.union([z.string(), z.date()]),
        }),
      },
      handler: async () => ({}),
    });

    const bodySchema = route.schema.body as Record<string, unknown>;
    const properties = bodySchema.properties as Record<string, unknown>;

    // Union types should be handled (exact structure may vary based on zod version)
    expect(properties.value).toBeDefined();
  });

  test('handles empty schemas', () => {
    const route = defineRouteZod({
      schema: {},
      handler: async () => ({}),
    });

    expect(route.schema).toBeDefined();
    expect(route.schema.params).toBeUndefined();
    expect(route.schema.body).toBeUndefined();
    expect(route.schema.querystring).toBeUndefined();
    expect(route.schema.headers).toBeUndefined();
  });

  test('converts response schemas from Zod to JSON Schema', () => {
    const route = defineRouteZod({
      schema: {
        body: z.object({
          name: z.string(),
        }),
        response: {
          200: z.object({
            id: z.string(),
            name: z.string(),
          }),
          400: z.object({
            error: z.string(),
          }),
        },
      },
      handler: async () => ({}),
    });

    const responseSchema = route.schema.response as Record<string, unknown>;
    expect(responseSchema).toBeDefined();
    expect(responseSchema['200']).toBeDefined();
    expect(responseSchema['400']).toBeDefined();

    const response200 = responseSchema['200'] as Record<string, unknown>;
    expect(response200).toHaveProperty('type', 'object');
    expect(response200).toHaveProperty('properties');
    const properties200 = response200.properties as Record<string, unknown>;
    expect(properties200.id).toHaveProperty('type', 'string');
    expect(properties200.name).toHaveProperty('type', 'string');

    const response400 = responseSchema['400'] as Record<string, unknown>;
    expect(response400).toHaveProperty('type', 'object');
    expect(response400).toHaveProperty('properties');
    const properties400 = response400.properties as Record<string, unknown>;
    expect(properties400.error).toHaveProperty('type', 'string');
  });
});

describe('defineRouteZod - mixed Zod and JSON Schema', () => {
  test('accepts Zod params with JSON Schema body', () => {
    const route = defineRouteZod({
      schema: {
        params: z.object({
          id: z.string(),
        }),
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            email: { type: 'string' },
          },
          required: ['name', 'email'],
        } as const,
      },
      handler: async () => ({}),
    });

    // Verify params is converted from Zod to JSON Schema
    const paramsSchema = route.schema.params as Record<string, unknown>;
    expect(paramsSchema).toHaveProperty('type', 'object');
    expect(paramsSchema).toHaveProperty('properties');

    // Verify body is JSON Schema (unchanged)
    const bodySchema = route.schema.body as Record<string, unknown>;
    expect(bodySchema).toHaveProperty('type', 'object');
    expect(bodySchema).toHaveProperty('properties');
    expect(bodySchema).toHaveProperty('required', ['name', 'email']);

    // Verify schema types are tracked
    expect(route.schema.__schemaTypes).toBeDefined();
    expect(route.schema.__schemaTypes?.params).toBe('zod');
    expect(route.schema.__schemaTypes?.body).toBe('json');

    // Verify Zod schemas are stored
    expect(route.schema.__zodSchemas).toBeDefined();
    expect(route.schema.__zodSchemas?.params).toBeDefined();
    expect(route.schema.__zodSchemas?.body).toBeUndefined();
  });

  test('accepts JSON Schema params with Zod body', () => {
    const route = defineRouteZod({
      schema: {
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        } as const,
        body: z.object({
          name: z.string(),
          email: z.string().email(),
        }),
      },
      handler: async () => ({}),
    });

    // Verify params is JSON Schema (unchanged)
    const paramsSchema = route.schema.params as Record<string, unknown>;
    expect(paramsSchema).toHaveProperty('type', 'object');
    expect(paramsSchema).toHaveProperty('properties');
    expect(paramsSchema).toHaveProperty('required', ['id']);

    // Verify body is converted from Zod to JSON Schema
    const bodySchema = route.schema.body as Record<string, unknown>;
    expect(bodySchema).toHaveProperty('type', 'object');
    expect(bodySchema).toHaveProperty('properties');

    // Verify schema types are tracked
    expect(route.schema.__schemaTypes).toBeDefined();
    expect(route.schema.__schemaTypes?.params).toBe('json');
    expect(route.schema.__schemaTypes?.body).toBe('zod');

    // Verify Zod schemas are stored
    expect(route.schema.__zodSchemas).toBeDefined();
    expect(route.schema.__zodSchemas?.params).toBeUndefined();
    expect(route.schema.__zodSchemas?.body).toBeDefined();
  });

  test('accepts mixed querystring and headers', () => {
    const route = defineRouteZod({
      schema: {
        querystring: z.object({
          page: z.number().int().positive(),
        }),
        headers: {
          type: 'object',
          properties: {
            'x-api-key': { type: 'string' },
          },
          required: ['x-api-key'],
        } as const,
      },
      handler: async () => ({}),
    });

    // Verify querystring is converted from Zod
    const querystringSchema = route.schema.querystring as Record<string, unknown>;
    expect(querystringSchema).toHaveProperty('type', 'object');

    // Verify headers is JSON Schema (unchanged)
    const headersSchema = route.schema.headers as Record<string, unknown>;
    expect(headersSchema).toHaveProperty('type', 'object');
    expect(headersSchema).toHaveProperty('required', ['x-api-key']);

    // Verify schema types
    expect(route.schema.__schemaTypes?.querystring).toBe('zod');
    expect(route.schema.__schemaTypes?.headers).toBe('json');
  });

  test('accepts all fields with different schema types', () => {
    const route = defineRouteZod({
      schema: {
        params: z.object({ id: z.string() }), // Zod
        querystring: {
          type: 'object',
          properties: { page: { type: 'number' } },
        } as const, // JSON Schema
        body: z.object({ name: z.string() }), // Zod
        headers: {
          type: 'object',
          properties: { 'x-api-key': { type: 'string' } },
        } as const, // JSON Schema
      },
      handler: async () => ({}),
    });

    // Verify all fields are processed
    expect(route.schema.params).toBeDefined();
    expect(route.schema.querystring).toBeDefined();
    expect(route.schema.body).toBeDefined();
    expect(route.schema.headers).toBeDefined();

    // Verify schema types
    expect(route.schema.__schemaTypes?.params).toBe('zod');
    expect(route.schema.__schemaTypes?.querystring).toBe('json');
    expect(route.schema.__schemaTypes?.body).toBe('zod');
    expect(route.schema.__schemaTypes?.headers).toBe('json');

    // Verify Zod schemas are stored only for Zod fields
    expect(route.schema.__zodSchemas?.params).toBeDefined();
    expect(route.schema.__zodSchemas?.querystring).toBeUndefined();
    expect(route.schema.__zodSchemas?.body).toBeDefined();
    expect(route.schema.__zodSchemas?.headers).toBeUndefined();
  });

  test('accepts mixed response schemas (Zod and JSON Schema)', () => {
    const route = defineRouteZod({
      schema: {
        body: z.object({ name: z.string() }),
        response: {
          200: z.object({
            id: z.string(),
            name: z.string(),
          }),
          400: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
            required: ['error'],
          } as const,
          404: z.object({
            message: z.string(),
          }),
        },
      },
      handler: async () => ({}),
    });

    const responseSchema = route.schema.response as Record<string, unknown>;
    expect(responseSchema).toBeDefined();
    expect(responseSchema['200']).toBeDefined();
    expect(responseSchema['400']).toBeDefined();
    expect(responseSchema['404']).toBeDefined();

    // Verify 200 is converted from Zod
    const response200 = responseSchema['200'] as Record<string, unknown>;
    expect(response200).toHaveProperty('type', 'object');

    // Verify 400 is JSON Schema (unchanged)
    const response400 = responseSchema['400'] as Record<string, unknown>;
    expect(response400).toHaveProperty('type', 'object');
    expect(response400).toHaveProperty('required', ['error']);

    // Verify 404 is converted from Zod
    const response404 = responseSchema['404'] as Record<string, unknown>;
    expect(response404).toHaveProperty('type', 'object');

    // Verify response schema types
    expect(route.schema.__schemaTypes?.response).toBeDefined();
    expect(route.schema.__schemaTypes?.response?.[200]).toBe('zod');
    expect(route.schema.__schemaTypes?.response?.[400]).toBe('json');
    expect(route.schema.__schemaTypes?.response?.[404]).toBe('zod');

    // Verify Zod response schemas are stored
    expect(route.schema.__zodSchemas?.response).toBeDefined();
    expect(route.schema.__zodSchemas?.response?.[200]).toBeDefined();
    expect(route.schema.__zodSchemas?.response?.[400]).toBeUndefined();
    expect(route.schema.__zodSchemas?.response?.[404]).toBeDefined();
  });

  test('preserves other FastifySchema properties when mixing schemas', () => {
    const route = defineRouteZod({
      schema: {
        params: z.object({ id: z.string() }),
        body: {
          type: 'object',
          properties: { name: { type: 'string' } },
        } as const,
        description: 'Test route',
        tags: ['test', 'mixed'],
      },
      handler: async () => ({}),
    });

    const schemaWithExtras = route.schema as FastifySchema & { description?: string; tags?: string[] };
    expect(schemaWithExtras.description).toBe('Test route');
    expect(schemaWithExtras.tags).toEqual(['test', 'mixed']);
  });

  test('handles empty mixed schema', () => {
    const route = defineRouteZod({
      schema: {},
      handler: async () => ({}),
    });

    expect(route.schema).toBeDefined();
    expect(route.schema.__schemaTypes).toBeDefined();
    expect(Object.keys(route.schema.__schemaTypes || {})).toHaveLength(0);
  });
});

describe('defineRouteZod - error formatting functions', () => {
  describe('formatZodError', () => {
    test('formats single error without path', () => {
      const error = z.string().min(5).safeParse('abc');
      if (!error.success) {
        const formatted = formatZodError(error.error, 'body');
        expect(formatted).toContain('Bad Request: body -');
        expect(formatted).toContain('Too small');
      }
    });

    test('formats single error with path', () => {
      const schema = z.object({
        user: z.object({
          name: z.string().min(3),
        }),
      });
      const error = schema.safeParse({ user: { name: 'ab' } });
      if (!error.success) {
        const formatted = formatZodError(error.error, 'body');
        expect(formatted).toContain('Bad Request: body -');
        expect(formatted).toContain('user.name');
        expect(formatted).toContain('Too small');
      }
    });

    test('formats multiple errors', () => {
      const schema = z.object({
        name: z.string().min(3),
        email: z.string().email(),
        age: z.number().min(18),
      });
      const error = schema.safeParse({ name: 'ab', email: 'invalid', age: 15 });
      if (!error.success) {
        const formatted = formatZodError(error.error, 'body');
        expect(formatted).toContain('Bad Request: body -');
        expect(formatted).toContain('name');
        expect(formatted).toContain('email');
        expect(formatted).toContain('age');
        // Should contain commas separating errors
        expect(formatted.split(',')).toHaveLength(3);
      }
    });

    test('formats nested path errors', () => {
      const schema = z.object({
        users: z.array(
          z.object({
            profile: z.object({
              name: z.string().min(1),
            }),
          }),
        ),
      });
      const error = schema.safeParse({ users: [{ profile: { name: '' } }] });
      if (!error.success) {
        const formatted = formatZodError(error.error, 'body');
        expect(formatted).toContain('Bad Request: body -');
        expect(formatted).toContain('users.0.profile.name');
      }
    });

    test('formats error with empty path', () => {
      const error = z.string().safeParse(123);
      if (!error.success) {
        const formatted = formatZodError(error.error, 'params');
        expect(formatted).toContain('Bad Request: params -');
        expect(formatted).toContain('string');
        expect(formatted).toContain('number');
      }
    });

    test('formats error for different components', () => {
      const error = z.string().min(5).safeParse('abc');
      if (!error.success) {
        expect(formatZodError(error.error, 'params')).toContain('params');
        expect(formatZodError(error.error, 'querystring')).toContain('querystring');
        expect(formatZodError(error.error, 'body')).toContain('body');
        expect(formatZodError(error.error, 'headers')).toContain('headers');
      }
    });
  });

  describe('formatJsonSchemaError', () => {
    test('formats single error without instancePath', () => {
      const errors = [{ instancePath: '', message: 'validation failed' }];
      const formatted = formatJsonSchemaError(errors, 'body');
      expect(formatted).toBe('Bad Request: body - validation failed');
    });

    test('formats single error with instancePath', () => {
      const errors = [{ instancePath: '/name', message: 'must be a string' }];
      const formatted = formatJsonSchemaError(errors, 'body');
      expect(formatted).toBe('Bad Request: body - name: must be a string');
    });

    test('formats multiple errors', () => {
      const errors = [
        { instancePath: '/name', message: 'must be a string' },
        { instancePath: '/email', message: 'must be a valid email' },
        { instancePath: '/age', message: 'must be a number' },
      ];
      const formatted = formatJsonSchemaError(errors, 'body');
      expect(formatted).toContain('Bad Request: body -');
      expect(formatted).toContain('name: must be a string');
      expect(formatted).toContain('email: must be a valid email');
      expect(formatted).toContain('age: must be a number');
      // Should contain commas separating errors
      expect(formatted.split(',')).toHaveLength(3);
    });

    test('formats error with missing message', () => {
      const errors = [{ instancePath: '/name' }];
      const formatted = formatJsonSchemaError(errors, 'body');
      expect(formatted).toBe('Bad Request: body - name: validation failed');
    });

    test('formats error with root instancePath', () => {
      const errors = [{ instancePath: '/', message: 'required property missing' }];
      const formatted = formatJsonSchemaError(errors, 'body');
      expect(formatted).toBe('Bad Request: body - : required property missing');
    });

    test('formats nested instancePath', () => {
      const errors = [{ instancePath: '/user/profile/name', message: 'must be a string' }];
      const formatted = formatJsonSchemaError(errors, 'body');
      expect(formatted).toContain('Bad Request: body -');
      expect(formatted).toContain('user/profile/name');
      expect(formatted).toContain('must be a string');
    });

    test('formats error for different components', () => {
      const errors = [{ instancePath: '/id', message: 'must be a string' }];
      expect(formatJsonSchemaError(errors, 'params')).toContain('params');
      expect(formatJsonSchemaError(errors, 'querystring')).toContain('querystring');
      expect(formatJsonSchemaError(errors, 'body')).toContain('body');
      expect(formatJsonSchemaError(errors, 'headers')).toContain('headers');
    });
  });
});
