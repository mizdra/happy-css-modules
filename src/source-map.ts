import { SourceNode as OriginalSourceNode, CodeWithSourceMap } from 'source-map';

// The type definitions bundled in the source-map package are incorrect.
// Therefore, the type definitions are overwritten here.

type Chunk = string | StrictlyTypedSourceNode | Chunk[];

interface StrictlyTypedSourceNode extends OriginalSourceNode {
  new (line: number | null, column: number | null, source: string | null): StrictlyTypedSourceNode;
  new (
    line: number | null,
    column: number | null,
    source: string | null,
    chunk?: Chunk,
    name?: string,
  ): StrictlyTypedSourceNode;
}

const SourceNode: StrictlyTypedSourceNode = OriginalSourceNode as any;

export { SourceNode, CodeWithSourceMap };
