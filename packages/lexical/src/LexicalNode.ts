import { KlassConstructor } from './LexicalEditor';

export type NodeKey = string;

export type NodeMap = Map<NodeKey, LexicalNode>;

export class LexicalNode {
  ['constructor']!: KlassConstructor<typeof LexicalNode>;
}
