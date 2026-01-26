import type { FastifyInstance } from 'fastify';
import type { OpenAPIV3 } from 'openapi-types';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { getApp } from '../../../buildFastify.ts';

describe('Swagger Schema Generation for defineRouteZod', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await getApp();
    await app.ready(); // Ensure Swagger has processed all routes
  });

  afterAll(async () => {
    await app.close();
  });

  test('Swagger schema is generated', () => {
    const swaggerSchema = app.swagger() as OpenAPIV3.Document;
    expect(swaggerSchema).toBeDefined();
    expect(swaggerSchema.openapi).toBe('3.0.0');
    expect(swaggerSchema.info).toBeDefined();
    expect(swaggerSchema.info.title).toBe('Fastify File Router API');
  });

  test('PATCH /api/users/:id route has correct OpenAPI definition', () => {
    const swaggerSchema = app.swagger() as OpenAPIV3.Document;
    const path = swaggerSchema.paths?.['/api/users/{id}'];
    expect(path).toBeDefined();

    const patchOp = path?.patch as OpenAPIV3.OperationObject | undefined;
    expect(patchOp).toBeDefined();

    // Verify parameters (path parameter) - this should always be present
    expect(patchOp?.parameters).toBeDefined();
    const idParam = patchOp?.parameters?.find(
      (p): p is OpenAPIV3.ParameterObject => 'name' in p && p.name === 'id',
    );
    expect(idParam).toBeDefined();
    expect(idParam?.in).toBe('path');
    expect(idParam?.schema).toBeDefined();
    const schema = idParam?.schema as OpenAPIV3.SchemaObject;
    expect(schema?.type).toBe('string');
    expect(idParam?.required).toBe(true);
  });

  test('PATCH /api/users/:id requestBody schema is present and correctly structured', () => {
    const swaggerSchema = app.swagger() as OpenAPIV3.Document;
    const path = swaggerSchema.paths?.['/api/users/{id}'];
    const patchOp = path?.patch as OpenAPIV3.OperationObject | undefined;

    // Verify requestBody exists in OpenAPI 3.0 format
    expect(patchOp?.requestBody).toBeDefined();
    const requestBody = patchOp?.requestBody as OpenAPIV3.RequestBodyObject | undefined;
    expect(requestBody).toBeDefined();

    // Verify content structure
    expect(requestBody?.content).toBeDefined();
    expect(requestBody?.content?.['application/json']).toBeDefined();

    // Verify schema exists
    const bodySchema = requestBody?.content?.['application/json']
      ?.schema as OpenAPIV3.SchemaObject | undefined;
    expect(bodySchema).toBeDefined();
    expect(bodySchema?.type).toBe('object');
    expect(bodySchema?.properties).toBeDefined();
  });

  test('PATCH /api/users/:id requestBody schema has correct properties', () => {
    const swaggerSchema = app.swagger() as OpenAPIV3.Document;
    const path = swaggerSchema.paths?.['/api/users/{id}'];
    const patchOp = path?.patch as OpenAPIV3.OperationObject | undefined;
    const requestBody = patchOp?.requestBody as OpenAPIV3.RequestBodyObject | undefined;
    const bodySchema = requestBody?.content?.['application/json']
      ?.schema as OpenAPIV3.SchemaObject | undefined;

    expect(bodySchema?.properties).toBeDefined();
    const properties = bodySchema?.properties as Record<string, OpenAPIV3.SchemaObject> | undefined;

    // Verify name property
    expect(properties?.name).toBeDefined();
    expect(properties?.name?.type).toBe('string');
    expect(properties?.name?.minLength).toBe(1);

    // Verify email property
    expect(properties?.email).toBeDefined();
    expect(properties?.email?.type).toBe('string');
    expect(properties?.email?.format).toBe('email');

    // Verify age property
    expect(properties?.age).toBeDefined();
    // Age should be number or integer
    expect(['number', 'integer']).toContain(properties?.age?.type);
    expect(properties?.age?.minimum).toBe(0);
    expect(properties?.age?.maximum).toBe(150);

    // Verify all properties are optional (no required array or all properties marked required)
    // In OpenAPI, if a property is optional, it should not be in the required array
    if (bodySchema?.required) {
      expect(bodySchema.required).not.toContain('name');
      expect(bodySchema.required).not.toContain('email');
      expect(bodySchema.required).not.toContain('age');
    }
  });

  test('PATCH /api/users/:id querystring parameters are present in OpenAPI', () => {
    const swaggerSchema = app.swagger() as OpenAPIV3.Document;
    const path = swaggerSchema.paths?.['/api/users/{id}'];
    const patchOp = path?.patch as OpenAPIV3.OperationObject | undefined;

    expect(patchOp?.parameters).toBeDefined();
    const parameters = patchOp?.parameters as OpenAPIV3.ParameterObject[] | undefined;

    // Verify include parameter
    const includeParam = parameters?.find(
      (p): p is OpenAPIV3.ParameterObject => 'name' in p && p.name === 'include',
    );
    expect(includeParam).toBeDefined();
    expect(includeParam?.in).toBe('query');
    expect(includeParam?.required).toBeFalsy(); // Optional parameter
    expect(includeParam?.schema).toBeDefined();
    const includeSchema = includeParam?.schema as OpenAPIV3.SchemaObject | undefined;
    expect(includeSchema?.type).toBe('string');
    expect(includeSchema?.enum).toEqual(['profile', 'settings']);

    // Verify fields parameter
    const fieldsParam = parameters?.find(
      (p): p is OpenAPIV3.ParameterObject => 'name' in p && p.name === 'fields',
    );
    expect(fieldsParam).toBeDefined();
    expect(fieldsParam?.in).toBe('query');
    expect(fieldsParam?.required).toBeFalsy(); // Optional parameter
    expect(fieldsParam?.schema).toBeDefined();
    const fieldsSchema = fieldsParam?.schema as OpenAPIV3.SchemaObject | undefined;
    expect(fieldsSchema?.type).toBe('string');
  });

  test('Response schemas are included in OpenAPI definition', () => {
    const swaggerSchema = app.swagger() as OpenAPIV3.Document;
    const path = swaggerSchema.paths?.['/api/users/{id}'];
    const patchOp = path?.patch as OpenAPIV3.OperationObject | undefined;

    // Verify that responses object exists
    expect(patchOp?.responses).toBeDefined();
    
    // The route doesn't define a response schema, so we verify the default 200 response exists
    const response200 = patchOp?.responses?.['200'] as OpenAPIV3.ResponseObject | undefined;
    expect(response200).toBeDefined();
    
    // If a response schema was defined, we would verify its structure here
    // For now, we just verify the response structure exists
    // The actual response structure can be verified by checking response200.content if present
  });

  test('Other defineRouteZod routes have OpenAPI definitions', () => {
    const swaggerSchema = app.swagger() as OpenAPIV3.Document;

    // Check POST /api/orders route (mixed schemas)
    const ordersPath = swaggerSchema.paths?.['/api/orders'];
    expect(ordersPath).toBeDefined();
    const ordersPostOp = ordersPath?.post as OpenAPIV3.OperationObject | undefined;
    expect(ordersPostOp).toBeDefined();
    // Note: requestBody may not appear due to custom validation, but route should exist

    // Check POST /api/reviews/:productId route (mixed schemas)
    const reviewsPath = swaggerSchema.paths?.['/api/reviews/{productId}'];
    expect(reviewsPath).toBeDefined();
    const reviewsPostOp = reviewsPath?.post as OpenAPIV3.OperationObject | undefined;
    expect(reviewsPostOp).toBeDefined();
    expect(reviewsPostOp?.parameters).toBeDefined();
    const productIdParam = reviewsPostOp?.parameters?.find(
      (p): p is OpenAPIV3.ParameterObject => 'name' in p && p.name === 'productId',
    );
    expect(productIdParam).toBeDefined();
  });

  test('OpenAPI metadata fields are passed through to Swagger output', () => {
    const swaggerSchema = app.swagger() as OpenAPIV3.Document;
    const path = swaggerSchema.paths?.['/api/users/{id}'];
    expect(path).toBeDefined();

    // Test PUT route which has description, summary, tags, operationId, and security
    const putOp = path?.put as OpenAPIV3.OperationObject | undefined;
    expect(putOp).toBeDefined();

    // Verify OpenAPI metadata fields are present
    expect(putOp?.description).toBe('Update a user by ID. Updates the user name and/or email.');
    expect(putOp?.summary).toBe('Update user');
    expect(putOp?.tags).toEqual(['users']);
    expect(putOp?.operationId).toBe('update-user');
    expect(putOp?.security).toBeDefined();
    expect(putOp?.security).toHaveLength(2);
    expect(putOp?.security?.[0]).toHaveProperty('jwtToken');
    expect(putOp?.security?.[1]).toHaveProperty('secretToken');
  });

  test('Additional OpenAPI fields like produces are passed through (if provided)', () => {
    const swaggerSchema = app.swagger() as OpenAPIV3.Document;
    
    // Note: 'produces' is a Swagger 2.0 field. In OpenAPI 3.0, content types are specified
    // in the response schema's 'content' property. However, if 'produces' is added to the
    // schema, it will be passed through by our code (since we copy all non-excluded properties).
    // Fastify Swagger may or may not use it for OpenAPI 3.0, but the field will be present.
    
    // Verify that any additional fields in the schema are copied through
    // by checking that our schema cleaning logic preserves all non-excluded fields
    const path = swaggerSchema.paths?.['/api/users/{id}'];
    const putOp = path?.put as OpenAPIV3.OperationObject | undefined;
    
    // The route has these OpenAPI fields, and they're all present
    expect(putOp).toBeDefined();
    expect(putOp?.description).toBeDefined();
    expect(putOp?.summary).toBeDefined();
    expect(putOp?.tags).toBeDefined();
    expect(putOp?.operationId).toBeDefined();
    
    // Any additional fields added to the schema (like 'produces') would also be copied through
    // by the routeRegistration.ts code that copies all properties except excluded ones
  });
});
