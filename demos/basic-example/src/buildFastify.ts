import Fastify from 'fastify';
import { fastifyFileRouter } from 'fastify-file-router';

const app = Fastify({
  logger: true,
  trustProxy: true
});

await app.register(fastifyFileRouter);

export default app;
