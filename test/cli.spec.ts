import { parseArgv } from '../src/cli';

const baseArgs = ['node', 'tsm'];

let processExitSpy: jest.SpyInstance;
let consoleErrorSpy: jest.SpyInstance;

beforeEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => ({} as unknown as never));
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  processExitSpy.mockRestore();
  consoleErrorSpy.mockRestore();
});

describe('parseArgv', () => {
  test('pattern', () => {
    expect(parseArgv([...baseArgs, 'foo']).pattern).toStrictEqual('foo');
    expect(parseArgv([...baseArgs, '1']).pattern).toStrictEqual('1');

    parseArgv([...baseArgs, 'foo', 'bar']);
    expect(processExitSpy).lastCalledWith(1);
    expect(consoleErrorSpy).lastCalledWith('Only one pattern is allowed.');
  });
  test('--outDir', () => {
    expect(parseArgv([...baseArgs, '--outDir', 'foo']).outDir).toStrictEqual('foo');
    expect(parseArgv([...baseArgs, '--outDir', '1']).outDir).toStrictEqual('1');
  });
  test('--watch', () => {
    expect(parseArgv([...baseArgs, '--watch']).watch).toBe(true);
    expect(parseArgv([...baseArgs, '--no-watch']).watch).toBe(false);
  });
  test('--namedExport', () => {
    expect(parseArgv([...baseArgs, '--namedExport']).namedExport).toBe(true);
    expect(parseArgv([...baseArgs, '--no-namedExport']).namedExport).toBe(false);
  });
  test('--declarationMap', () => {
    expect(parseArgv([...baseArgs, '--declarationMap']).declarationMap).toBe(true);
    expect(parseArgv([...baseArgs, '--no-declarationMap']).declarationMap).toBe(false);
  });
  test('--silent', () => {
    expect(parseArgv([...baseArgs, '--silent']).silent).toBe(true);
    expect(parseArgv([...baseArgs, '--no-silent']).silent).toBe(false);
  });
});
