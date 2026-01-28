// Regex patterns and constants for route file processing

export const validMethods = ['delete', 'get', 'head', 'patch', 'post', 'put'] as const;

export const methodRegex = new RegExp(`^(${validMethods.join('|')})(\\..+)?$`);

// Regex patterns for route conversion
// Allow [.] for literal dots, but exclude it from the character class to handle separately
export const remixSegment = /^\$?(\[\.\]|[^[\]$&]*)$/;
export const remixParamRegex = /^\$(?<param>.*)$/;
// Next.js convention: segments must not start with $ (that's Remix style)
// Allow [.] for literal dots
export const nextSegment = /^(?!\$)(\[\.\]|[[]?(?:\.\.\.|[^[\]&]*)[\]]?)$/;
export const nextParamRegex = /^\[(?<param>.*)\]$/;

// Default exclude patterns
export const defaultExcludePatterns = [/^[.|_].*/, /\.(?:test|spec)\.[jt]s$/, /__(?:test|spec)__/, /\.d\.ts$/] as const;
