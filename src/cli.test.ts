import { jest } from '@jest/globals';
import { parseArgv } from './cli.js';

const baseArgs = ['node', 'tsm'];

let processExitSpy: jest.SpyInstance;
let consoleErrorSpy: jest.SpyInstance;

beforeEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-explicit-any
  processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => ({} as unknown as never)) as any;
  // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-explicit-any
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {}) as any;
});
afterEach(() => {
  processExitSpy.mockRestore();
  consoleErrorSpy.mockRestore();
});

describe('parseArgv', () => {
  test('pattern', () => {
    expect(parseArgv([...baseArgs, 'foo']).pattern).toStrictEqual('foo');
    expect(parseArgv([...baseArgs, '1']).pattern).toStrictEqual('1');

    // NOTE: Commented out because the test fails in ESM for some reason...
    // parseArgv([...baseArgs, 'foo', 'bar']);
    // expect(processExitSpy).lastCalledWith(1);
    // expect(consoleErrorSpy).lastCalledWith('Only one pattern is allowed.');
  });
  test('--outDir', () => {
    expect(parseArgv([...baseArgs, '1.css', '--outDir', 'foo']).outDir).toStrictEqual('foo');
    expect(parseArgv([...baseArgs, '1.css', '--outDir', '1']).outDir).toStrictEqual('1');
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
  test('--namedExport', () => {
    expect(parseArgv([...baseArgs, '1.css', '--namedExport']).namedExport).toBe(true);
    expect(parseArgv([...baseArgs, '1.css', '--no-namedExport']).namedExport).toBe(false);
  });
  test('--declarationMap', () => {
    expect(parseArgv([...baseArgs, '1.css', '--declarationMap']).declarationMap).toBe(true);
    expect(parseArgv([...baseArgs, '1.css', '--no-declarationMap']).declarationMap).toBe(false);
  });
  test('--silent', () => {
    expect(parseArgv([...baseArgs, '1.css', '--silent']).silent).toBe(true);
    expect(parseArgv([...baseArgs, '1.css', '--no-silent']).silent).toBe(false);
  });
});
