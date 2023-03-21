import { parseArgv } from './cli.js';

const baseArgs = ['node', 'hcm'];

describe('parseArgv', () => {
  test('pattern', () => {
    expect(parseArgv([...baseArgs, 'foo']).pattern).toStrictEqual('foo');
    expect(parseArgv([...baseArgs, '1']).pattern).toStrictEqual('1');

    // TODO: Support multiple patterns
    // parseArgv([...baseArgs, 'foo', 'bar']);
  });
  test('--watch', () => {
    expect(parseArgv([...baseArgs, '1.css', '--watch']).watch).toBe(true);
    expect(parseArgv([...baseArgs, '1.css', '--no-watch']).watch).toBe(false);
  });
  test('--localsConvention', () => {
    expect(parseArgv([...baseArgs, '1.css']).localsConvention).toBe(undefined);
    expect(parseArgv([...baseArgs, '1.css', '--localsConvention', 'camelCaseOnly']).localsConvention).toBe(
      'camelCaseOnly',
    );
    expect(parseArgv([...baseArgs, '1.css', '--localsConvention', 'camelCase']).localsConvention).toBe('camelCase');
    expect(parseArgv([...baseArgs, '1.css', '--localsConvention', 'dashesOnly']).localsConvention).toBe('dashesOnly');
    expect(parseArgv([...baseArgs, '1.css', '--localsConvention', 'dashes']).localsConvention).toBe('dashes');
  });
  test('--declarationMap', () => {
    expect(parseArgv([...baseArgs, '1.css', '--declarationMap']).declarationMap).toBe(true);
    expect(parseArgv([...baseArgs, '1.css', '--no-declarationMap']).declarationMap).toBe(false);
  });
  test('--sassLoadPaths', () => {
    expect(
      parseArgv([...baseArgs, '1.css', '--sassLoadPaths', 'dir1', '--sassLoadPaths', 'dir2']).sassLoadPaths,
    ).toStrictEqual(['dir1', 'dir2']);
    // Passing a number is treated as a string
    expect(parseArgv([...baseArgs, '1.css', '--sassLoadPaths', '1']).sassLoadPaths).toStrictEqual(['1']);
  });
  test('--lessIncludePaths', () => {
    expect(
      parseArgv([...baseArgs, '1.css', '--lessIncludePaths', 'dir1', '--lessIncludePaths', 'dir2']).lessIncludePaths,
    ).toStrictEqual(['dir1', 'dir2']);
    // Passing a number is treated as a string
    expect(parseArgv([...baseArgs, '1.css', '--lessIncludePaths', '1']).lessIncludePaths).toStrictEqual(['1']);
  });
  test('--webpackResolveAlias', () => {
    expect(
      parseArgv([...baseArgs, '1.css', '--webpackResolveAlias', '{ "key1": "value1", "key2": "value2" }'])
        .webpackResolveAlias,
    ).toStrictEqual({
      key1: 'value1',
      key2: 'value2',
    });
  });
  test('--postcssConfig', () => {
    expect(parseArgv([...baseArgs, '1.css', '--postcssConfig', '.']).postcssConfig).toBe('.');
    expect(parseArgv([...baseArgs, '1.css', '--postcssConfig', 'postcss.config.js']).postcssConfig).toBe(
      'postcss.config.js',
    );
  });
  test('--cache', () => {
    expect(parseArgv([...baseArgs, '1.css']).cache).toBe(true);
    expect(parseArgv([...baseArgs, '1.css', '--cache']).cache).toBe(true);
    expect(parseArgv([...baseArgs, '1.css', '--no-cache']).cache).toBe(false);
  });
  test('--cacheStrategy', () => {
    expect(parseArgv([...baseArgs, '1.css']).cacheStrategy).toBe('content');
    expect(parseArgv([...baseArgs, '1.css', '--cacheStrategy', 'metadata']).cacheStrategy).toBe('metadata');
  });
  test('--logLevel', () => {
    expect(parseArgv([...baseArgs, '1.css']).logLevel).toBe('info');
    expect(parseArgv([...baseArgs, '1.css', '--logLevel', 'debug']).logLevel).toBe('debug');
    expect(parseArgv([...baseArgs, '1.css', '--logLevel', 'silent']).logLevel).toBe('silent');
  });
});
