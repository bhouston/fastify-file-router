# Contributing to Fastify File Router

## Development Setup

This is a monorepo project managed with [NX](https://nx.dev). To get started with development:

1. Install [PNPM](https://pnpm.io) if you haven't already:
   ```sh
   npm install -g pnpm
   ```

2. Clone the repository and install dependencies:
   ```sh
   git clone https://github.com/bhouston/fastify-file-router.git
   cd fastify-file-router
   pnpm install
   ```

## Development Commands

```sh
# hot-reloading development server
pnpm dev

# build & start server
pnpm build && pnpm start

# type checking
pnpm typecheck

# prettify
pnpm format

# eslint
pnpm lint

# build and run tests
pnpm test

# clean everything (like a fresh git checkout)
pnpm clean

# count lines of code (excluding generated files)
pnpm cloc
```

## Project Structure

The project is organized as a monorepo with the following structure:
- `packages/` - Contains the main package and any supporting packages
- `demos/` - Example projects showing usage
- `scripts/` - Build and development scripts

## Coding Standards

1. All code must be TypeScript
2. Follow the existing code style (enforced by ESLint and Prettier)
3. All new code should have appropriate test coverage
4. Documentation should be updated for any public API changes

## Pull Request Process

1. Fork the repository and create your branch from `main`
2. Ensure all tests pass and the build is successful
3. Update documentation for any changes
4. Create a pull request with a clear description of the changes

## Release Process

Releases are handled through the `pnpm publish` command, which will:
1. Build all packages
2. Run tests
3. Publish to npm
