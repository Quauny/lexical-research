import { KlassConstructor } from '../LexicalEditor';
import { LexicalNode } from '../LexicalNode';

export class TextNode extends LexicalNode {
  // @ts-ignore
  ['constructor']!: KlassConstructor<typeof TextNode>;

  constructor() {
    super();
  }
}

export function $isTextNode(
  node: LexicalNode | null | undefined,
): node is TextNode {
  return node instanceof TextNode;
}
