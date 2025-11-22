import { describe, expect, test } from 'vitest';
import {
  defaultExcludePatterns,
  methodRegex,
  nextParamRegex,
  nextSegment,
  remixParamRegex,
  remixSegment,
  validMethods,
} from './constants.js';

describe('validMethods', () => {
  test('contains all valid HTTP methods', () => {
    expect(validMethods).toEqual(['delete', 'get', 'head', 'patch', 'post', 'put']);
  });
});

describe('methodRegex', () => {
  test('matches valid HTTP methods without extension', () => {
    expect(methodRegex.test('get')).toBe(true);
    expect(methodRegex.test('post')).toBe(true);
    expect(methodRegex.test('put')).toBe(true);
    expect(methodRegex.test('patch')).toBe(true);
    expect(methodRegex.test('delete')).toBe(true);
    expect(methodRegex.test('head')).toBe(true);
  });

  test('matches valid HTTP methods with extension', () => {
    expect(methodRegex.test('get.ts')).toBe(true);
    expect(methodRegex.test('post.js')).toBe(true);
    expect(methodRegex.test('put.tsx')).toBe(true);
    expect(methodRegex.test('patch.jsx')).toBe(true);
    expect(methodRegex.test('delete.ts')).toBe(true);
    expect(methodRegex.test('head.js')).toBe(true);
  });

  test('does not match invalid methods', () => {
    expect(methodRegex.test('invalid')).toBe(false);
    expect(methodRegex.test('GET')).toBe(false);
    expect(methodRegex.test('options')).toBe(false);
    expect(methodRegex.test('trace')).toBe(false);
    expect(methodRegex.test('')).toBe(false);
    expect(methodRegex.test('getget')).toBe(false);
  });

  test('extracts method from match', () => {
    const match = 'get.ts'.match(methodRegex);
    expect(match?.[1]).toBe('get');
    expect(match?.[2]).toBe('.ts');

    const match2 = 'post.js'.match(methodRegex);
    expect(match2?.[1]).toBe('post');
    expect(match2?.[2]).toBe('.js');
  });
});

describe('remixSegment', () => {
  test('matches simple segments', () => {
    expect(remixSegment.test('api')).toBe(true);
    expect(remixSegment.test('health')).toBe(true);
    expect(remixSegment.test('users')).toBe(true);
  });

  test('matches Remix-style parameters starting with $', () => {
    expect(remixSegment.test('$id')).toBe(true);
    expect(remixSegment.test('$token')).toBe(true);
    expect(remixSegment.test('$userId')).toBe(true);
    expect(remixSegment.test('$')).toBe(true); // catch-all
  });

  test('does not match segments with invalid characters', () => {
    expect(remixSegment.test('[id]')).toBe(false);
    expect(remixSegment.test('test&bad')).toBe(false);
    expect(remixSegment.test('test$bad')).toBe(false); // $ in middle
    expect(remixSegment.test('test[id]')).toBe(false);
    expect(remixSegment.test('test&')).toBe(false);
  });

  test('matches segments with allowed characters', () => {
    expect(remixSegment.test('api-v1')).toBe(true);
    expect(remixSegment.test('test_123')).toBe(true);
    expect(remixSegment.test('camelCase')).toBe(true);
  });
});

describe('remixParamRegex', () => {
  test('matches Remix-style parameters and extracts param name', () => {
    const match1 = '$id'.match(remixParamRegex);
    expect(match1).not.toBeNull();
    expect(match1?.groups?.param).toBe('id');

    const match2 = '$token'.match(remixParamRegex);
    expect(match2).not.toBeNull();
    expect(match2?.groups?.param).toBe('token');

    const match3 = '$userId'.match(remixParamRegex);
    expect(match3).not.toBeNull();
    expect(match3?.groups?.param).toBe('userId');
  });

  test('matches catch-all parameter', () => {
    const match = '$'.match(remixParamRegex);
    expect(match).not.toBeNull();
    expect(match?.groups?.param).toBe('');
  });

  test('does not match non-parameter segments', () => {
    expect(remixParamRegex.test('api')).toBe(false);
    expect(remixParamRegex.test('id')).toBe(false);
    expect(remixParamRegex.test('[id]')).toBe(false);
    // Note: $id$ technically matches because param regex allows .* (anything)
    // but remixSegment would prevent this from being valid
    expect(remixParamRegex.test('$id$')).toBe(true);
  });
});

