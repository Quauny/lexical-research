import invariant from '../../shared/src/invariant';
import { KlassConstructor } from './LexicalEditor';

export type NodeKey = string;

export type NodeMap = Map<NodeKey, LexicalNode>;

export type DOMExportOutput = {
  after?: (
    generatedElement: HTMLElement | DocumentFragment | Text | null | undefined,
  ) => HTMLElement | Text | null | undefined;
  element: HTMLElement | DocumentFragment | Text | null;
};

export class LexicalNode {
  ['constructor']!: KlassConstructor<typeof LexicalNode>;

  static getType(): string {
    invariant(
      false,
      'LexicalNode: Node %s does not implement .getType().',
      this.name,
    );
  }

  static transform(): ((node: LexicalNode) => void) | null {
    return null;
  }
}
