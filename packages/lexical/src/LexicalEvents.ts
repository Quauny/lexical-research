import invariant from '../../shared/src/invariant';
import { DOM_ELEMENT_TYPE, DOM_TEXT_TYPE } from './LexicalConstants';
import { LexicalEditor } from './LexicalEditor';
import {
  $getPreviousSelection,
  $internalCreateRangeSelection,
} from './LexicalSelection';
import { updateEditor } from './LexicalUpdates';
import {
  $setSelection,
  getDOMSelection,
  getEditorPropertyFromDOMNode,
  getEditorsToPropagate,
  getNearestEditorFromDOMNode,
  isLexicalEditor,
} from './LexicalUtils';

const rootElementsRegistered = new WeakMap<Document, number>();
let isSelectionChangeFromMouseDown = false;
// Mapping root editors to their active nested editors, contains nested editors
// mapping only, so if root editor is selected map will have no reference to free up memory
const activeNestedEditorsMap: Map<string, LexicalEditor> = new Map();

function cleanActiveNestedEditorsMap(editor: LexicalEditor) {
  if (editor._parentEditor !== null) {
    // For nested editor cleanup map if this editor was marked as active
    const editors = getEditorsToPropagate(editor);
    const rootEditor = editors[editors.length - 1];
    const rootEditorKey = rootEditor._key;

    if (activeNestedEditorsMap.get(rootEditorKey) === editor) {
      activeNestedEditorsMap.delete(rootEditorKey);
    }
  } else {
    // For top-level editors cleanup map
    activeNestedEditorsMap.delete(editor._key);
  }
}

type RootElementRemoveHandles = Array<() => void>;

function getRootElementRemoveHandles(
  rootElement: HTMLElement,
): RootElementRemoveHandles {
  // @ts-expect-error: internal field
  let eventHandles = rootElement.__lexicalEventHandles;

  if (eventHandles === undefined) {
    eventHandles = [];
    // @ts-expect-error: internal field
    rootElement.__lexicalEventHandles = eventHandles;
  }

  return eventHandles;
}

function onSelectionChange(
  domSelection: Selection,
  editor: LexicalEditor,
  isActive: boolean,
): void {
  // TODO: Implement this function
}

function onDocumentSelectionChange(event: Event): void {
  const target = event.target as null | Element | Document;
  const targetWindow =
    target == null
      ? null
      : target.nodeType === 9
        ? (target as Document).defaultView
        : (target as Element).ownerDocument.defaultView;
  const domSelection = getDOMSelection(targetWindow);
  if (domSelection === null) {
    return;
  }
  const nextActiveEditor = getNearestEditorFromDOMNode(domSelection.anchorNode);
  if (nextActiveEditor === null) {
    return;
  }

  if (isSelectionChangeFromMouseDown) {
    isSelectionChangeFromMouseDown = false;
    updateEditor(nextActiveEditor, () => {
      const lastSelection = $getPreviousSelection();
      const domAnchorNode = domSelection.anchorNode;
      if (domAnchorNode === null) {
        return;
      }
      const nodeType = domAnchorNode.nodeType;
      // If the user is attempting to click selection back onto text, then
      // we should attempt create a range selection.
      // When we click on an empty paragraph node or the end of a paragraph that ends
      // with an image/poll, the nodeType will be ELEMENT_NODE
      if (nodeType !== DOM_ELEMENT_TYPE && nodeType !== DOM_TEXT_TYPE) {
        return;
      }
      const newSelection = $internalCreateRangeSelection(
        lastSelection,
        domSelection,
        nextActiveEditor,
        event,
      );
      // @ts-ignore
      // TODO: fix range selection type
      $setSelection(newSelection);
    });
  }

  // When editor receives selection change event, we're checking if
  // it has any sibling editors (within same parent editor) that were active
  // before, and trigger selection change on it to nullify selection.
  const editors = getEditorsToPropagate(nextActiveEditor);
  const rootEditor = editors[editors.length - 1];
  const rootEditorKey = rootEditor._key;
  const activeNestedEditor = activeNestedEditorsMap.get(rootEditorKey);
  const prevActiveEditor = activeNestedEditor || rootEditor;

  if (prevActiveEditor !== nextActiveEditor) {
    onSelectionChange(domSelection, prevActiveEditor, false);
  }

  onSelectionChange(domSelection, nextActiveEditor, true);

  // If newly selected editor is nested, then add it to the map, clean map otherwise
  if (nextActiveEditor !== rootEditor) {
    activeNestedEditorsMap.set(rootEditorKey, nextActiveEditor);
  } else if (activeNestedEditor) {
    activeNestedEditorsMap.delete(rootEditorKey);
  }
}

export function removeRootElementEvents(rootElement: HTMLElement): void {
  const doc = rootElement.ownerDocument;
  const documentRootElementsCount = rootElementsRegistered.get(doc);
  invariant(
    documentRootElementsCount !== undefined,
    'Root element not registered',
  );

  // We only want to have a single global selectionchange event handler, shared
  // between all editor instances.
  const newCount = documentRootElementsCount - 1;
  invariant(newCount >= 0, 'Root element count less than 0');
  rootElementsRegistered.set(doc, newCount);
  if (newCount === 0) {
    doc.removeEventListener('selectionchange', onDocumentSelectionChange);
  }

  const editor = getEditorPropertyFromDOMNode(rootElement);

  if (isLexicalEditor(editor)) {
    cleanActiveNestedEditorsMap(editor);
    // @ts-expect-error: internal field
    rootElement.__lexicalEditor = null;
  } else if (editor) {
    invariant(
      false,
      'Attempted to remove event handlers from a node that does not belong to this build of Lexical',
    );
  }

  const removeHandles = getRootElementRemoveHandles(rootElement);

  for (let i = 0; i < removeHandles.length; i++) {
    removeHandles[i]();
  }

  // @ts-expect-error: internal field
  rootElement.__lexicalEventHandles = [];
}
