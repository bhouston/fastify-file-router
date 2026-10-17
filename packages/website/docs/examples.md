---
sidebar_position: 4
---

# Examples

These examples build on the [getting started](getting-started.md) application and its `src/routes` directory. They use named `route` exports and the default Remix convention.

## Paginate a collection

Create `src/routes/products.get.ts`:

```ts
import { defineRouteZod } from 'fastify-file-router';
import { z } from 'zod';

const products = [
  { id: '1', name: 'Notebook' },
  { id: '2', name: 'Pencil' },
  { id: '3', name: 'Eraser' },
];

export const route = defineRouteZod({
  schema: {
    querystring: z.object({
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(20),
    }),
  },
  handler: async (request) => {
    const { page, pageSize } = request.query;
    const start = (page - 1) * pageSize;
    return {
      items: products.slice(start, start + pageSize),
      page,
      pageSize,
      total: products.length,
    };
  },
});
```

Request `GET /products?page=2&pageSize=1` to return the pencil. The same schema supplies defaults, coerces URL strings to numbers, rejects invalid inputs, and infers numeric handler types.

## Return a missing-resource response

Create `src/routes/products.$id.get.ts`:

```ts
import { defineRoute } from 'fastify-file-router';

export const route = defineRoute({
  schema: {
    params: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    } as const,
  },
  handler: async (request, reply) => {
    // Replace this example lookup with your database or service.
    if (request.params.id !== '1') {
      return reply.code(404).send({ error: 'Product not found' });
    }
    return { id: '1', name: 'Notebook' };
  },
});
```

The filename defines `:id`; the schema makes `request.params.id` a validated string. Keep persistence and business rules in ordinary imported modules so route files stay focused on HTTP behavior.

## Test without opening a port

Fastify's injection API starts the plugin and exercises discovery, validation, and handlers in-process. For example, run this TypeScript file from your project root after adding the products route above:

```ts
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { fastifyFileRouter } from 'fastify-file-router';

const app = Fastify();
await app.register(fastifyFileRouter, { routesDirs: ['./src/routes'] });

try {
  const response = await app.inject({
    method: 'GET',
    url: '/products?page=2&pageSize=1',
  });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json().items, [{ id: '2', name: 'Pencil' }]);

  const invalid = await app.inject({ method: 'GET', url: '/products?page=0' });
  assert.equal(invalid.statusCode, 400);
} finally {
  await app.close();
}
```

## Inspect route loading

```ts
import Fastify from 'fastify';
import { fastifyFileRouter } from 'fastify-file-router';

const app = Fastify({ logger: true });
await app.register(fastifyFileRouter, {
  routesDirs: ['./src/routes'],
  logRoutes: true,
  maxConcurrentTasks: 4,
  profile: {
    enabled: true,
    slowestRoutesCount: 10,
    logIndividualRoutes: false,
  },
});
await app.ready();

console.log(app.printRoutes());
await app.close();
```

Profiling reports overall startup timing and the slowest route files, including import, preparation, and registration timings. Use it to find expensive top-level module initialization. Set `logIndividualRoutes: true` when you need timing for every file.

`maxConcurrentTasks` limits concurrent directory scans and route imports. Increase or decrease it after measuring your application's startup behavior. This setting controls startup work, not the number of HTTP requests Fastify can serve.
