import { KlassConstructor } from '../LexicalEditor';
import { LexicalNode } from '../LexicalNode';

export class ElementNode extends LexicalNode {
  // @ts-ignore
  ['constructor']!: KlassConstructor<typeof TextNode>;

  constructor() {
    super();
  }
}

export function $isElementNode(
  node: LexicalNode | null | undefined,
): node is ElementNode {
  return node instanceof ElementNode;
}
