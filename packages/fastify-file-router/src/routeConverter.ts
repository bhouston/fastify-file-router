import type { HTTPMethods } from 'fastify';
import { methodRegex, nextParamRegex, nextSegment, remixParamRegex, remixSegment } from './constants.js';

/**
 * Validates and converts a method string to an HTTPMethods type.
 * @param method - The method string to validate
 * @param fullPath - The full path to the file (for error messages)
 * @returns The validated HTTP method
 * @throws Error if the method is invalid
 */
export function toHttpMethod(method: string, fullPath: string): HTTPMethods {
  // Validate method
  if (!method || !methodRegex.test(method)) {
    throw new Error(`Invalid method "${method}" in file ${fullPath}`);
  }
  return method as HTTPMethods;
}

/**
 * Converts route segments to a Remix-style route path.
 * @param segments - Array of route segments
 * @param fullPath - The full path to the file (for error messages)
 * @returns The converted route path
 * @throws Error if any segment is invalid
 */
export function toRouteRemixStyle(segments: string[], fullPath: string): string {
  // ensure that only valid characters or a remix parameter are present
  return segments
    .map((segment) => {
      // Validate remaining segments
      if (!remixSegment.test(segment)) {
        throw new Error(`Invalid segment "${segment}" in file ${fullPath}`);
      }

      const matchResult = segment.match(remixParamRegex);
      if (matchResult?.groups) {
        const param = matchResult.groups.param;
        if (param && param.length > 0) {
          return `:${param}`;
        }
        return '*';
      }
      return segment;
    })
    .join('/');
}

/**
 * Converts route segments to a Next.js-style route path.
 * @param segments - Array of route segments
 * @param fullPath - The full path to the file (for error messages)
 * @returns The converted route path
 * @throws Error if any segment is invalid
 */
export function toRouteNextStyle(segments: string[], fullPath: string): string {
  // ensures that only valid characters or a next.js parameter are present
  return segments
    .map((segment) => {
      // Validate remaining segments
      if (!nextSegment.test(segment)) {
        throw new Error(`Invalid segment "${segment}" in file ${fullPath}`);
      }

      const matchResult = segment.match(nextParamRegex);
      if (matchResult?.groups) {
        const param = matchResult.groups.param;
        if (param?.startsWith('...')) {
          return `*`;
        }
        if (param && param.length > 0) {
          return `:${param}`;
        }
        throw new Error(`Invalid segment "${segment}" in convention "next"`);
      }
      return segment;
    })
    .join('/');
}
