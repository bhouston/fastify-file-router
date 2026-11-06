import { describe, expect, test } from 'vitest';
import { toHttpMethod, toRouteNextStyle, toRouteRemixStyle, toRoutePaths } from './routeConverter.js';

describe('toHttpMethod', () => {
  test('validates and returns valid HTTP methods', () => {
    expect(toHttpMethod('get', '/test')).toBe('get');
    expect(toHttpMethod('post', '/test')).toBe('post');
    expect(toHttpMethod('put', '/test')).toBe('put');
    expect(toHttpMethod('patch', '/test')).toBe('patch');
    expect(toHttpMethod('delete', '/test')).toBe('delete');
    expect(toHttpMethod('head', '/test')).toBe('head');
  });

  test('throws error for invalid methods', () => {
    expect(() => toHttpMethod('invalid', '/test/file.ts')).toThrow('Invalid method "invalid" in file /test/file.ts');
    expect(() => toHttpMethod('', '/test/file.ts')).toThrow('Invalid method "" in file /test/file.ts');
  });
});

describe('toRouteRemixStyle', () => {
  test('converts simple segments to route path', () => {
    expect(toRouteRemixStyle(['api', 'health'], '/test')).toBe('api/health');
    expect(toRouteRemixStyle(['api', 'users'], '/test')).toBe('api/users');
  });

  test('converts remix-style parameters', () => {
    expect(toRouteRemixStyle(['api', 'users', '$id'], '/test')).toBe('api/users/:id');
    expect(toRouteRemixStyle(['api', 'files', '$id'], '/test')).toBe('api/files/:id');
    expect(toRouteRemixStyle(['api', 'files', 'token', '$token'], '/test')).toBe('api/files/token/:token');
  });

  test('converts catch-all parameters', () => {
    expect(toRouteRemixStyle(['api', 'files', 'hashes', '$'], '/test')).toBe('api/files/hashes/*');
  });

  test('handles nested routes', () => {
    expect(toRouteRemixStyle(['api', 'users', '$id', 'posts'], '/test')).toBe('api/users/:id/posts');
  });

  test('converts literal dots using [.] notation', () => {
    expect(toRouteRemixStyle(['api', 'v1', '[.]', '0'], '/test')).toBe('api/v1.0');
    expect(toRouteRemixStyle(['api', 'v1', '[.]', '0', 'status'], '/test')).toBe('api/v1.0/status');
    expect(toRouteRemixStyle(['api', 'v1', '[.]', '0', '[.]', '1'], '/test')).toBe('api/v1.0.1');
  });

  test('stops parameter extraction at [.] - parameter ends before literal dot', () => {
    expect(toRouteRemixStyle(['$assetName', '[.]', 'glb'], '/test')).toBe(':assetName.glb');
    expect(toRouteRemixStyle(['api', '$fileName', '[.]', 'json'], '/test')).toBe('api/:fileName.json');
    expect(toRouteRemixStyle(['files', '$id', '[.]', 'txt'], '/test')).toBe('files/:id.txt');
  });

  test('throws error for [.] at start of route', () => {
    expect(() => toRouteRemixStyle(['[.]', 'api'], '/test/file.ts')).toThrow(
      'Invalid segment "[.]" at start of route in file /test/file.ts',
    );
  });

  test('throws error for invalid segments', () => {
    expect(() => toRouteRemixStyle(['api', '[id]'], '/test/file.ts')).toThrow(
      'Invalid segment "[id]" in file /test/file.ts',
    );
    expect(() => toRouteRemixStyle(['api', 'test&bad'], '/test/file.ts')).toThrow(
      'Invalid segment "test&bad" in file /test/file.ts',
    );
  });
});

