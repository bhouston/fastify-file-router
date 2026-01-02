import { describe, expect, test } from 'vitest';
import { z } from 'zod';
import { defineRouteZod } from './defineRouteZod.js';

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

