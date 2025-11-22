import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import { describe, expect, test } from 'vitest';
import { fastifyFileRouter } from './plugin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('fastifyFileRouter - invalid options', () => {
  test('throws error when buildRoot is an absolute path', async () => {
    const app = Fastify({ logger: false });
    const absolutePath = path.resolve(__dirname, './routes');

    await expect(
      app.register(fastifyFileRouter, {
        buildRoot: absolutePath,
      }),
    ).rejects.toThrow(`Build root "${absolutePath}" is an absolute path, but must be a relative path`);

    await app.close();
  });

  test('throws error when routesDir is an absolute path', async () => {
    const app = Fastify({ logger: false });
    const absolutePath = path.resolve(__dirname, './routes');

    await expect(
      app.register(fastifyFileRouter, {
        routesDirs: [absolutePath],
      }),
    ).rejects.toThrow(`Routes directory "${absolutePath}" is an absolute path, but must be a relative path`);

    await app.close();
  });

  test('throws error when multiple routesDirs contain absolute paths', async () => {
    const app = Fastify({ logger: false });
    const absolutePath1 = path.resolve(__dirname, './routes');
    const absolutePath2 = path.resolve(__dirname, './src/routes');

    await expect(
      app.register(fastifyFileRouter, {
        routesDirs: ['./routes', absolutePath1, absolutePath2],
      }),
    ).rejects.toThrow(`Routes directory "${absolutePath1}" is an absolute path, but must be a relative path`);

    await app.close();
  });

  test('throws error when buildRoot does not exist', async () => {
    const app = Fastify({ logger: false });
    const cwd = process.env.REMIX_ROOT ?? process.cwd();
    const nonExistentBuildRoot = './non-existent-build-root';
    const expectedFullPath = path.resolve(cwd, nonExistentBuildRoot);

    await expect(
      app.register(fastifyFileRouter, {
        buildRoot: nonExistentBuildRoot,
        routesDirs: ['./routes'],
      }),
    ).rejects.toThrow(`Build root directory does not exist: ${expectedFullPath}`);

    await app.close();
  });

  test('throws error when routesDir does not exist', async () => {
    const app = Fastify({ logger: false });
    const cwd = process.env.REMIX_ROOT ?? process.cwd();
    const nonExistentRoutesDir = './non-existent-routes';
    const expectedFullPath = path.resolve(cwd, nonExistentRoutesDir);

    await expect(
      app.register(fastifyFileRouter, {
        routesDirs: [nonExistentRoutesDir],
      }),
    ).rejects.toThrow(`Routes directory does not exist: ${expectedFullPath}`);

    await app.close();
  });

  test('throws error when routesDir does not exist with custom buildRoot', async () => {
    const app = Fastify({ logger: false });
    const cwd = process.env.REMIX_ROOT ?? process.cwd();
    // Use '.' as buildRoot since it exists
    const buildRoot = '.';
    const nonExistentRoutesDir = './non-existent-routes';
    const expectedFullPath = path.resolve(cwd, buildRoot, nonExistentRoutesDir);

    await expect(
      app.register(fastifyFileRouter, {
        buildRoot,
        routesDirs: [nonExistentRoutesDir],
      }),
    ).rejects.toThrow(`Routes directory does not exist: ${expectedFullPath}`);

    await app.close();
  });

  test('throws error when multiple routesDirs do not exist', async () => {
    const app = Fastify({ logger: false });
    const cwd = process.env.REMIX_ROOT ?? process.cwd();
    const nonExistentDir1 = './non-existent-1';
    const nonExistentDir2 = './non-existent-2';
    const expectedFullPath1 = path.resolve(cwd, nonExistentDir1);
    const expectedFullPath2 = path.resolve(cwd, nonExistentDir2);

    await expect(
      app.register(fastifyFileRouter, {
        routesDirs: [nonExistentDir1, nonExistentDir2],
      }),
    ).rejects.toThrow();

    // The error should mention at least one of the non-existent directories
    try {
      await app.register(fastifyFileRouter, {
        routesDirs: [nonExistentDir1, nonExistentDir2],
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      expect(errorMessage.includes(expectedFullPath1) || errorMessage.includes(expectedFullPath2)).toBe(true);
    }

    await app.close();
  });

  test('throws error when buildRoot exists but is not a directory', async () => {
    const app = Fastify({ logger: false });
    const cwd = process.env.REMIX_ROOT ?? process.cwd();
    // Use a file that exists (this test file itself) as buildRoot
    // Calculate relative path from cwd to this test file
    const testFileAbsolutePath = __filename;
    const buildRoot = path.relative(cwd, testFileAbsolutePath);
    const expectedFullPath = path.resolve(cwd, buildRoot);

    await expect(
      app.register(fastifyFileRouter, {
        buildRoot,
        routesDirs: ['./routes'],
      }),
    ).rejects.toThrow(`Build root is not a directory: ${expectedFullPath}`);

    await app.close();
  });

  test('throws error when routesDir exists but is not a directory', async () => {
    const app = Fastify({ logger: false });
    const cwd = process.env.REMIX_ROOT ?? process.cwd();
    // Use a file that exists as routesDir
    // Calculate relative path from cwd to this test file
    const testFileAbsolutePath = __filename;
    const routesDir = path.relative(cwd, testFileAbsolutePath);
    const expectedFullPath = path.resolve(cwd, routesDir);

    await expect(
      app.register(fastifyFileRouter, {
        routesDirs: [routesDir],
      }),
    ).rejects.toThrow(`Routes directory is not a directory: ${expectedFullPath}`);

    await app.close();
  });

  test('validates relative paths before checking existence', async () => {
    const app = Fastify({ logger: false });
    const absolutePath = path.resolve(__dirname, './routes');

    // Should throw about absolute path, not about non-existence
    await expect(
      app.register(fastifyFileRouter, {
        buildRoot: absolutePath,
        routesDirs: ['./routes'],
      }),
    ).rejects.toThrow('is an absolute path, but must be a relative path');

    await app.close();
  });

  test('throws error when mount does not start with slash', async () => {
    const app = Fastify({ logger: false });

    await expect(
      app.register(fastifyFileRouter, {
        mount: 'api',
        routesDirs: ['./routes'],
      }),
    ).rejects.toThrow('Mount point "api" must start with a slash');

    await app.close();
  });

  test('throws error when extension does not start with dot', async () => {
    const app = Fastify({ logger: false });

    await expect(
      app.register(fastifyFileRouter, {
        extensions: ['ts', '.js'],
        routesDirs: ['./routes'],
      }),
    ).rejects.toThrow('Invalid extension "ts", must start with a dot');

    await app.close();
  });

  test('throws error when routesDirs are invalid', async () => {
    const app = Fastify({ logger: false });
    const nonExistentDir1 = './non-existent-1';
    const nonExistentDir2 = './non-existent-2';

    // With Promise.all, we get the first error
    await expect(
      app.register(fastifyFileRouter, {
        routesDirs: [nonExistentDir1, nonExistentDir2],
      }),
    ).rejects.toThrow('Routes directory does not exist');

    await app.close();
  });
});