describe('toRouteNextStyle', () => {
  test('converts simple segments to route path', () => {
    expect(toRouteNextStyle(['api', 'health'], '/test')).toBe('api/health');
    expect(toRouteNextStyle(['api', 'users'], '/test')).toBe('api/users');
  });

  test('converts next.js-style parameters', () => {
    expect(toRouteNextStyle(['api', 'users', '[id]'], '/test')).toBe('api/users/:id');
    expect(toRouteNextStyle(['api', 'files', '[id]'], '/test')).toBe('api/files/:id');
    expect(toRouteNextStyle(['api', 'files', 'token', '[token]'], '/test')).toBe('api/files/token/:token');
  });

  test('converts catch-all parameters', () => {
    expect(toRouteNextStyle(['api', 'files', 'hashes', '[...path]'], '/test')).toBe('api/files/hashes/*');
  });

  test('converts literal dots using [.] notation', () => {
    expect(toRouteNextStyle(['api', 'v1', '[.]', '0'], '/test')).toBe('api/v1.0');
    expect(toRouteNextStyle(['api', 'v1', '[.]', '0', 'status'], '/test')).toBe('api/v1.0/status');
    expect(toRouteNextStyle(['api', 'v1', '[.]', '0', '[.]', '1'], '/test')).toBe('api/v1.0.1');
  });

  // Optional parameters with double brackets are not currently supported
  // test('handles optional parameters', () => {
  //   expect(toRouteNextStyle(['api', 'users', '[[id]]'], '/test')).toBe('api/users/:id');
  // });

  test('throws error for invalid segments', () => {
    expect(() => toRouteNextStyle(['api', 'test&bad'], '/test/file.ts')).toThrow(
      'Invalid segment "test&bad" in file /test/file.ts',
    );
    // $ prefix is Remix style, not Next.js
    expect(() => toRouteNextStyle(['api', '$id'], '/test/file.ts')).toThrow(
      'Invalid segment "$id" in file /test/file.ts',
    );
  });

  test('throws error for [.] at start of route', () => {
    expect(() => toRouteNextStyle(['[.]', 'api'], '/test/file.ts')).toThrow(
      'Invalid segment "[.]" at start of route in file /test/file.ts',
    );
  });

  test('throws error for empty parameter', () => {
    expect(() => toRouteNextStyle(['api', '[]'], '/test/file.ts')).toThrow('Invalid segment "[]" in convention "next"');
  });
});

describe('optional suffix blocks', () => {
  test.each(['remix', 'next'] as const)('expands %s suffixes and preserves compound extensions', (convention) => {
    const name = convention === 'remix' ? '$assetName' : '[assetName]';
    expect(toRoutePaths(['media', `${name}?[@version]`, '[.]', 'ultrahdr', '[.]', 'jpg'], convention, '/test')).toEqual(
      ['media/:assetName([^@]+)@:version([^@]+).ultrahdr.jpg', 'media/:assetName([^@]+).ultrahdr.jpg'],
    );
  });

  test('supports explicit parameter markers and independent optional suffixes', () => {
    expect(toRoutePaths(['$asset?[@$version]', '$file?[-locale]'], 'remix', '/test')).toHaveLength(4);
  });

  test('avoids collisions with internal parameter placeholders', () => {
    expect(toRoutePaths(['$__ffr_optional_0__', '$asset?[@version]'], 'remix', '/test')[0]).toContain(
      ':__ffr_optional_0__/',
    );
  });

  test.each([
    '$asset?[]',
    '$asset?[@]',
    '$asset?[@asset]',
    '$asset?[@version',
    '$asset?[@version]extra',
    '$asset?[$version]',
    '$asset?[@one]?[@two]',
    'asset?[@version]',
    '$asset?[@bad-name]',
  ])('rejects malformed segment %s', (segment) => {
    expect(() => toRoutePaths([segment], 'remix', '/example.ts')).toThrow('Invalid optional segment');
  });

  test('rejects optional suffixes using the wrong convention', () => {
    expect(() => toRoutePaths(['$asset?[@version]'], 'next', '/test')).toThrow('expected [name]?[@version]');
  });
});
