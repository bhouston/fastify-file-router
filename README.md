<p align="center">
  <a href="https://npmjs.com/package/fastify-file-router"><img src="https://img.shields.io/npm/v/fastify-file-router.svg" alt="npm package"></a>
  <a href="https://www.npmtrends.com/fastify-file-router"><img src="https://img.shields.io/npm/dw/fastify-file-router.svg" alt="npm downloads"></a>
  <a href="https://codecov.io/gh/bhouston/fastify-file-router"><img src="https://codecov.io/gh/bhouston/fastify-file-router/branch/main/graph/badge.svg" alt="coverage"></a>
  <a href="https://discord.gg/fwupDN493R"><img src="https://img.shields.io/badge/chat-discord-blue?style=flat&logo=discord" alt="discord chat"></a>
  <a href="https://bhouston.github.io/fastify-file-router/"><img src="https://img.shields.io/badge/docs-read-blue?style=flat" alt="documentation"></a>
</p>
<br/>

# Fastify File Router

> Register Fastify routes from filenames and directories, fully typed.

- 📁 File-Based Routes
- 🔀 Next.js or Remix Conventions
- 🛡️ Typed Request Handlers
- ✅ Zod and JSON Schema
- 🧩 Optional Parameter Suffixes
- ⏱️ Startup Profiling

A Fastify plugin, inspired by the file-based routers in Next.js and Remix, that registers server routes from filenames and nested directories, with full TypeScript type safety via `defineRoute()` and `defineRouteZod()`.

[Read the Docs to Learn More](https://bhouston.github.io/fastify-file-router/) for getting started, routing conventions, typed validation, code examples, and an automatically generated API reference. The [package README](packages/fastify-file-router/README.md) is also available offline.

## Development

```bash
pnpm install
pnpm dev
pnpm tsc
pnpm build
pnpm lint # oxlint
pnpm lint:fix
pnpm format # oxfmt
pnpm test # vitest
```

## Releases

See [RELEASING.md](RELEASING.md) for release setup, [GitHub Releases](https://github.com/bhouston/fastify-file-router/releases) for changes, and [SECURITY.md](SECURITY.md) for private vulnerability reports.

## Contribution

See [Contributing Guide](CONTRIBUTING.md).

## License

MIT

## Author

[Ben Houston](https://ben3d.ca), Sponsored by [Land of Assets](https://landofassets.com).
