import { LexicalNode } from '../LexicalNode';
import { TextNode } from './LexicalTextNode';

export class TabNode extends TextNode {
  constructor() {
    super();
  }
}

export function $isTabNode(
  node: LexicalNode | null | undefined,
): node is TabNode {
  return node instanceof TabNode;
}
