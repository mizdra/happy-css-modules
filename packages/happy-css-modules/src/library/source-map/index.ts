import { SourceNode as OriginalSourceNode, type CodeWithSourceMap } from 'source-map';

// TODO: Open PR to mozilla/source-map

// The type definitions bundled in the source-map package are incorrect.
// Therefore, the type definitions are overwritten here.

// eslint-disable-next-line no-use-before-define
type Chunk = string | StrictlyTypedSourceNode | Chunk[];

interface StrictlyTypedSourceNode extends OriginalSourceNode {
  // eslint-disable-next-line @typescript-eslint/no-misused-new
  new (line: number | null, column: number | null, source: string | null): StrictlyTypedSourceNode;
  // eslint-disable-next-line @typescript-eslint/no-misused-new
  new (
    line: number | null,
    column: number | null,
    source: string | null,
    chunk?: Chunk,
    name?: string,
  ): StrictlyTypedSourceNode;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SourceNode: StrictlyTypedSourceNode = OriginalSourceNode as any;

export { SourceNode, type CodeWithSourceMap };
