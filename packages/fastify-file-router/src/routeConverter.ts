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
  return method;
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
      // Keep literal extensions separate from Remix or Next.js parameters.
      // Parameters should end at [.], and [.] + next segment should be merged separately
      const prevSegment = merged[merged.length - 1];
      if (prevSegment?.startsWith('$') || (prevSegment?.startsWith('[') && prevSegment.endsWith(']'))) {
        // Keep the parameter segment as-is, merge [.] with next segment
        const next = segments[i + 1];
        if (next) {
          merged.push(`.${next}`);
          i++; // Skip next segment
        } else {
          merged.push('.');
        }
      } else {
        // Normal merge: merge [.] with previous segment
        const next = segments[i + 1];
        if (next) {
          merged[merged.length - 1] += `.${next}`;
          i++; // Skip next segment
        } else {
          merged[merged.length - 1] += '.';
        }
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
  const pathParts: string[] = [];

  for (let i = 0; i < merged.length; i++) {
    const segment = merged[i];
    if (!segment) continue;

    if (!remixSegment.test(segment)) {
      throw new Error(`Invalid segment "${segment}" in file ${fullPath}`);
    }

    // If segment starts with '.', append it to the previous segment (no / separator)
    if (segment.startsWith('.')) {
      if (pathParts.length === 0) {
        throw new Error(`Invalid segment "${segment}" at start of route in file ${fullPath}`);
      }
      pathParts[pathParts.length - 1] += segment;
      continue;
    }

    const match = segment.match(remixParamRegex);
    if (match?.groups) {
      const param = match.groups.param;
      pathParts.push(param && param.length > 0 ? `:${param}` : '*');
    } else {
      pathParts.push(segment);
    }
  }

  return pathParts.join('/');
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
  const pathParts: string[] = [];

  for (let i = 0; i < merged.length; i++) {
    const segment = merged[i];
    if (!segment) continue;

    if (!nextSegment.test(segment)) {
      throw new Error(`Invalid segment "${segment}" in file ${fullPath}`);
    }

    // If segment starts with '.', append it to the previous segment (no / separator)
    if (segment.startsWith('.')) {
      if (pathParts.length === 0) {
        throw new Error(`Invalid segment "${segment}" at start of route in file ${fullPath}`);
      }
      pathParts[pathParts.length - 1] += segment;
      continue;
    }

    const match = segment.match(nextParamRegex);
    if (match?.groups) {
      const param = match.groups.param;
      if (param?.startsWith('...')) {
        pathParts.push('*');
      } else if (param && param.length > 0) {
        pathParts.push(`:${param}`);
      } else {
        throw new Error(`Invalid segment "${segment}" in convention "next"`);
      }
    } else {
      pathParts.push(segment);
    }
  }

  return pathParts.join('/');
}

/** Expand optional suffix blocks into concrete Fastify paths. */
export function toRoutePaths(segments: string[], convention: 'remix' | 'next', fullPath: string): string[] {
  const suffixes: { token: string; required: string; delimiter: string; optional: string }[] = [];
  let prefix = '__ffr_optional_';
  while (segments.some((segment) => segment.includes(prefix))) prefix += '_';
  const prepared = segments.map((segment) => {
    if (!segment.includes('?')) return segment;
    const match = segment.match(
      /^(?:\$([A-Za-z_][A-Za-z0-9_]*)|\[([A-Za-z_][A-Za-z0-9_]*)\])\?\[([@._~-])\$?([A-Za-z_][A-Za-z0-9_]*)\]$/,
    );
    const required = convention === 'remix' ? match?.[1] : match?.[2];
    if (!match || !required || required === match[4]) {
      throw new Error(
        `Invalid optional segment "${segment}" in file ${fullPath}; expected ${convention === 'remix' ? '$name' : '[name]'}?[@version] with distinct parameter names`,
      );
    }
    const token = `${prefix}${suffixes.length}__`;
    suffixes.push({ token, required, delimiter: match[3]!, optional: match[4]! });
    return convention === 'remix' ? `$${token}` : `[${token}]`;
  });
  const convert = convention === 'remix' ? toRouteRemixStyle : toRouteNextStyle;
  let paths = [convert(prepared, fullPath)];
  for (const { token, required, delimiter, optional } of suffixes) {
    // A regex terminates the first parameter before delimiters other than '-' or '.'.
    // Reserve the delimiter so malformed suffixes cannot fall back to the bare-name route.
    const escaped = delimiter === '-' ? '\\-' : delimiter;
    const name = `:${required}([^${escaped}]+)`;
    paths = paths.flatMap((routePath) => [
      routePath.replace(`:${token}`, `${name}${delimiter}:${optional}([^${escaped}]+)`),
      routePath.replace(`:${token}`, name),
    ]);
  }
  return paths;
}
