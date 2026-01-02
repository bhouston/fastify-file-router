import { defineRouteZod } from 'fastify-file-router';
import { z } from 'zod';

// POST /api/events

const querystringSchema = z.object({
  // Date in querystring - demonstrates date conversion
  filterStartDate: z.coerce.date().optional(),
  filterEndDate: z.coerce.date().optional(),
});

const bodySchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  // Date fields - demonstrates the new date conversion capability
  // Using z.coerce.date() to convert ISO string dates from JSON to Date objects
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  // Nested optional structure with dates - tests the guard against undefined zodSchema._zod
  metadata: z
    .object({
      createdAt: z.coerce.date(),
      updatedAt: z.coerce.date().optional(),
    })
    .optional(),
  // Array of dates
  reminderDates: z.array(z.coerce.date()).optional(),
});

const responseSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  startDate: z.coerce.string(),
  endDate: z.coerce.string(),
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
    // request.query.filterStartDate is typed as Date | undefined
    // request.query.filterEndDate is typed as Date | undefined
    // request.body.startDate and request.body.endDate are typed as Date
    // request.body.metadata?.createdAt is typed as Date | undefined
    // request.body.reminderDates is typed as Date[] | undefined

    const { filterStartDate, filterEndDate } = request.query;
    const { title, description, startDate, endDate, metadata, reminderDates } = request.body;

    // Type inference verification: date operations prove types are correctly inferred
    const startDateISO = startDate.toISOString();
    const endDateISO = endDate.toISOString();
    const duration = endDate.getTime() - startDate.getTime();

    // Handle optional nested structure with dates
    const metadataCreatedAt = metadata?.createdAt?.toISOString();
    const metadataUpdatedAt = metadata?.updatedAt?.toISOString();

    // Handle array of dates
    const reminderDatesISO = reminderDates?.map((date) => date.toISOString());

    // Handle querystring dates
    const filterStartISO = filterStartDate?.toISOString();
    const filterEndISO = filterEndDate?.toISOString();

    reply.status(201).send({
      id: `event-${Date.now()}`,
      title,
      description: description ?? 'No description',
      startDate: startDateISO,
      endDate: endDateISO,
      duration: duration,
      metadata: metadata
        ? {
            createdAt: metadataCreatedAt,
            updatedAt: metadataUpdatedAt,
          }
        : undefined,
      reminderDates: reminderDatesISO,
      filters: {
        startDate: filterStartISO,
        endDate: filterEndISO,
      },
    });
  },
});
