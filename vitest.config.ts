import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Route filenames can contain literal '?', which Vite interprets as a query.
    // Keep the small URL-aware loader native so Node resolves these paths.
    server: { deps: { external: [/routeLoader\.(?:ts|js)$/] } },
    watch: false,
    isolate: false,
    fsModuleCache: true,
    exclude: [...configDefaults.exclude, '**/dist/**', '**/publish/**'],
    coverage: {
      provider: 'v8',
      include: ['packages/fastify-file-router/src/**/*.ts'],
      thresholds: { statements: 90, branches: 85, functions: 90, lines: 90 },
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        '**/node_modules',
        '**/coverage',
        '**/scripts',
        '**/dist',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/test',
        '**/tests',
        '**/*.d.ts',
        '**/vitest.config.ts',
        '**/vitest.config.js',
        '**/publish',
      ],
    },
  },
});
