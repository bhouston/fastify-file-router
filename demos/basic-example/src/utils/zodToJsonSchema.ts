import * as z from 'zod';

/**
 * Converts a Zod schema to a JSON Schema compatible with Fastify's schema validation.
 * This utility function handles the conversion from Zod's type system to JSON Schema format.
 *
 * Note: The returned JSON Schema is a runtime object. For type inference to work properly
 * with `defineRoute`, you may need to use type assertions or manually define the schema
 * with `as const` assertions.
 *
 * Note: z.date() and z.coerce.date() are not supported. Use z.iso.datetime() instead
 * for date fields, which validates ISO 8601 datetime strings and is JSON-compatible.
 *
 * @param schema - The Zod schema to convert
 * @returns A JSON Schema object that can be used in Fastify route definitions
 *
 * @example
 * ```ts
 * const userSchema = z.object({
 *   id: z.string(),
 *   email: z.email(),
 *   createdAt: z.iso.datetime()
 * });
 * const jsonSchema = toJsonSchema(userSchema);
 * ```
 */
export const toJsonSchema = (schema: z.ZodTypeAny) => {
  const jsonSchema = z.toJSONSchema(schema, {
    target: 'draft-2020-12',
    unrepresentable: 'any',
  });
  delete jsonSchema.$schema;
  return jsonSchema;
};
