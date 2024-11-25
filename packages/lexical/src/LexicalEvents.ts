import invariant from '../../shared/src/invariant';
import {
  BLUR_COMMAND,
  COPY_COMMAND,
  CUT_COMMAND,
  DRAGEND_COMMAND,
  DRAGOVER_COMMAND,
  DRAGSTART_COMMAND,
  DROP_COMMAND,
  FOCUS_COMMAND,
  PASTE_COMMAND,
} from './LexicalCommands';
import { DOM_ELEMENT_TYPE, DOM_TEXT_TYPE } from './LexicalConstants';
import { LexicalEditor } from './LexicalEditor';
import {
  $getPreviousSelection,
  $internalCreateRangeSelection,
} from './LexicalSelection';
import { updateEditor } from './LexicalUpdates';
import {
  $setSelection,
  dispatchCommand,
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

type RootElementEvents = Array<
  [
    string,
    Record<string, unknown> | ((event: Event, editor: LexicalEditor) => void),
  ]
>;

const PASS_THROUGH_COMMAND = Object.freeze({});
const rootElementEvents: RootElementEvents = [
  ['keydown', onKeyDown],
  ['pointerdown', onPointerDown],
  ['compositionstart', onCompositionStart],
  ['compositionend', onCompositionEnd],
  ['input', onInput],
  ['click', onClick],
  ['cut', PASS_THROUGH_COMMAND],
  ['copy', PASS_THROUGH_COMMAND],
  ['dragstart', PASS_THROUGH_COMMAND],
  ['dragover', PASS_THROUGH_COMMAND],
  ['dragend', PASS_THROUGH_COMMAND],
  ['paste', PASS_THROUGH_COMMAND],
  ['focus', PASS_THROUGH_COMMAND],
  ['blur', PASS_THROUGH_COMMAND],
  ['drop', PASS_THROUGH_COMMAND],
];

function onKeyDown(event: KeyboardEvent, editor: LexicalEditor): void {}
function onPointerDown(event: PointerEvent, editor: LexicalEditor) {}
function onCompositionStart(
  event: CompositionEvent,
  editor: LexicalEditor,
): void {}
function onCompositionEnd(
  event: CompositionEvent,
  editor: LexicalEditor,
): void {}
function onInput(event: InputEvent, editor: LexicalEditor): void {}
function onClick(event: PointerEvent, editor: LexicalEditor): void {}

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

function stopLexicalPropagation(event: Event): void {
  // We attach a special property to ensure the same event doesn't re-fire
  // for parent editors.
  // @ts-ignore
  event._lexicalHandled = true;
}

function hasStoppedLexicalPropagation(event: Event): boolean {
  // @ts-ignore
  const stopped = event._lexicalHandled === true;
  return stopped;
}

export function addRootElementEvents(
  rootElement: HTMLElement,
  editor: LexicalEditor,
): void {
  // We only want to have a single global selectionchange event handler, shared
  // between all editor instances.
  const doc = rootElement.ownerDocument;
  const documentRootElementsCount = rootElementsRegistered.get(doc);
  if (
    documentRootElementsCount === undefined ||
    documentRootElementsCount < 1
  ) {
    doc.addEventListener('selectionchange', onDocumentSelectionChange);
  }
  rootElementsRegistered.set(doc, (documentRootElementsCount || 0) + 1);

  // @ts-expect-error: internal field
  rootElement.__lexicalEditor = editor;
  const removeHandles = getRootElementRemoveHandles(rootElement);

  for (let i = 0; i < rootElementEvents.length; i++) {
    const [eventName, onEvent] = rootElementEvents[i];
    const eventHandler =
      typeof onEvent === 'function'
        ? (event: Event) => {
            if (hasStoppedLexicalPropagation(event)) {
              return;
            }
            stopLexicalPropagation(event);
            if (editor.isEditable() || eventName === 'click') {
              onEvent(event, editor);
            }
          }
        : (event: Event) => {
            if (hasStoppedLexicalPropagation(event)) {
              return;
            }
            stopLexicalPropagation(event);
            const isEditable = editor.isEditable();
            switch (eventName) {
              case 'cut':
                return (
                  isEditable &&
                  dispatchCommand(editor, CUT_COMMAND, event as ClipboardEvent)
                );

              case 'copy':
                return dispatchCommand(
                  editor,
                  COPY_COMMAND,
                  event as ClipboardEvent,
                );

              case 'paste':
                return (
                  isEditable &&
                  dispatchCommand(
                    editor,
                    PASTE_COMMAND,
                    event as ClipboardEvent,
                  )
                );

              case 'dragstart':
                return (
                  isEditable &&
                  dispatchCommand(editor, DRAGSTART_COMMAND, event as DragEvent)
                );

              case 'dragover':
                return (
                  isEditable &&
                  dispatchCommand(editor, DRAGOVER_COMMAND, event as DragEvent)
                );

              case 'dragend':
                return (
                  isEditable &&
                  dispatchCommand(editor, DRAGEND_COMMAND, event as DragEvent)
                );

              case 'focus':
                return (
                  isEditable &&
                  dispatchCommand(editor, FOCUS_COMMAND, event as FocusEvent)
                );

              case 'blur': {
                return (
                  isEditable &&
                  dispatchCommand(editor, BLUR_COMMAND, event as FocusEvent)
                );
              }

              case 'drop':
                return (
                  isEditable &&
                  dispatchCommand(editor, DROP_COMMAND, event as DragEvent)
                );
            }
          };
    rootElement.addEventListener(eventName, eventHandler);
    removeHandles.push(() => {
      rootElement.removeEventListener(eventName, eventHandler);
    });
  }
}
