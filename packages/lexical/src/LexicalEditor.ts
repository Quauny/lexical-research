import { createEmptyEditorState, EditorState } from './LexicalEditorState';
import { DOMExportOutput, LexicalNode } from './LexicalNode';
import { internalGetActiveEditor } from './LexicalUpdates';
import { createUID } from './LexicalUtils';
import { LineBreakNode } from './nodes/LexicalLineBreakNode';
import { RootNode } from './nodes/LexicalRootNode';
import { TextNode } from './nodes/LexicalTextNode';
import { TabNode } from './nodes/LexicalTabNode';
import { ParagraphNode } from './nodes/LexicalParagraphNode';

type GenericConstructor<T> = new (...args: any[]) => T;
export type KlassConstructor<Cls extends GenericConstructor<any>> =
  GenericConstructor<InstanceType<Cls>> & { [k in keyof Cls]: Cls[k] };

export type Klass<T extends LexicalNode> =
  InstanceType<T['constructor']> extends T
    ? T['constructor']
    : GenericConstructor<T> & T['constructor'];

export type EditorConfig = {
  disableEvents?: boolean;
  namespace: string;
  theme: EditorThemeClasses;
};

export type LexicalNodeReplacement = {
  replace: Klass<LexicalNode>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  with: <T extends { new (...args: any): any }>(
    node: InstanceType<T>,
  ) => LexicalNode;
  withKlass?: Klass<LexicalNode>;
};

export type ErrorHandler = (error: Error) => void;

export type EditorThemeClassName = string;

export type EditorThemeClasses = {
  paragraph?: EditorThemeClassName;
  heading?: {
    h1?: EditorThemeClassName;
    h2?: EditorThemeClassName;
    h3?: EditorThemeClassName;
    h4?: EditorThemeClassName;
    h5?: EditorThemeClassName;
    h6?: EditorThemeClassName;
  };
};

export type HTMLConfig = {
  // TODO: Complete this
  export?: {};
  import?: {};
};

export type CreateEditorArgs = {
  disableEvents?: boolean;
  editorState?: EditorState;
  namespace?: string;
  nodes?: ReadonlyArray<Klass<LexicalNode> | LexicalNodeReplacement>;
  onError?: ErrorHandler;
  parentEditor?: LexicalEditor;
  editable?: boolean;
  theme?: EditorThemeClasses;
  html?: HTMLConfig;
};

export type Transform<T extends LexicalNode> = (node: T) => void;

export type RegisteredNode = {
  klass: Klass<LexicalNode>;
  transforms: Set<Transform<LexicalNode>>;
  replace: null | ((node: LexicalNode) => LexicalNode);
  replaceWithKlass: null | Klass<LexicalNode>;
  exportDOM?: (
    editor: LexicalEditor,
    targetNode: LexicalNode,
  ) => DOMExportOutput;
};

export type RegisteredNodes = Map<string, RegisteredNode>;

export function createEditor(editorConfig?: CreateEditorArgs): LexicalEditor {
  const config = editorConfig || {};
  const activeEditor = internalGetActiveEditor();
  const theme = config.theme || {};
  const parentEditor =
    editorConfig === undefined ? activeEditor : config.parentEditor || null;
  const disableEvents = config.disableEvents || false;
  const editorState = createEmptyEditorState();
  const namespace =
    config.namespace ||
    (parentEditor !== null ? parentEditor._config.namespace : createUID());
  const initialEditorState = config.editorState;
  const nodes = [
    RootNode,
    TextNode,
    LineBreakNode,
    TabNode,
    ParagraphNode,
    ...(config.nodes || []),
  ];
  const { onError, html } = config;
  const isEditable = config.editable !== undefined ? config.editable : true;
  let registeredNodes: Map<string, RegisteredNode>;

  const editor = new LexicalEditor();

  return editor;
}

export class LexicalEditor {
  ['constructor']!: KlassConstructor<typeof LexicalEditor>;

  _config: EditorConfig;
  _nodes: RegisteredNodes;
}
