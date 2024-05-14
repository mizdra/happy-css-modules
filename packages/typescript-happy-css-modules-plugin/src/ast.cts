import ts from 'typescript/lib/tsserverlibrary';
import type { Config } from './config.cjs';

function positionOrRangeToIndex(positionOrRange: number | ts.TextRange): number {
  return typeof positionOrRange === 'number' ? positionOrRange : positionOrRange.pos;
}

/**
 * Get the `styles` property access expression at the specified position or range. (e.g. `styles.foo`)
 */
export function getStylesPropertyAccessExpression(
  sourceFile: ts.SourceFile,
  positionOrRange: number | ts.TextRange,
  config: Config,
): ts.PropertyAccessExpression | undefined {
  const index = positionOrRangeToIndex(positionOrRange);
  function getStylesPropertyAccessExpressionImpl(node: ts.Node): ts.PropertyAccessExpression | undefined {
    if (
      node.pos <= index &&
      index <= node.end &&
      ts.isPropertyAccessExpression(node) &&
      node.expression.getText() === config.exportedStylesName
    ) {
      return ts.forEachChild(node, getStylesPropertyAccessExpressionImpl) ?? node;
    }
    return ts.forEachChild(node, getStylesPropertyAccessExpressionImpl);
  }
  return getStylesPropertyAccessExpressionImpl(sourceFile);
}
