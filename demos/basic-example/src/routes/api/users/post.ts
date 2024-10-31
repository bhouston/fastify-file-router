import type { RouteHandler } from 'fastify-file-router';
import type { FromSchema } from 'json-schema-to-ts';

const bodySchema = {
  type: 'object',
  properties: {
    email: { type: 'string' },
    password: { type: 'string' }
  },
  required: ['email', 'password']
} as const;

export const schema = {
  body: bodySchema
};

type BodySchemaType = FromSchema<typeof bodySchema>;

const routeHandler: RouteHandler = async (request, reply) => {
  // get the request body
  const { email, password } = request.body as BodySchemaType;
  console.log({ email, password });

  // send a response to the client
  reply.status(201).send({ message: 'User created successfully' });
};

export default routeHandler;