describe('fastifyFileRouter - nested directory routes', () => {
  test('scans and registers routes from nested directory structure', async () => {
    const app = Fastify({ logger: false });
    const cwd = process.env.REMIX_ROOT ?? process.cwd();

    // Create a temporary directory structure with nested routes
    const tempBuildRoot = path.join(__dirname, 'temp-test-plugin-nested');
    const tempRoutesDir = path.join(tempBuildRoot, 'routes');
    const nestedApiDir = path.join(tempRoutesDir, 'api');
    const nestedUsersDir = path.join(nestedApiDir, 'users');
    const nestedProjectsDir = path.join(nestedApiDir, 'projects', '$projectId');

    try {
      // Create directory structure
      await fs.mkdir(nestedUsersDir, { recursive: true });
      await fs.mkdir(nestedProjectsDir, { recursive: true });

      // Create route files at different nesting levels
      // Level 1: /api/health
      const healthFile = path.join(nestedApiDir, 'health.get.ts');
      await fs.writeFile(
        healthFile,
        `export default async function handler(request, reply) {
          reply.status(200).send({ message: 'health check' });
        }`,
        'utf-8',
      );

      // Level 2: /api/users/list
      const usersListFile = path.join(nestedUsersDir, 'list.get.ts');
      await fs.writeFile(
        usersListFile,
        `export default async function handler(request, reply) {
          reply.status(200).send({ users: [] });
        }`,
        'utf-8',
      );

      // Level 3: /api/projects/:projectId/details
      const projectDetailsFile = path.join(nestedProjectsDir, 'details.get.ts');
      await fs.writeFile(
        projectDetailsFile,
        `export default async function handler(request, reply) {
          const params = request.params;
          reply.status(200).send({ projectId: params.projectId, details: 'project details' });
        }`,
        'utf-8',
      );

      // Calculate relative paths from cwd
      const buildRoot = path.relative(cwd, tempBuildRoot);
      const routesDir = 'routes'; // Relative to buildRoot

      // Register the plugin
      await app.register(fastifyFileRouter, {
        buildRoot,
        routesDirs: [routesDir],
        extensions: ['.ts'],
        convention: 'remix',
      });

      await app.ready();

      // Test route at level 1: /api/health
      const healthResponse = await app.inject({
        method: 'GET',
        url: '/api/health',
      });
      expect(healthResponse.statusCode).toBe(200);
      expect(healthResponse.json()).toEqual({ message: 'health check' });

      // Test route at level 2: /api/users/list
      const usersListResponse = await app.inject({
        method: 'GET',
        url: '/api/users/list',
      });
      expect(usersListResponse.statusCode).toBe(200);
      expect(usersListResponse.json()).toEqual({ users: [] });

      // Test route at level 3: /api/projects/:projectId/details
      const projectDetailsResponse = await app.inject({
        method: 'GET',
        url: '/api/projects/test-project-123/details',
      });
      expect(projectDetailsResponse.statusCode).toBe(200);
      const projectData = projectDetailsResponse.json();
      expect(projectData).toHaveProperty('projectId', 'test-project-123');
      expect(projectData).toHaveProperty('details', 'project details');

      await app.close();
    } finally {
      // Clean up temporary directory
      await fs.rm(tempBuildRoot, { recursive: true, force: true });
    }
  });
});
