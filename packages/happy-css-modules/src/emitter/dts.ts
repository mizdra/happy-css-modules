import { EOL } from 'os';
import { basename, parse, join } from 'path';
import camelcase from 'camelcase';
import { SourceNode, type CodeWithSourceMap } from '../library/source-map/index.js';
import type { ImportedAllTokensFromModule, LocalToken, TokenInfo } from '../locator/index.js';
import { type LocalsConvention } from '../runner.js';
import { getRelativePath, type DtsFormatOptions } from './index.js';

/**
 * Get .d.ts file path.
 * @param filePath The path to the source file (i.e. `/dir/foo.css`). It is absolute.
 * @param arbitraryExtensions Generate `.d.css.ts` instead of `.css.d.ts`.
 * @returns The path to the .d.ts file. It is absolute.
 */
export function getDtsFilePath(filePath: string, arbitraryExtensions: boolean): string {
  if (arbitraryExtensions) {
    const { dir, name, ext } = parse(filePath);
    return join(dir, `${name}.d${ext}.ts`);
  } else {
    return `${filePath}.d.ts`;
  }
}

function dashesCamelCase(str: string): string {
  return str.replace(/-+(\w)/gu, (match, firstLetter) => {
    return firstLetter.toUpperCase();
  });
}

function formatLocalToken(localToken: LocalToken, localsConvention: LocalsConvention): string[] {
  const result: string[] = [];
  if (localsConvention === 'camelCaseOnly') {
    result.push(camelcase(localToken.name));
  } else if (localsConvention === 'camelCase') {
    result.push(localToken.name);
    result.push(camelcase(localToken.name));
  } else if (localsConvention === 'dashesOnly') {
    result.push(dashesCamelCase(localToken.name));
  } else if (localsConvention === 'dashes') {
    result.push(localToken.name);
    result.push(dashesCamelCase(localToken.name));
  } else {
    result.push(localToken.name); // asIs
  }
  return result;
}

function generateTokenDeclarationsForLocalToken(
  filePath: string,
  sourceMapFilePath: string,
  localToken: LocalToken,
  dtsFormatOptions: DtsFormatOptions | undefined,
  isExternalFile: (filePath: string) => boolean,
): (typeof SourceNode)[] {
  const result: (typeof SourceNode)[] = [];

  // Only one original position can be associated with one generated position.
  // This is due to the sourcemap specification. Therefore, we output multiple type definitions
  // with the same name and assign a separate original position to each.
  const formattedTokenNames = formatLocalToken(localToken, dtsFormatOptions?.localsConvention);
  for (const formattedTokenName of formattedTokenNames) {
    let originalLocation = localToken.originalLocation;
    if (originalLocation.filePath === undefined) {
      // If the original location is not specified, fallback to the source file.
      originalLocation = {
        filePath,
        start: { line: 1, column: 1 },
        end: { line: 1, column: 1 },
      };
    }

    result.push(
      originalLocation.filePath === filePath || isExternalFile(originalLocation.filePath)
        ? new SourceNode(null, null, null, [
            '& Readonly<{ ',
            new SourceNode(
              originalLocation.start.line ?? null,
              // The SourceNode's column is 0-based, but the originalLocation's column is 1-based.
              originalLocation.start.column - 1 ?? null,
              getRelativePath(sourceMapFilePath, originalLocation.filePath),
              `"${formattedTokenName}"`,
              formattedTokenName,
            ),
            ': string }>',
          ])
        : // Imported tokens in non-external files are typed by dynamic import.
          // See https://github.com/mizdra/happy-css-modules/issues/106.
          new SourceNode(null, null, null, [
            '& Readonly<Pick<(typeof import(',
            `"${getRelativePath(filePath, originalLocation.filePath)}"`,
            '))["default"], ',
            `"${formattedTokenName}"`,
            '>>',
          ]),
    );
  }
  return result;
}

function generateTokenDeclarationForImportedAllTokensFromModule(
  filePath: string,
  importedAllTokensFromModule: ImportedAllTokensFromModule,
): typeof SourceNode {
  return new SourceNode(null, null, null, [
    '& Readonly<typeof import(',
    `"${getRelativePath(filePath, importedAllTokensFromModule.filePath)}"`,
    ')["default"]>',
  ]);
}

function generateTokenDeclarations(
  filePath: string,
  sourceMapFilePath: string,
  tokenInfos: TokenInfo[],
  dtsFormatOptions: DtsFormatOptions | undefined,
  isExternalFile: (filePath: string) => boolean,
): (typeof SourceNode)[] {
  const result: (typeof SourceNode)[] = [];

  for (const tokenInfo of tokenInfos) {
    if (tokenInfo.type === 'localToken') {
      result.push(
        ...generateTokenDeclarationsForLocalToken(
          filePath,
          sourceMapFilePath,
          tokenInfo,
          dtsFormatOptions,
          isExternalFile,
        ),
      );
    } else if (tokenInfo.type === 'importedAllTokensFromModule') {
      if (!isExternalFile(tokenInfo.filePath)) {
        result.push(generateTokenDeclarationForImportedAllTokensFromModule(filePath, tokenInfo));
      }
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _: never = tokenInfo;
    }
  }
  return result;
}

// eslint-disable-next-line max-params
export function generateDtsContentWithSourceMap(
  filePath: string,
  dtsFilePath: string,
  sourceMapFilePath: string,
  tokenInfos: TokenInfo[],
  dtsFormatOptions: DtsFormatOptions | undefined,
  isExternalFile: (filePath: string) => boolean,
): { dtsContent: CodeWithSourceMap['code']; sourceMap: CodeWithSourceMap['map'] } {
  const tokenDeclarations = generateTokenDeclarations(
    filePath,
    sourceMapFilePath,
    tokenInfos,
    dtsFormatOptions,
    isExternalFile,
  );

  let sourceNode: typeof SourceNode;
  if (!tokenDeclarations || !tokenDeclarations.length) {
    sourceNode = new SourceNode(null, null, null, '');
  } else {
    sourceNode = new SourceNode(1, 0, getRelativePath(sourceMapFilePath, filePath), [
      `declare const styles:${EOL}`,
      ...tokenDeclarations.map((tokenDeclaration) => ['  ', tokenDeclaration, EOL]),
      `;${EOL}`,
      `export default styles;${EOL}`,
    ]);
  }
  const codeWithSourceMap = sourceNode.toStringWithSourceMap({
    // Since sourcemap and type definitions are in the same directory, they can be referenced by relative paths.
    file: basename(dtsFilePath),
    sourceRoot: '',
  });
  return {
    dtsContent: codeWithSourceMap.code,
    sourceMap: codeWithSourceMap.map,
  };
}
