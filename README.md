# Fastify File Router

[![NPM Package][npm]][npm-url]
[![NPM Downloads][npm-downloads]][npmtrends-url]
[![Tests][tests-badge]][tests-url]
[![Coverage][coverage-badge]][coverage-url]
[![Discord](https://img.shields.io/badge/Discord-Join%20Chat-5865F2?logo=discord&logoColor=white)][discord-url]

A Fastify plugin, inspired by the file-based routers in Next.js and Remix, that registers server routes from filenames and nested directories, with full TypeScript type safety via `defineRoute()`/`defineRouteZod()`.

See [packages/fastify-file-router/README.md](packages/fastify-file-router/README.md) for full documentation.

## Development

```bash
pnpm install
pnpm dev
pnpm tsc # typescript-native
pnpm build
pnpm lint # oxlint
pnpm lint:fix
pnpm format # oxfmt
pnpm test # vitest
```

## Author

[Ben Houston](https://ben3d.ca), Sponsored by [Land of Assets](https://landofassets.com)

[npm]: https://img.shields.io/npm/v/fastify-file-router
[npm-url]: https://www.npmjs.com/package/fastify-file-router
[npm-downloads]: https://img.shields.io/npm/dw/fastify-file-router
[npmtrends-url]: https://www.npmtrends.com/fastify-file-router
[tests-badge]: https://github.com/bhouston/fastify-file-router/actions/workflows/ci.yml/badge.svg
[tests-url]: https://github.com/bhouston/fastify-file-router/actions/workflows/ci.yml
[coverage-badge]: https://codecov.io/gh/bhouston/fastify-file-router/branch/main/graph/badge.svg
[coverage-url]: https://codecov.io/gh/bhouston/fastify-file-router
[discord-url]: https://discord.gg/fwupDN493R

## Contributing and releases

See [CONTRIBUTING.md](CONTRIBUTING.md) for the issue → branch → PR workflow, [RELEASING.md](RELEASING.md) for release setup, [CHANGELOG.md](CHANGELOG.md) for changes, and [SECURITY.md](SECURITY.md) for private vulnerability reporting.
