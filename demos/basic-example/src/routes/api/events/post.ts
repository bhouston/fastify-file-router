import { defineRouteZod } from 'fastify-file-router';
import { z } from 'zod';

// POST /api/events

const querystringSchema = z.object({
  filterStartDate: z.iso.datetime().optional(),
  filterEndDate: z.iso.datetime().optional(),
});

const bodySchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  startDate: z.iso.datetime(),
  endDate: z.iso.datetime(),
  // Nested optional structure with dates
  metadata: z
    .object({
      createdAt: z.iso.datetime(),
      updatedAt: z.iso.datetime().optional(),
    })
    .optional(),
  // Array of ISO datetime strings
  reminderDates: z.array(z.iso.datetime()).optional(),
});

const responseSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  startDate: z.string(),
  endDate: z.string(),
});
export const route = defineRouteZod({
  schema: {
    querystring: querystringSchema,
    body: bodySchema,
    response: {
      201: responseSchema,
      400: z.object({
        error: z.string(),
      }),
      404: z.object({
        error: z.string(),
      }),
    },
  },
  handler: async (request, reply) => {
    // All types are automatically inferred from the Zod schemas!
    // request.query.filterStartDate is typed as string | undefined
    // request.query.filterEndDate is typed as string | undefined
    // request.body.startDate and request.body.endDate are typed as string
    // request.body.metadata?.createdAt is typed as string | undefined
    // request.body.reminderDates is typed as string[] | undefined

    const { filterStartDate, filterEndDate } = request.query;
    const { title, description, startDate, endDate, metadata, reminderDates } = request.body;

    // Values are already ISO datetime strings, so we can use them directly
    // Calculate duration by parsing to Date objects for calculation
    const duration = new Date(endDate).getTime() - new Date(startDate).getTime();

    reply.status(201).send({
      id: `event-${Date.now()}`,
      title,
      description: description ?? 'No description',
      startDate,
      endDate,
      duration: duration,
      metadata: metadata
        ? {
            createdAt: metadata.createdAt,
            updatedAt: metadata.updatedAt,
          }
        : undefined,
      reminderDates,
      filters: {
        startDate: filterStartDate,
        endDate: filterEndDate,
      },
    });
  },
});
