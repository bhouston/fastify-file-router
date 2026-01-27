import { defineRouteZod } from 'fastify-file-router';
import { z } from 'zod';

// PATCH /api/users/:id

const querystringSchema = z.object({
  include: z.enum(['profile', 'settings']).optional(),
  fields: z.string().optional(),
});

const bodySchema = z.strictObject({
  name: z.string().min(1, 'Name is required').optional(),
  email: z.email('Invalid email format').optional(),
  age: z.number().int().min(0).max(150).optional(),
  createdAt: z.iso.datetime().optional(),
});

// Define Zod schemas directly - types are automatically inferred!
export const route = defineRouteZod({
  schema: {
    params: z.object({
      id: z.string().min(1, 'ID is required'),
    }),
    querystring: querystringSchema,
    body: bodySchema,
  },
  handler: async (request, reply) => {
    // All types are automatically inferred from the Zod schemas!
    // request.params.id is typed as string
    // request.query.include is typed as 'profile' | 'settings' | undefined
    // request.query.fields is typed as string | undefined
    // request.body.name is typed as string | undefined
    // request.body.email is typed as string | undefined
    // request.body.age is typed as number | undefined
    const { id } = request.params;
    const { include, fields } = request.query;
    const { name, email, age } = request.body;

    // Type inference verification: these operations would fail if types weren't inferred correctly
    // String operations on id (proves it's typed as string)
    const idUpper = id.toUpperCase();
    const idLength = id.length;

    // Type narrowing for enum (proves include is typed as 'profile' | 'settings' | undefined)
    if (include === 'profile') {
      // TypeScript knows include is 'profile' here
      console.log(`Profile data for ${id}`);
    } else if (include === 'settings') {
      // TypeScript knows include is 'settings' here
      console.log(`Settings for ${id}`);
    }

    // String operations on optional fields (proves they're typed correctly)
    const nameUpper = name?.toUpperCase();
    const emailDomain = email?.split('@')[1];
    const fieldsLength = fields?.length;

    // Number operations on age (proves it's typed as number | undefined)
    const ageNextYear = age !== undefined ? age + 1 : undefined;
    const isAdult = age !== undefined && age >= 18;

    console.log({
      id,
      idUpper,
      idLength,
      include,
      fields,
      name,
      nameUpper,
      email,
      emailDomain,
      age,
      ageNextYear,
      isAdult,
      fieldsLength,
    });

    reply.status(200).send({
      id,
      name: name ?? 'John Doe',
      email: email ?? 'john.doe@example.com',
      age: age ?? 30,
      included: include,
      fields,
    });
  },
});
