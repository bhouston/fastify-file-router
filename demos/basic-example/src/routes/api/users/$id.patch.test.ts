import type { FastifyInstance } from 'fastify';
import { beforeAll, describe, expect, test } from 'vitest';
import { getApp } from '../../../buildFastify.ts';

const ERROR_PATTERN = /^Bad Request: params - .*id.*/;

describe('PATCH /api/users/:id', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await getApp();
  });

  test('updates user with partial data', async () => {
    const response = await app.inject({
      method: 'patch',
      url: '/api/users/user-123',
      payload: {
        name: 'Jane Doe',
      },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('id', 'user-123');
    expect(body).toHaveProperty('name', 'Jane Doe');
    expect(body).toHaveProperty('email'); // Default value
    expect(body).toHaveProperty('age'); // Default value
  });

  test('updates user with all fields', async () => {
    const response = await app.inject({
      method: 'patch',
      url: '/api/users/user-456',
      payload: {
        name: 'Bob Smith',
        email: 'bob.smith@example.com',
        age: 35,
      },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('id', 'user-456');
    expect(body).toHaveProperty('name', 'Bob Smith');
    expect(body).toHaveProperty('email', 'bob.smith@example.com');
    expect(body).toHaveProperty('age', 35);
  });

  test('handles query parameters', async () => {
    const response = await app.inject({
      method: 'patch',
      url: '/api/users/user-123?include=profile&fields=name,email',
      payload: {
        name: 'Jane Doe',
      },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('included', 'profile');
    expect(body).toHaveProperty('fields', 'name,email');
  });

  test('validates enum query parameter', async () => {
    const response = await app.inject({
      method: 'patch',
      url: '/api/users/user-123?include=invalid',
      payload: {
        name: 'Jane Doe',
      },
    });
    // Should fail validation for invalid enum value
    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toContain('Bad Request: querystring');
    expect(body.error).toContain('include');
  });

  test('validates email format', async () => {
    const response = await app.inject({
      method: 'patch',
      url: '/api/users/user-123',
      payload: {
        email: 'invalid-email',
      },
    });
    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toContain('Bad Request: body');
    expect(body.error).toContain('email');
    expect(body.error).toContain('Invalid email format');
  });

  test('validates age range', async () => {
    const response = await app.inject({
      method: 'patch',
      url: '/api/users/user-123',
      payload: {
        age: 200, // Exceeds max of 150
      },
    });
    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toContain('Bad Request: body');
    expect(body.error).toContain('age');
  });

  test('validates id parameter is not empty', async () => {
    const response = await app.inject({
      method: 'patch',
      url: '/api/users/', // Empty id
      payload: {
        name: 'Jane Doe',
      },
    });
    // Should fail validation because id is required and min length is 1
    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toContain('Bad Request: params');
  });

  test('validates params with empty string id', async () => {
    const response = await app.inject({
      method: 'patch',
      url: '/api/users/',
      payload: {
        name: 'Jane Doe',
      },
    });
    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toMatch(ERROR_PATTERN);
  });

  test('validates body with invalid email and age', async () => {
    const response = await app.inject({
      method: 'patch',
      url: '/api/users/user-123',
      payload: {
        email: 'not-an-email',
        age: -5, // Negative age
      },
    });
    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toContain('Bad Request: body');
    // Should contain both validation errors
    expect(body.error).toContain('email');
    expect(body.error).toContain('age');
  });

  test('validates body with extra fields (strictObject)', async () => {
    const response = await app.inject({
      method: 'patch',
      url: '/api/users/user-123',
      payload: {
        name: 'Jane Doe',
        extraField: 'not allowed', // Not in schema
      },
    });
    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toContain('Bad Request: body');
  });

  test('works with no body (all optional fields)', async () => {
    const response = await app.inject({
      method: 'patch',
      url: '/api/users/user-123',
      payload: {},
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('id', 'user-123');
    expect(body).toHaveProperty('name'); // Default value
    expect(body).toHaveProperty('email'); // Default value
    expect(body).toHaveProperty('age'); // Default value
  });
});
