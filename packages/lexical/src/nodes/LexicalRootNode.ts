import { LexicalNode } from '../LexicalNode';
import { ElementNode } from './LexicalElementNode';

export class RootNode extends ElementNode {
  constructor() {
    super();
  }
}

export function $createRootNode(): RootNode {
  return new RootNode();
}

export function $isRootNode(
  node: RootNode | LexicalNode | null | undefined,
): node is RootNode {
  return node instanceof RootNode;
}
