---
sidebar_position: 1
---

# Getting started

Fastify File Router turns your route directory into a Fastify API. A filename supplies the URL and HTTP method; the module supplies the schema and handler. Keep related endpoints together without maintaining a separate route registration list.

Use JavaScript or TypeScript, Remix-style `$id` parameters or Next.js-style `[id]` parameters, and JSON Schema or Zod for typed requests and runtime validation.

## Install

The package is ESM-only and supports Node.js 22 or later and Fastify 5. For the TypeScript examples below, use Node.js 24 or later with native TypeScript support. Configure your application with `"type": "module"` in `package.json`. Native TypeScript execution supports erasable TypeScript syntax; compile your application when you need other language features.

```sh
pnpm add fastify fastify-file-router zod ajv
```

`fastify`, `zod` 4, and `ajv` 8 are peer dependencies. Install them explicitly so dependency resolution is consistent across package managers.

## Create your first endpoint

Create this small application:

```text
src/
├── server.ts
└── routes/
    └── health.get.ts
```

In `src/routes/health.get.ts`, export a named `route`:

```ts
import { defineRoute } from 'fastify-file-router';

export const route = defineRoute({
  schema: {},
  handler: async () => ({ status: 'ok' }),
});
```

In `src/server.ts`, register the plugin and start Fastify:

```ts
import Fastify from 'fastify';
import { fastifyFileRouter } from 'fastify-file-router';

const app = Fastify({ logger: true });

await app.register(fastifyFileRouter, {
  routesDirs: ['./src/routes'],
  logRoutes: true,
});

await app.listen({ port: 3000 });
```

Run from the project root:

```sh
node src/server.ts
curl http://localhost:3000/health
```

The response is `{"status":"ok"}`. Adding `src/routes/users/post.ts` registers `POST /users` on the next application startup. Route discovery happens at startup; restart the server after changing route files.

## Deploy compiled TypeScript

If your compiler produces `dist/server.js` and `dist/routes/health.get.js`, point discovery at the output:

```ts
await app.register(fastifyFileRouter, {
  buildRoot: './dist',
  routesDirs: ['./routes'],
  extensions: ['.js'],
});
```

Then run `node dist/server.js` from the project root. Both `buildRoot` and each `routesDirs` entry must be relative paths. Restricting extensions to `.js` avoids importing source files or generated declarations alongside the compiled routes.

The defaults search `./routes` and `./src/routes` under the current working directory. Choose explicit directories in production so deployment layout and process working directory are predictable.

Continue with [routing conventions](routing.md), [typed routes](typed-routes.md), or [practical examples](examples.md).