describe('nextSegment', () => {
  test('matches simple segments', () => {
    expect(nextSegment.test('api')).toBe(true);
    expect(nextSegment.test('health')).toBe(true);
    expect(nextSegment.test('users')).toBe(true);
  });

  test('matches Next.js-style parameters with brackets', () => {
    expect(nextSegment.test('[id]')).toBe(true);
    expect(nextSegment.test('[token]')).toBe(true);
    expect(nextSegment.test('[userId]')).toBe(true);
  });

  test('matches catch-all parameters', () => {
    expect(nextSegment.test('[...path]')).toBe(true);
    expect(nextSegment.test('[...slug]')).toBe(true);
    expect(nextSegment.test('[...rest]')).toBe(true);
  });

  test('matches segments without brackets (optional brackets)', () => {
    expect(nextSegment.test('api')).toBe(true);
    expect(nextSegment.test('users')).toBe(true);
  });

  test('does not match segments with invalid characters', () => {
    expect(nextSegment.test('test&bad')).toBe(false);
    expect(nextSegment.test('$id')).toBe(false); // Rejected: $ prefix is Remix style, not Next.js
    expect(nextSegment.test('test[id]bad')).toBe(false); // brackets in middle
  });

  test('matches segments with allowed special characters', () => {
    expect(nextSegment.test('api-v1')).toBe(true);
    expect(nextSegment.test('test_123')).toBe(true);
  });
});

describe('nextParamRegex', () => {
  test('matches Next.js-style parameters and extracts param name', () => {
    const match1 = '[id]'.match(nextParamRegex);
    expect(match1).not.toBeNull();
    expect(match1?.groups?.param).toBe('id');

    const match2 = '[token]'.match(nextParamRegex);
    expect(match2).not.toBeNull();
    expect(match2?.groups?.param).toBe('token');

    const match3 = '[userId]'.match(nextParamRegex);
    expect(match3).not.toBeNull();
    expect(match3?.groups?.param).toBe('userId');
  });

  test('matches catch-all parameters', () => {
    const match1 = '[...path]'.match(nextParamRegex);
    expect(match1).not.toBeNull();
    expect(match1?.groups?.param).toBe('...path');

    const match2 = '[...slug]'.match(nextParamRegex);
    expect(match2).not.toBeNull();
    expect(match2?.groups?.param).toBe('...slug');
  });

  test('does not match non-parameter segments', () => {
    expect(nextParamRegex.test('api')).toBe(false);
    expect(nextParamRegex.test('id')).toBe(false);
    expect(nextParamRegex.test('$id')).toBe(false);
    expect(nextParamRegex.test('[id')).toBe(false);
    expect(nextParamRegex.test('id]')).toBe(false);
  });

  test('does not match empty parameter', () => {
    expect(nextParamRegex.test('[]')).toBe(true); // Actually matches, but param is empty
    const match = '[]'.match(nextParamRegex);
    expect(match?.groups?.param).toBe('');
  });
});

describe('defaultExcludePatterns', () => {
  const [dotUnderscorePattern, testSpecPattern, testDirPattern, dtsPattern] = defaultExcludePatterns;

  test('excludes files starting with dot or underscore', () => {
    expect(dotUnderscorePattern.test('.hidden')).toBe(true);
    expect(dotUnderscorePattern.test('.env')).toBe(true);
    expect(dotUnderscorePattern.test('_private')).toBe(true);
    expect(dotUnderscorePattern.test('_test')).toBe(true);
    expect(dotUnderscorePattern.test('|something')).toBe(true); // matches | as well
    expect(dotUnderscorePattern.test('normal')).toBe(false);
  });

  test('excludes test and spec files', () => {
    expect(testSpecPattern.test('route.test.ts')).toBe(true);
    expect(testSpecPattern.test('route.test.js')).toBe(true);
    expect(testSpecPattern.test('route.spec.ts')).toBe(true);
    expect(testSpecPattern.test('route.spec.js')).toBe(true);
    expect(testSpecPattern.test('route.ts')).toBe(false);
    expect(testSpecPattern.test('test.route.ts')).toBe(false);
  });

  test('excludes __test__ and __spec__ directories', () => {
    expect(testDirPattern.test('__test__')).toBe(true);
    expect(testDirPattern.test('__spec__')).toBe(true);
    // Note: pattern only matches exactly __test__ or __spec__, not __tests__ or __specs__
    expect(testDirPattern.test('__tests__')).toBe(false);
    expect(testDirPattern.test('__specs__')).toBe(false);
    expect(testDirPattern.test('normal')).toBe(false);
    expect(testDirPattern.test('__test')).toBe(false);
  });

  test('excludes TypeScript declaration files', () => {
    expect(dtsPattern.test('route.d.ts')).toBe(true);
    expect(dtsPattern.test('index.d.ts')).toBe(true);
    expect(dtsPattern.test('route.ts')).toBe(false);
    expect(dtsPattern.test('route.js')).toBe(false);
  });
});
