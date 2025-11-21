import Fastify from 'fastify';
import { fastifyFileRouter } from 'fastify-file-router';

export async function getApp() {
  const app = Fastify({
    logger: true,
    trustProxy: true,
  });

  await app.register(fastifyFileRouter);

  return app;
}
