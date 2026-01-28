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
 * Pre-processes segments to merge [.] with adjacent segments.
 * @param segments - Array of route segments
 * @param fullPath - The full path to the file (for error messages)
 * @returns Processed segments with [.] merged
 */
function mergeLiteralDots(segments: string[], fullPath: string): string[] {
  const merged: string[] = [];
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    if (!segment) continue;

    if (segment === '[.]') {
      if (merged.length === 0) {
        throw new Error(`Invalid segment "[.]" at start of route in file ${fullPath}`);
      }
      const next = segments[i + 1];
      if (next) {
        merged[merged.length - 1] += `.${next}`;
        i++; // Skip next segment
      } else {
        merged[merged.length - 1] += '.';
      }
    } else {
      merged.push(segment);
    }
  }
  return merged;
}

/**
 * Converts route segments to a Remix-style route path.
 * @param segments - Array of route segments
 * @param fullPath - The full path to the file (for error messages)
 * @returns The converted route path
 * @throws Error if any segment is invalid
 */
export function toRouteRemixStyle(segments: string[], fullPath: string): string {
  const merged = mergeLiteralDots(segments, fullPath);
  return merged
    .map((segment) => {
      if (!remixSegment.test(segment)) {
        throw new Error(`Invalid segment "${segment}" in file ${fullPath}`);
      }
      const match = segment.match(remixParamRegex);
      if (match?.groups) {
        const param = match.groups.param;
        return param && param.length > 0 ? `:${param}` : '*';
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
  const merged = mergeLiteralDots(segments, fullPath);
  return merged
    .map((segment) => {
      if (!nextSegment.test(segment)) {
        throw new Error(`Invalid segment "${segment}" in file ${fullPath}`);
      }
      const match = segment.match(nextParamRegex);
      if (match?.groups) {
        const param = match.groups.param;
        if (param?.startsWith('...')) {
          return '*';
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
