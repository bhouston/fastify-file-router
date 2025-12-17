import * as z from 'zod';

/**
 * Converts a Zod schema to a JSON Schema compatible with Fastify's schema validation.
 * This utility function handles the conversion from Zod's type system to JSON Schema format.
 *
 * Note: The returned JSON Schema is a runtime object. For type inference to work properly
 * with `defineRoute`, you may need to use type assertions or manually define the schema
 * with `as const` assertions.
 *
 * @param schema - The Zod schema to convert
 * @returns A JSON Schema object that can be used in Fastify route definitions
 *
 * @example
 * ```ts
 * const userSchema = z.object({
 *   id: z.string(),
 *   email: z.string().email()
 * });
 * const jsonSchema = toJsonSchema(userSchema);
 * ```
 */
export const toJsonSchema = (schema: z.ZodTypeAny) => {
  const jsonSchema = z.toJSONSchema(schema, {
    target: 'draft-2020-12',
    unrepresentable: 'any',
    override: (ctx) => {
      // Handle date types - convert to string with date-time format
      // Note: This is a simplified check; you may need to adjust based on your Zod version
      if ('typeName' in ctx.zodSchema && (ctx.zodSchema as { typeName?: string }).typeName === 'ZodDate') {
        ctx.jsonSchema.type = 'string';
        ctx.jsonSchema.format = 'date-time';
      }
    },
  });
  delete jsonSchema.$schema;
  return jsonSchema;
};

