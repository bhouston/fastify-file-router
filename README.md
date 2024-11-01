# Fastify File Router

This Fastify plugin is inspired by the file based routers in Next.js and Remix.

This allows you to specify all of your server routes using either filenames or a combination of filenames and nested directories.

Supports both JavaScript and TypeScript (on Node 22+.)

## Installation

_NOTE: This is an ESM-only package._

```sh
npm install fastify-file-router
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
│   ├── ├── $id.get.ts // named parameter id, Remix-style
│   │   └── hashes.$.get.ts // wildcard, *, parameter, Remix-style
│   ├── health
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

If you want to specify a schema, you can optionally export it as well:

```ts
// routes/api.users.$id.get.ts

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
  request: FastifyRequest,
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

- An array of file extensions for the route files.
- Default: `[".js", ".ts", ".jsx", ".tsx"]`

**convention**

- The file/folder naming convention to use, can be either Remix or NextJS style.
- Default: `"remix"`

**logLevel**

- The verbosity level for the plugin.
- Default: `"info"`

## Plugin Development (for Contributors only)

If you want to contribute, just check out [this git project](https://github.com/bhouston/fastify-file-router) and run the following commands to get going:

```sh
# install dependencies
npm install

# hot-reloading development server
npm run dev

# build & start server
npm run build && npm run start

# publish the npm package
npm run publish
```
