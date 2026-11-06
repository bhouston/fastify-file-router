---
sidebar_position: 2
description: How route filenames, folders, parameters and HTTP method suffixes map to Fastify URLs in the Remix and Next.js conventions.
---

# Routing conventions

Each route filename ends in an HTTP method and extension, such as `users.get.ts`. Directories and dot-separated filename segments both contribute to the URL. Use whichever layout makes your API easiest to navigate.

## Remix style

The default convention is `remix`:

| File under the routes directory | Registered route   |
| ------------------------------- | ------------------ |
| `get.ts`                        | `GET /`            |
| `health.get.ts`                 | `GET /health`      |
| `users/post.ts`                 | `POST /users`      |
| `users.$id.get.ts`              | `GET /users/:id`   |
| `users/$id/patch.ts`            | `PATCH /users/:id` |
| `files.$.get.ts`                | `GET /files/*`     |
| `(auth)/login.post.ts`          | `POST /login`      |
| `sitemap[.]xml.get.ts`          | `GET /sitemap.xml` |

Supported method names are lowercase `get`, `post`, `put`, `patch`, `delete`, and `head`. A route file exports a named `route` object containing its schema and handler, usually created with `defineRoute` or `defineRouteZod`.

A `$name` segment becomes a named parameter, and `$` becomes a wildcard. Define a matching `schema.params` to give named parameters runtime validation and inferred TypeScript types. Filenames determine paths; filenames alone do not infer request types.

## Next.js style

Select the convention once when registering the plugin:

```ts
await app.register(fastifyFileRouter, {
  convention: 'next',
  routesDirs: ['./src/routes'],
});
```

| File under the routes directory | Registered route |
| ------------------------------- | ---------------- |
| `users/[id]/get.ts`             | `GET /users/:id` |
| `files/[...path]/get.ts`        | `GET /files/*`   |
| `(auth)/login/post.ts`          | `POST /login`    |

This setting changes parameter syntax. Routes still use method filenames such as `get.ts`; they do not use Next.js `page.tsx` or `route.ts` files. A catch-all maps to Fastify's wildcard, accessible as `request.params['*']` when you supply a matching parameter type or schema.

## Organize without changing URLs

Parenthesized directories such as `(auth)` or `(admin)` are route groups: the directory name is removed from the URL. Grouping does not add authentication, authorization, or a separate Fastify plugin scope. Register application hooks and security plugins explicitly.

Keep reusable code outside the scanned directories, or in directories beginning with `_`. By default the router excludes names beginning with `.` or `_`, `.test.js`, `.test.ts`, `.spec.js`, `.spec.ts`, and `.d.ts` files. Test directories beginning with `__` are also excluded.

The `exclude` option replaces the defaults. Include any patterns you still need when customizing it. Keep test files, helper modules, and unsupported executable formats out of discovery: accepted extensions select files for import; they do not supply a TypeScript or JSX runtime.

## Mount an API prefix

Every plugin option, with its default, is listed in the [API reference](/docs/api/#fastifyfilerouteroptions).

```ts
await app.register(fastifyFileRouter, {
  mount: '/api/v1',
  routesDirs: ['./src/routes'],
});
```

Now `users.$id.get.ts` registers `GET /api/v1/users/:id`. Use a leading slash and omit a trailing slash on the mount.

Multiple route directories share the same mount. Avoid overlapping directories and duplicate method/path pairs; scanning the same route twice can cause Fastify registration errors.

## Diagnose startup

Enable Fastify logging and `logRoutes: true` to see registered routes and their source files. Invalid method names, invalid route segments, and parameter schemas containing names absent from the URL can fail startup, surfacing configuration mistakes early.

See [examples](examples.md#inspect-route-loading) for startup timing and concurrency controls.

## Optional parameter suffixes

Append `?[@version]` to a named parameter to make the entire `@version` suffix optional. `@` is a literal separator and `version` names a second parameter; it is not literal text in the URL. The `?` belongs to the filesystem convention and never appears in the registered path.

```text
routes/
  media/
    $assetName?[@version]/
      [.]webp.get.ts
      [.]ultrahdr[.]jpg.get.ts
```

This registers both `/media/chair.webp` and `/media/chair@1.2.3.webp`. Handlers receive `{ assetName: 'chair' }` or `{ assetName: 'chair', version: '1.2.3' }`. Labels such as `draft` work too: the router imposes no semver rules. Query strings such as `?width=512` remain ordinary query strings.

Use `$assetName?[@version][.]webp.get.ts` for a flat filename, or `[assetName]?[@version]` with the `next` convention. An explicit `$` in the suffix parameter, such as `?[@$version]`, is also accepted. A suffix consists of one separator (`@`, `.`, `-`, `_`, or `~`) and one parameter name. Both parameter names must be distinct identifiers made from letters, digits, and underscores, starting with a letter or underscore. The separator is reserved within both values; empty values and repeated separators do not match. Each segment may have one optional block; blocks on different segments expand independently.

Declare the suffix parameter optional in your schema:

```ts
params: z.strictObject({
  assetName: z.string(),
  version: z.string().optional(),
}),
```

For JSON Schema, include `version` in `properties` but leave it out of `required`. The router registers a concrete path for each combination. The all-suffixes-present path keeps the declared `operationId`; other variants append `-optional-1`, `-optional-2`, and so on. Each concrete documentation schema includes only its path parameters.

This filename syntax requires a filesystem that permits `?` in filenames, such as macOS or Linux. Windows filenames do not permit `?`.

Vite-based test runners interpret `?` in module paths as a query delimiter. This repository keeps optional-route tests in the parent directory and configures Vitest to load the small `routeLoader` module natively; see `vitest.config.ts` and the demo's `api/media/optional-versions.test.ts`.
