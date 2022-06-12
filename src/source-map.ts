import { SourceNode as OriginalSourceNode, CodeWithSourceMap } from 'source-map';

// The type definitions bundled in the source-map package are incorrect.
// Therefore, the type definitions are overwritten here.

type Chunk = string | StrictlyTypedSourceNode | Chunk[];

declare class StrictlyTypedSourceNode extends OriginalSourceNode {
  constructor(line: number | null, column: number | null, source: string | null);
  constructor(line: number | null, column: number | null, source: string | null, chunk?: Chunk, name?: string);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SourceNode: StrictlyTypedSourceNode = OriginalSourceNode as any;

export { SourceNode, CodeWithSourceMap };
