import { KlassConstructor } from '../LexicalEditor';
import { LexicalNode } from '../LexicalNode';
import { ElementNode } from './LexicalElementNode';

export class ParagraphNode extends ElementNode {
  // @ts-ignore
  ['constructor']!: KlassConstructor<typeof ParagraphNode>;

  constructor() {
    super();
  }
}

export function $isParagraphNode(
  node: LexicalNode | null | undefined,
): node is ParagraphNode {
  return node instanceof ParagraphNode;
}
