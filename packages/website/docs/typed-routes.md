---
sidebar_position: 3
---

# Typed routes

Write a request schema once and use it for both runtime validation and TypeScript inference. `defineRoute` accepts JSON Schema. `defineRouteZod` accepts Zod schemas, JSON Schema, or a mixture of both.

Both helpers infer request `params`, `body`, `query`, and `headers` from the corresponding schema fields. An omitted request schema leaves that component unknown. The helpers do not make every response sent with `reply.send` statically type checked; use response schemas and appropriate runtime validation for your output contract.

## JSON Schema

Create `src/routes/users.$id.get.ts`:

```ts
import { defineRoute } from 'fastify-file-router';

export const route = defineRoute({
  schema: {
    params: {
      type: 'object',
      properties: { id: { type: 'string', minLength: 1 } },
      required: ['id'],
      additionalProperties: false,
    } as const,
    querystring: {
      type: 'object',
      properties: { include: { type: 'string', enum: ['profile', 'settings'] } },
    } as const,
  },
  handler: async (request) => {
    const id = request.params.id; // string
    const include = request.query.include; // 'profile' | 'settings' | undefined
    return { id, include: include ?? 'profile' };
  },
});
```

Use `as const` on JSON Schema objects to preserve literal types such as `'object'` and required-property names. The helper uses `json-schema-to-ts` to infer request types; Fastify handles standard JSON Schema validation for `defineRoute` routes.

## Zod

Create `src/routes/users/post.ts`:

```ts
import { defineRouteZod } from 'fastify-file-router';
import { z } from 'zod';

export const route = defineRouteZod({
  schema: {
    body: z.object({
      name: z.string().min(1),
      email: z.email(),
    }),
    response: {
      201: z.object({ id: z.string(), name: z.string(), email: z.email() }),
    },
  },
  handler: async (request, reply) => {
    const { name, email } = request.body;
    return reply.code(201).send({ id: 'user-123', name, email });
  },
});
```

Zod request schemas are validated directly in a `preValidation` hook. Parsed data replaces the corresponding request component. Validation failures return HTTP 400 with an `error` message identifying the component and issues.

URL parameters and query values arrive as strings. For numeric query inputs, choose a coercing schema such as `z.coerce.number().int().min(1)` rather than `z.number()`.

Zod schemas are also converted to JSON Schema for documentation integrations. Register your own OpenAPI/Swagger plugin to produce an API specification; this router does not install one. Prefer JSON-compatible date strings such as `z.iso.datetime()` over `z.date()` for documented API payloads.

## Mix schema styles

Migration can happen one component at a time:

```ts
import { defineRouteZod } from 'fastify-file-router';
import { z } from 'zod';

// src/routes/users.$id.patch.ts
export const route = defineRouteZod({
  schema: {
    params: z.object({ id: z.string().min(1) }),
    body: {
      type: 'object',
      properties: { name: { type: 'string', minLength: 1 } },
      required: ['name'],
      additionalProperties: false,
    } as const,
  },
  handler: async (request) => ({
    id: request.params.id,
    name: request.body.name,
  }),
});
```

With `defineRouteZod`, mixed request schemas are validated in the router's `preValidation` hook. Zod components use Zod directly; JSON Schema components use Ajv. Keep Ajv installed when using this path.

## Validate responses

Zod response validation is opt-in:

```ts
await app.register(fastifyFileRouter, {
  zodResponseValidation: true,
});
```

For responses handled by Fastify's `preSerialization` hook, the router checks the Zod schema for the exact response status code. A failed check produces HTTP 500. This option applies only to Zod response schemas. JSON Schema response serialization is distinct from validation; use `@fastify/response-validation` when you also need JSON Schema response checks.

## Add schema metadata

Preserve inference while checking metadata with `satisfies`:

```ts
import type { FastifySchema } from 'fastify';
import { defineRoute } from 'fastify-file-router';

type DocumentedSchema = FastifySchema & {
  summary?: string;
  tags?: string[];
};

export const route = defineRoute({
  schema: {
    summary: 'Check service health',
    tags: ['operations'],
  } satisfies DocumentedSchema,
  handler: async () => ({ status: 'ok' }),
});
```

Metadata is passed through to Fastify for plugins that understand it. Use `satisfies` instead of widening the entire schema to `FastifySchema`, which can lose the literals needed for request inference.
