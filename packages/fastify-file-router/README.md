<p align="center">
  <a href="https://npmjs.com/package/fastify-file-router"><img src="https://img.shields.io/npm/v/fastify-file-router.svg" alt="npm package"></a>
  <a href="https://www.npmtrends.com/fastify-file-router"><img src="https://img.shields.io/npm/dw/fastify-file-router.svg" alt="npm downloads"></a>
  <a href="https://codecov.io/gh/bhouston/fastify-file-router"><img src="https://codecov.io/gh/bhouston/fastify-file-router/branch/main/graph/badge.svg" alt="coverage"></a>
  <a href="https://discord.gg/fwupDN493R"><img src="https://img.shields.io/badge/chat-discord-blue?style=flat&logo=discord" alt="discord chat"></a>
  <a href="https://fastify-file-router.ben3d.ca/"><img src="https://img.shields.io/badge/docs-read-blue?style=flat" alt="documentation"></a>
</p>
<br/>

# Fastify File Router

> Register Fastify routes from filenames and directories, fully typed.

A Fastify plugin inspired by the file-based routers in Next.js and Remix. Specify your server routes using filenames or nested directories, and define each route with `defineRoute()` or `defineRouteZod()` for type-safe params, query, body, and headers. Supports JavaScript and TypeScript on Node 22+ and Fastify 5.

**[Read the documentation](https://fastify-file-router.ben3d.ca)** for guides, examples, and the full API reference.

## Installation

_NOTE: This is an ESM-only package._ `fastify`, `zod` 4, and `ajv` 8 are peer dependencies.

```sh
pnpm add fastify fastify-file-router ajv zod
```

## Example

Register the plugin; it discovers route files in `./routes` or `./src/routes` by default:

```ts
import Fastify from 'fastify';
import { fastifyFileRouter } from 'fastify-file-router';

const fastify = Fastify();
await fastify.register(fastifyFileRouter);
await fastify.listen({ port: 3000 });
```

Then export a typed route from a file named for its URL and method, such as `routes/api.users.$id.get.ts`:

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
    // request.params.id is correctly typed as string
    reply.status(200).send({ id: request.params.id });
  },
});
```

This registers `GET /api/users/:id`.

## Features

- [File-based routes](https://fastify-file-router.ben3d.ca/docs/getting-started/): filenames and directories become URLs and HTTP methods, with route groups and wildcards.
- [Next.js or Remix conventions](https://fastify-file-router.ben3d.ca/docs/routing/): choose `$id` or `[id]` parameter syntax.
- [Typed request handlers](https://fastify-file-router.ben3d.ca/docs/typed-routes/): `params`, `body`, `query`, and `headers` inferred from JSON Schema.
- [Zod and JSON Schema](https://fastify-file-router.ben3d.ca/docs/typed-routes/#zod): use either, or mix them in one route, with optional Zod response validation.
- [Optional parameter suffixes](https://fastify-file-router.ben3d.ca/docs/routing/#optional-parameter-suffixes): one file can serve `/chair.webp` and `/chair@1.2.3.webp`.
- [Startup profiling and options](https://fastify-file-router.ben3d.ca/docs/examples/#inspect-route-loading): measure route loading; every option is in the [API reference](https://fastify-file-router.ben3d.ca/docs/api/).
- [Compiled output](https://fastify-file-router.ben3d.ca/docs/getting-started/#deploy-compiled-typescript): point `buildRoot` at your build directory.

## Releases

See [GitHub Releases](https://github.com/bhouston/fastify-file-router/releases) for changes and [SECURITY.md](https://github.com/bhouston/fastify-file-router/blob/main/SECURITY.md) for private vulnerability reports.

## Contribution

See [Contributing Guide](https://github.com/bhouston/fastify-file-router/blob/main/CONTRIBUTING.md).

## License

MIT

## Author

[Ben Houston](https://ben3d.ca), Sponsored by [Land of Assets](https://landofassets.com).
