import { createEmptyEditorState, EditorState } from './LexicalEditorState';
import {
  DOMConversion,
  DOMConversionMap,
  DOMExportOutput,
  DOMExportOutputMap,
  LexicalNode,
} from './LexicalNode';
import { internalGetActiveEditor } from './LexicalUpdates';
import { createUID, getCachedClassNameArray } from './LexicalUtils';
import { LineBreakNode } from './nodes/LexicalLineBreakNode';
import { RootNode } from './nodes/LexicalRootNode';
import { TextNode } from './nodes/LexicalTextNode';
import { TabNode } from './nodes/LexicalTabNode';
import { ParagraphNode } from './nodes/LexicalParagraphNode';
import { FULL_RECONCILE } from './LexicalConstants';

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
  [key: string]: any;
};

export type HTMLConfig = {
  export?: DOMExportOutputMap;
  import?: DOMConversionMap;
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

type DOMConversionCache = Map<
  string,
  Array<(node: Node) => DOMConversion | null>
>;

function initializeConversionCache(
  nodes: RegisteredNodes,
  additionalConversions?: DOMConversionMap,
): DOMConversionCache {
  const conversionCache = new Map();
  const handledConversions = new Set();
  const addConversionsToCache = (map: DOMConversionMap) => {
    Object.keys(map).forEach(key => {
      let currentCache = conversionCache.get(key);

      if (currentCache === undefined) {
        currentCache = [];
        conversionCache.set(key, currentCache);
      }

      currentCache.push(map[key]);
    });
  };
  nodes.forEach(node => {
    const importDOM = node.klass.importDOM;

    if (importDOM == null || handledConversions.has(importDOM)) {
      return;
    }

    handledConversions.add(importDOM);
    const map = importDOM.call(node.klass);

    if (map !== null) {
      addConversionsToCache(map);
    }
  });
  if (additionalConversions) {
    addConversionsToCache(additionalConversions);
  }
  return conversionCache;
}

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

  if (editorConfig === undefined && activeEditor !== null) {
    registeredNodes = activeEditor._nodes;
  } else {
    registeredNodes = new Map();
    for (let i = 0; i < nodes.length; i++) {
      let klass = nodes[i];
      let replace: RegisteredNode['replace'] = null;
      let replaceWithKlass: RegisteredNode['replaceWithKlass'] = null;

      if (typeof klass !== 'function') {
        const options = klass;
        klass = options.replace;
        replace = options.with;
        replaceWithKlass = options.withKlass || null;
      }

      const type = klass.getType();
      const transform = klass.transform();
      const transforms = new Set<Transform<LexicalNode>>();
      if (transform !== null) {
        transforms.add(transform);
      }

      registeredNodes.set(type, {
        exportDOM: html && html.export ? html.export.get(klass) : undefined,
        klass,
        replace,
        replaceWithKlass,
        transforms,
      });
    }
  }

  const editor = new LexicalEditor(
    editorState,
    parentEditor,
    registeredNodes,
    {
      disableEvents,
      namespace,
      theme,
    },
    onError ? onError : console.error,
    initializeConversionCache(registeredNodes, html ? html.import : undefined),
    isEditable,
  );

  if (initialEditorState !== undefined) {
    editor._pendingEditorState = initialEditorState;
    editor._dirtyType = FULL_RECONCILE;
  }

  return editor;
}

export class LexicalEditor {
  ['constructor']!: KlassConstructor<typeof LexicalEditor>;

  _parentEditor: null | LexicalEditor;
  _rootElement: null | HTMLElement;
  _editorState: EditorState;
  _pendingEditorState: null | EditorState;
  _config: EditorConfig;
  _dirtyType: 0 | 1 | 2;
  _nodes: RegisteredNodes;
  _htmlConversions: DOMConversionCache;
  _onError: ErrorHandler;
  _editable: boolean;

  constructor(
    editorState: EditorState,
    parentEditor: null | LexicalEditor,
    nodes: RegisteredNodes,
    config: EditorConfig,
    onError: ErrorHandler,
    htmlConversions: DOMConversionCache,
    editable: boolean,
  ) {
    this._parentEditor = parentEditor;
    this._rootElement = null;
    this._editorState = editorState;
    this._pendingEditorState = null;
    this._config = config;
    this._nodes = nodes;
    this._onError = onError;
    this._htmlConversions = htmlConversions;
    this._editable = editable;
  }

  setRootElement(nextRootElement: null | HTMLElement): void {
    const prevRootElement = this._rootElement;

    if (nextRootElement !== prevRootElement) {
      const classNames = getCachedClassNameArray(this._config.theme, 'root');
      const pendingEditorState = this._pendingEditorState || this._editorState;
      this._rootElement = nextRootElement;
      // TODO: continue here
    }
  }
}
