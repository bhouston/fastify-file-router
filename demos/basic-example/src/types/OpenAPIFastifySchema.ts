import type { FastifySchema } from 'fastify';

/**
 * Extended FastifySchema with OpenAPI/Swagger metadata properties
 * This allows you to add OpenAPI-specific properties to your route schemas
 * while maintaining full type safety for request parameters, body, querystring, and headers.
 */
export interface OpenAPIFastifySchema extends FastifySchema {
  /** Description of the API endpoint */
  description?: string;
  /** Short summary of the endpoint */
  summary?: string;
  /** Tags for grouping endpoints in OpenAPI documentation */
  tags?: string[];
  /** Unique operation identifier */
  operationId?: string;
  /** Security requirements for the endpoint */
  security?: Array<Record<string, string[]>>;
}

