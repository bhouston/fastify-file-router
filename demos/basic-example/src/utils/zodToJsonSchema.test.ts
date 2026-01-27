import { describe, expect, test } from 'vitest';
import { z } from 'zod';
import { toJsonSchema } from './zodToJsonSchema.js';

describe('toJsonSchema', () => {
  test('converts basic Zod schema to JSON Schema', () => {
    const schema = z.object({
      id: z.string(),
      name: z.string(),
      age: z.number(),
    });

    const jsonSchema = toJsonSchema(schema);

    expect(jsonSchema).toHaveProperty('type', 'object');
    expect(jsonSchema).toHaveProperty('properties');
    expect(jsonSchema).not.toHaveProperty('$schema');

    const properties = jsonSchema.properties as Record<string, unknown>;
    expect(properties.id).toHaveProperty('type', 'string');
    expect(properties.name).toHaveProperty('type', 'string');
    expect(properties.age).toHaveProperty('type', 'number');
  });

  test('converts iso datetime schema to string (format may be present)', () => {
    const schema = z.object({
      createdAt: z.iso.datetime(),
      updatedAt: z.iso.datetime(),
    });

    const jsonSchema = toJsonSchema(schema);

    const properties = jsonSchema.properties as Record<string, unknown>;
    expect(properties.createdAt).toBeDefined();
    expect(properties.createdAt).toHaveProperty('type', 'string');
    // format: 'date-time' may be present - that's fine, Fastify supports it
    expect(properties.updatedAt).toBeDefined();
    expect(properties.updatedAt).toHaveProperty('type', 'string');
  });

  test('handles nested schemas', () => {
    const schema = z.object({
      user: z.object({
        name: z.string(),
        email: z.email(),
      }),
      metadata: z.object({
        createdAt: z.iso.datetime(),
      }),
    });

    const jsonSchema = toJsonSchema(schema);

    expect(jsonSchema).toHaveProperty('type', 'object');
    const properties = jsonSchema.properties as Record<string, unknown>;
    expect(properties.user).toHaveProperty('type', 'object');
    expect(properties.metadata).toHaveProperty('type', 'object');

    const userProperties = (properties.user as Record<string, unknown>).properties as Record<string, unknown>;
    expect(userProperties.name).toHaveProperty('type', 'string');
    expect(userProperties.email).toHaveProperty('type', 'string');
  });

  test('handles arrays', () => {
    const schema = z.object({
      tags: z.array(z.string()),
      numbers: z.array(z.number()),
    });

    const jsonSchema = toJsonSchema(schema);

    const properties = jsonSchema.properties as Record<string, unknown>;
    expect(properties.tags).toHaveProperty('type', 'array');
    expect(properties.numbers).toHaveProperty('type', 'array');

    const tagsItems = (properties.tags as Record<string, unknown>).items as Record<string, unknown>;
    expect(tagsItems).toHaveProperty('type', 'string');
  });

  test('handles optional fields', () => {
    const schema = z.object({
      name: z.string(),
      email: z.email().optional(),
    });

    const jsonSchema = toJsonSchema(schema);

    const properties = jsonSchema.properties as Record<string, unknown>;
    expect(properties.name).toBeDefined();
    expect(properties.email).toBeDefined();
  });

  test('handles union types', () => {
    const schema = z.object({
      value: z.union([z.string(), z.number()]),
    });

    const jsonSchema = toJsonSchema(schema);

    const properties = jsonSchema.properties as Record<string, unknown>;
    expect(properties.value).toBeDefined();
  });

  test('handles enum types', () => {
    const schema = z.object({
      status: z.enum(['active', 'inactive', 'pending']),
    });

    const jsonSchema = toJsonSchema(schema);

    const properties = jsonSchema.properties as Record<string, unknown>;
    expect(properties.status).toBeDefined();
  });

  test('removes $schema property', () => {
    const schema = z.object({
      name: z.string(),
    });

    const jsonSchema = toJsonSchema(schema);

    expect(jsonSchema).not.toHaveProperty('$schema');
  });

  test('handles empty object schema', () => {
    const schema = z.object({});

    const jsonSchema = toJsonSchema(schema);

    expect(jsonSchema).toHaveProperty('type', 'object');
    expect(jsonSchema).toHaveProperty('properties');
  });

  test('handles iso datetime in nested object', () => {
    const schema = z.object({
      user: z.object({
        profile: z.object({
          createdAt: z.iso.datetime(),
        }),
      }),
    });

    const jsonSchema = toJsonSchema(schema);

    const properties = jsonSchema.properties as Record<string, unknown>;
    const userProperties = (properties.user as Record<string, unknown>).properties as Record<string, unknown>;
    const profileProperties = (userProperties.profile as Record<string, unknown>).properties as Record<string, unknown>;

    expect(profileProperties.createdAt).toBeDefined();
    expect(profileProperties.createdAt).toHaveProperty('type', 'string');
    // format: 'date-time' may be present - that's fine
  });
});
