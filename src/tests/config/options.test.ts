import { describe, it, expect, beforeEach } from 'vitest'
import Fastify, { FastifyInstance } from 'fastify'
import { fileRouter } from '../../index'
import path from 'path'

describe('File Router Configuration Options', () => {
  let app: FastifyInstance

  beforeEach(() => {
    app = Fastify()
  })

  describe('Plugin Options Validation', () => {
    it('should register with default options', async () => {
      await expect(app.register(fileRouter)).resolves.not.toThrow()
    })

    it('should throw error on invalid directory path', async () => {
      await expect(
        app.register(fileRouter, {
          directory: '/non/existent/path'
        })
      ).rejects.toThrow()
    })

    it('should validate routeDir type', async () => {
      await expect(
        app.register(fileRouter, {
          // @ts-expect-error testing invalid type
          directory: 123
        })
      ).rejects.toThrow()
    })
  })
})