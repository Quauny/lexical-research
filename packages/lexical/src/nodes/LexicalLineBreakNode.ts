import { KlassConstructor } from '../LexicalEditor';
import { LexicalNode } from '../LexicalNode';

export class LineBreakNode extends LexicalNode {
  // @ts-ignore
  ['constructor']!: KlassConstructor<typeof LineBreakNode>;

  constructor() {
    super();
  }
}

export function $isLineBreakNode(
  node: LexicalNode | null | undefined,
): node is LineBreakNode {
  return node instanceof LineBreakNode;
}
