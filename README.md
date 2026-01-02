# Fastify File Router

[![NPM Package][npm]][npm-url]
[![NPM Downloads][npm-downloads]][npmtrends-url]
[![Tests][tests-badge]][tests-url]
[![Coverage][coverage-badge]][coverage-url]

This Fastify plugin is inspired by the file based routers in Next.js and Remix.

This allows you to specify all of your server routes using either filenames or a combination of filenames and nested directories.

Supports both JavaScript and TypeScript (on Node 22+.)

## Installation

_NOTE: This is an ESM-only package._

```sh
pnpm install fastify-file-router
```

## Example

You register the plugin using its defaults or by specifying [additional options](#plugin-options):

```ts
const fastify = Fastify();

fastify.register(fastifyFileRouter);
```

You can use any combination of file names and directories. We support either [NextJS](https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes) or [Remix](https://remix.run/docs/en/main/file-conventions/routes) conventions for interpreting filenames and directories.

```
/routes
├── api
│   ├── files
│   │   ├── $id.get.ts // named parameter id, Remix-style
│   │   └── hashes.$.get.ts // wildcard, *, parameter, Remix-style
│   ├── health
│   │   ├── get.test.ts // ignored because it matches a pattern in exclude list
│   │   └── get.ts
│   └── users
│       └── post.ts
└── api.users.$id.get.ts // named parameter id, Remix-style
```

Inside each route handler file, use the `defineRoute()` helper to define your routes. This ensures full type safety for your request parameters, body, querystring, and headers based on the schemas you define.

**Simple Route (`routes/api/health/get.ts`)**

```ts
import { defineRoute } from 'fastify-file-router';

export const route = defineRoute({
  handler: async (request, reply) => {
    reply.status(204).send();
  }
});
```

**Route with Parameters (`routes/api.users.$id.get.ts`)**

```ts
import { defineRoute } from 'fastify-file-router';

export const route = defineRoute({
  schema: {
    params: {
      type: 'object',
      properties: {
        id: { type: 'string' }
      },
      required: ['id']
    } as const
  },
  handler: async (request, reply) => {
    // request.params.id is correctly typed as string
    const { id } = request.params;

    reply.status(200).send({
      id,
      name: 'John Doe',
      email: 'john.doe@microsoft.com'
    });
  }
});
```

**Route with Request Body (`routes/api/users/post.ts`)**

```ts
import { defineRoute } from 'fastify-file-router';

export const route = defineRoute({
  schema: {
    body: {
      type: 'object',
      properties: {
        email: { type: 'string' },
        password: { type: 'string' }
      },
      required: ['email', 'password']
    } as const
  },
  handler: async (request, reply) => {
    // request.body.email and request.body.password are correctly typed
    const { email, password } = request.body;

    reply.status(201).send({ message: 'User created successfully' });
  }
});
```

The above will result in these routes being registered:

```
GET /api/files/:id
GET /api/files/hashes/*
GET /api/health
POST /api/users
GET /api/users/:id
```

## Using Zod Schemas

You can use [Zod](https://zod.dev) schemas directly with `defineRouteZod`, which automatically extracts TypeScript types from Zod schemas using `z.infer` and uses the Zod schemas directly for runtime validation. The Zod schemas are also converted to JSON Schema, but these conversions are **only used for documentation purposes** (such as OpenAPI/Swagger), not for validation. This means you get the full power and better error messages of Zod validation, while still having proper API documentation. This is the recommended approach when using Zod.

**Route with Zod Schemas (`routes/api/users/$id.patch.ts`)**

```ts
import { defineRouteZod } from 'fastify-file-router';
import { z } from 'zod';

export const route = defineRouteZod({
  schema: {
    params: z.object({
      id: z.string().min(1, 'ID is required'),
    }),
    querystring: z.object({
      include: z.enum(['profile', 'settings']).optional(),
      fields: z.string().optional(),
    }),
    body: z.object({
      name: z.string().min(1, 'Name is required').optional(),
      email: z.string().email('Invalid email format').optional(),
      age: z.number().int().min(0).max(150).optional(),
    }),
  },
  handler: async (request, reply) => {
    // All types are automatically inferred from the Zod schemas!
    // request.params.id is typed as string
    // request.query.include is typed as 'profile' | 'settings' | undefined
    // request.body.name, email, age are correctly typed
    const { id } = request.params;
    const { include, fields } = request.query;
    const { name, email, age } = request.body;

    // Type inference verification: these operations prove types are correctly inferred
    const idUpper = id.toUpperCase(); // id is string
    if (include === 'profile') {
      // TypeScript knows include is 'profile' here
    }
    const nameUpper = name?.toUpperCase(); // name is string | undefined
    const ageNextYear = age !== undefined ? age + 1 : undefined; // age is number | undefined

    reply.status(200).send({
      id,
      name: name ?? 'John Doe',
      email: email ?? 'john.doe@example.com',
      age: age ?? 30,
      included: include,
      fields,
    });
  },
});
```

### Mixing Zod and JSON Schema

`defineRouteZod` is an enhanced version of `defineRoute` that allows you to mix Zod schemas and JSON Schema within a single route definition. This gives you the flexibility to use the best validation approach for each field while maintaining full type safety.

**Route with Mixed Schemas (`routes/api/users/$id.put.ts`)**

```ts
import { defineRouteZod } from 'fastify-file-router';
import { z } from 'zod';

export const route = defineRouteZod({
  schema: {
    // Use Zod for complex validation
    params: z.object({
      id: z.string().uuid('ID must be a valid UUID'),
    }),
    // Use JSON Schema for simple validation
    querystring: {
      type: 'object',
      properties: {
        include: { type: 'string', enum: ['profile', 'settings'] },
      },
    } as const,
    // Use Zod for body validation
    body: z.object({
      name: z.string().min(1).optional(),
      email: z.string().email().optional(),
    }),
    // Use JSON Schema for headers
    headers: {
      type: 'object',
      properties: {
        'x-api-key': { type: 'string' },
      },
      required: ['x-api-key'],
    } as const,
    // Mix response schemas too
    response: {
      200: z.object({ id: z.string(), name: z.string() }), // Zod
      400: {
        type: 'object',
        properties: { error: { type: 'string' } },
        required: ['error'],
      } as const, // JSON Schema
    },
  },
  handler: async (request, reply) => {
    // Types are correctly inferred from both schema types!
    // request.params.id is typed as string (from Zod)
    // request.query.include is typed correctly (from JSON Schema)
    // request.body.name and email are typed (from Zod)
    const { id } = request.params;
    const { include } = request.query;
    const { name, email } = request.body;

    reply.status(200).send({ id, name, email, included: include });
  },
});
```

When using mixed schemas, both Zod and JSON Schema fields are validated in the `preValidation` hook for consistent error handling. Type inference works seamlessly, extracting types from Zod schemas using `z.infer` and from JSON Schema using `FromSchema`.

## Custom Schema Types

When using Fastify plugins that extend the schema with additional properties (such as OpenAPI/Swagger plugins), you can use `defineRoute` with a custom schema type that extends `FastifySchema`. This allows you to add plugin-specific metadata while maintaining full type safety.

**Example: Using OpenAPI Schema Extensions**

First, define your extended schema type:

```ts
import type { FastifySchema } from 'fastify';

export interface OpenAPIFastifySchema extends FastifySchema {
  description?: string;
  summary?: string;
  tags?: string[];
  operationId?: string;
  security?: Array<Record<string, string[]>>;
}
```

Then use it with `defineRoute` using the `satisfies` operator to ensure type safety while preserving inference:

```ts
import { defineRoute } from 'fastify-file-router';
import type { OpenAPIFastifySchema } from '../types/OpenAPIFastifySchema.js';

const paramsSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' }
  },
  required: ['id']
} as const;

const bodySchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    email: { type: 'string', format: 'email' }
  },
  required: ['name', 'email']
} as const;

export const route = defineRoute({
  schema: {
    description: 'Update a user by ID. Updates the user name and/or email.',
    summary: 'Update user',
    tags: ['users'],
    operationId: 'update-user',
    security: [{ jwtToken: [] }, { secretToken: [] }],
    params: paramsSchema,
    body: bodySchema,
    response: {
      200: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' }
        }
      },
      404: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          message: { type: 'string' }
        }
      }
    }
  } satisfies OpenAPIFastifySchema,
  handler: async (request, reply) => {
    // request.params.id, request.body.name, and request.body.email are all correctly typed
    const { id } = request.params;
    const { name, email } = request.body;
    
    reply.status(200).send({ id, name, email });
  }
});
```

Using `satisfies OpenAPIFastifySchema` ensures that:
- Your schema conforms to the extended schema type (including OpenAPI properties)
- Type inference works correctly for `request.params`, `request.body`, `request.query`, and `request.headers`
- You get full IntelliSense support for both standard Fastify schema properties and your custom extensions
- TypeScript will error if your schema doesn't match the extended type

**Alternative: Using Generic Type Parameter**

You can also use the generic type parameter syntax `defineRoute<OpenAPIFastifySchema>()`, but note that this may require explicit type assertions for the schema object to preserve type inference for request parameters.

## Plugin Options

This plugin supports the following customizable options.

**mount**

- Specifies where the routes should be mounted on the server.
- Default: `"/"`

**routesDirs**

- An array of local directories where the routes are located relative to the build root folder.
- Default: `["./routes", "./src/routes"]`

**buildRoot**

- The root folder of the source code that should be loaded. If you are transpiling your source code, you should set this to the build output directory, e.g., dist or build.
- Default: `"."` (current working directory, assuming no transpilation)

**extensions**

- An array of file extensions for the route files. Files without matching extensions are ignored
- Default: `[".js", ".ts", ".jsx", ".tsx"]`

**exclude**

- An array of regexs which if matched against a filename or directory, lead it to being ignored/skipped over.
- Default: `[ /^[\.|_].*/, /\.(test|spec)\.[jt]s$/, /__(test|spec)__/, /\.d\.ts$/ ]`

**convention**

- The file/folder naming convention to use, can be either Remix or NextJS style.
- Default: `"remix"`

**logLevel**

- The verbosity level for the plugin.
- Default: `"info"`

**logRoutes**

- Output the routes being registered and from which files.
- Default: `false`

## Plugin Development (for Contributors only)

If you want to contribute, just check out [this git project](https://github.com/bhouston/fastify-file-router) and run the following commands to get going:

```sh
# install dependencies
pnpm install

# hot-reloading development server
pnpm dev

# build & start server
pnpm build && pnpm start

# prettify/lint via biome
pnpm biome check --write


# tests
pnpm vitest

# clean everything, should be like doing a fresh git checkout of the repo.
pnpm clean

# publish the npm package
pnpm make-release
```

[npm]: https://img.shields.io/npm/v/fastify-file-router
[npm-url]: https://www.npmjs.com/package/fastify-file-router
[npm-downloads]: https://img.shields.io/npm/dw/fastify-file-router
[npmtrends-url]: https://www.npmtrends.com/fastify-file-router
[tests-badge]: https://github.com/bhouston/fastify-file-router/workflows/Tests/badge.svg
[tests-url]: https://github.com/bhouston/fastify-file-router/actions/workflows/test.yml
[coverage-badge]: https://codecov.io/gh/bhouston/fastify-file-router/branch/main/graph/badge.svg
[coverage-url]: https://codecov.io/gh/bhouston/fastify-file-router
