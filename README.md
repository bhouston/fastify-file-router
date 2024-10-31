# Fastify File Router

This Fastify plugin is inspired by the file based routers in Next.js and Remix.

This allows you to specify all of your server routes using either filenames or a combination of filenames and nested directories.

Supports both JavaScript and TypeScript (on Node 22+.)

## Example

You register the plugin like this:

```ts
const fastify = Fastify();

fastify.register(fastifyFileRouter, {
  apiBase: '/',
  routesDir: './src/routes',
  routeFileExtension: '.ts'
});
```

You can use any combination of file names and directories. Both are valid. We use [Remix-style conventions](https://remix.run/docs/en/main/discussion/routes#conventional-route-configuration) for interpreting filenames.

```
/routes
├── api
│   ├── healthcheck
│   │   └── get.js
│   └── users
│       └── post.js
└── api.users.$id.get.js
```

Inside each route handler file, you make the default export the route handler. Here is a simple example:

```ts
// routes/api/healthcheck/get.ts

import type { FastifyReply, FastifyRequest } from 'fastify';

export default async function routeHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  reply.status(204).send();
}
```

If you want to specify a schema, you can optionally export it as well:

```ts
// routes/api.users.$id.get.ts

import type { RouteHandler, RouteSchema } from 'fastify-file-router';
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

const routeHandler: RouteHandler = async (request, reply) => {
  const { id } = request.params as ParamsSchema;

  // send a response to the client
  reply.status(200).send({
    id,
    name: 'John Doe',
    email: 'john.doe@microsoft.com'
  });
};

export default routeHandler;
```

The above will result in these routes being registered:

```
GET /api/healthcheck
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
