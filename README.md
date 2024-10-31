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

You register the plugin like this:

```ts
const fastify = Fastify();

fastify.register(fastifyFileRouter);
```

You can use any combination of file names and directories. Both are valid. We use [Remix-style conventions](https://remix.run/docs/en/main/file-conventions/routes) for interpreting filenames.

```
/routes
├── api
│   ├── files
│   │   └── $.get.ts // wildcard, *, parameter
│   ├── health
│   │   └── get.ts
│   └── users
│       └── post.ts
└── api.users.$id.get.ts // named parameter id
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
GET /api/health
POST /api/users
GET /api/users/:id
```

## Development

```sh
# install dependencies
npm install

# hot-reloading development server
npm run dev

# build & start server
npm run build && npm run start
```
