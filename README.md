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
npm install fastify-file-router
```

If you plan to use `defineRoute()` for type-safe routes, you'll also need to install `json-schema-to-ts`:

```sh
npm install json-schema-to-ts
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

Inside each route handler file, you make the default export the route handler. Here is a simple example:

```ts
// routes/api/health/get.ts

import type { FastifyReply, FastifyRequest } from 'fastify';

export default async function handler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  reply.status(204).send();
}
```

If you want to specify a schema, you can optionally export it as well. There are two ways to define routes with schemas:

### Using `defineRoute()` (Recommended)

The `defineRoute()` helper automatically infers types from your JSON schemas, eliminating the need for manual type assertions:

```ts
// routes/api.users.$id.get.ts

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
    // request.params.id is automatically typed as string - no manual type assertion needed!
    const { id } = request.params;

    reply.status(200).send({
      id,
      name: 'John Doe',
      email: 'john.doe@microsoft.com'
    });
  }
});
```

### Legacy Pattern (Still Supported)

You can also use the traditional pattern with separate schema and handler exports:

```ts
// routes/api.users.$id.get.ts

import type { FastifyReply, FastifyRequest } from 'fastify';
import type { RouteSchema } from 'fastify-file-router';
import type { FromSchema } from 'json-schema-to-ts';

const ParamsSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' }
  },
  required: ['id']
} as const;

type ParamsSchema = FromSchema<typeof ParamsSchema>;

export const schema: RouteSchema = {
  params: ParamsSchema
};

export default async function handler(
  request: FastifyRequest<{ Params: ParamsSchema }>,
  reply: FastifyReply
) {
  const { id } = request.params as ParamsSchema;

  reply.status(200).send({
    id,
    name: 'John Doe',
    email: 'john.doe@microsoft.com'
  });
}
```

**Benefits of `defineRoute()`:**
- Automatic type inference - no need to manually create TypeScript types from schemas
- No type assertions required - `request.params`, `request.body`, `request.query` are automatically typed
- Cleaner code - less boilerplate and fewer imports needed
- Type safety - TypeScript will catch errors at compile time if you try to access properties that don't exist in your schema

The above will result in these routes being registered:

```
GET /api/files/:id
GET /api/files/hashes/*
GET /api/health
POST /api/users
GET /api/users/:id
```

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
npm install

# hot-reloading development server
npm run dev

# build & start server
npm run build && npm run start

# prettify
npm run format

# eslint
npm run lint

# build and run tests
npm run test

# clean everything, should be like doing a fresh git checkout of the repo.
npm run clean

# publish the npm package
npm run publish
```

### Publishing

**IMPORTANT:** Always use `npm run publish` from the package directory (`packages/fastify-file-router/`), **NOT** `pnpm publish` from the root.

The publish script ensures that the README.md file is properly included in the npm package. Using `pnpm publish` directly will publish without the README.

**Steps to publish a new version:**

1. **Bump the version** using the version script from the repository root:
   ```sh
   node scripts/version.js patch  # for patch versions
   # or
   node scripts/version.js minor  # for minor versions
   # or
   node scripts/version.js major  # for major versions
   ```
   This will update the version in `packages/fastify-file-router/package.json`, commit the change, and create a git tag.

2. **Publish to npm** from the package directory:
   ```sh
   cd packages/fastify-file-router
   npm run publish
   ```
   This will:
   - Build the publish folder with all necessary files
   - Copy the README.md from the repository root
   - Verify that README.md exists in the publish folder
   - Publish to npm with public access

3. **Push the commits and tags** to the repository:
   ```sh
   git push
   git push --tags
   ```

**Why this matters:** The publish script copies files to a `publish/` folder and explicitly includes the README.md. Using `pnpm publish` directly will skip this step and publish without the README, which is why we always use `npm run publish` from the package directory.

Underneath the hood, we are using [NX](https://nx.dev) to manage the monorepo and shared scripts.

[npm]: https://img.shields.io/npm/v/fastify-file-router
[npm-url]: https://www.npmjs.com/package/fastify-file-router
[npm-downloads]: https://img.shields.io/npm/dw/fastify-file-router
[npmtrends-url]: https://www.npmtrends.com/fastify-file-router
[tests-badge]: https://github.com/bhouston/fastify-file-router/workflows/Tests/badge.svg
[tests-url]: https://github.com/bhouston/fastify-file-router/actions/workflows/test.yml
[coverage-badge]: https://codecov.io/gh/bhouston/fastify-file-router/branch/main/graph/badge.svg
[coverage-url]: https://codecov.io/gh/bhouston/fastify-file-router
