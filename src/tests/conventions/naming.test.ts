import { describe, it, expect, beforeEach } from 'vitest'
import Fastify, { FastifyInstance } from 'fastify'
import { fileRouter } from '../../index'
import path from 'path'
import { rm, mkdir, writeFile } from 'fs/promises'

describe('Route Naming Conventions', () => {
  let app: FastifyInstance
  const testRoutesDir = path.join(__dirname, 'test-routes')

  beforeEach(async () => {
    app = Fastify()
    // Clean up and recreate test routes directory
    try {
      await rm(testRoutesDir, { recursive: true })
    } catch (err) {
      // Directory might not exist, ignore error
    }
    await mkdir(testRoutesDir, { recursive: true })
  })

  describe('Remix-style Route Naming', () => {
    it('should correctly map Remix-style route names', async () => {
      // Create test route files
      await writeFile(
        path.join(testRoutesDir, 'index.ts'),
        `export default async function handler(req, reply) {
          return { route: 'index' }
        }`
      )
      await writeFile(
        path.join(testRoutesDir, 'about.ts'),
        `export default async function handler(req, reply) {
          return { route: 'about' }
        }`
      )

      // Register router with test directory
      await app.register(fileRouter, {
        directory: testRoutesDir
      })

      // Test index route
      const indexResponse = await app.inject({
        method: 'GET',
        url: '/'
      })
      expect(indexResponse.statusCode).toBe(200)
      expect(indexResponse.json()).toEqual({ route: 'index' })

      // Test about route
      const aboutResponse = await app.inject({
        method: 'GET',
        url: '/about'
      })
      expect(aboutResponse.statusCode).toBe(200)
      expect(aboutResponse.json()).toEqual({ route: 'about' })
    })
  })
})