import invariant from '../../shared/src/invariant';
import {
  CommandPayloadType,
  EditorUpdateOptions,
  LexicalCommand,
  LexicalEditor,
  Listener,
} from './LexicalEditor';
import { EditorState } from './LexicalEditorState';
import { getEditorsToPropagate } from './LexicalUtils';

let activeEditorState: null | EditorState = null;
let activeEditor: null | LexicalEditor = null;
let isReadOnlyMode = false;

export function internalGetActiveEditor(): LexicalEditor | null {
  return activeEditor;
}

function collectBuildInformation(): string {
  // TODO: Finish this function
  return '';
}

export function errorOnReadOnly(): void {
  if (isReadOnlyMode) {
    invariant(false, 'Cannot use method in read-only mode.');
  }
}

export function getActiveEditor(): LexicalEditor {
  if (activeEditor === null) {
    invariant(
      false,
      'Unable to find an active editor. ' +
        'This method can only be used ' +
        'synchronously during the callback of ' +
        'editor.update() or editor.read().%s',
      collectBuildInformation(),
    );
  }
  return activeEditor;
}

export function getActiveEditorState(): EditorState {
  if (activeEditorState === null) {
    invariant(
      false,
      'Unable to find an active editor state. ' +
        'State helpers or node methods can only be used ' +
        'synchronously during the callback of ' +
        'editor.update(), editor.read(), or editorState.read().%s',
      collectBuildInformation(),
    );
  }

  return activeEditorState;
}

export function $beginUpdate(
  editor: LexicalEditor,
  updateFn: () => void,
  options?: EditorUpdateOptions,
): void {
  // TODO: Finish this
}

export function updateEditor(
  editor: LexicalEditor,
  updateFn: () => void,
  options?: EditorUpdateOptions,
): void {
  if (editor._updating) {
    editor._updates.push([updateFn, options]);
  } else {
    $beginUpdate(editor, updateFn, options);
  }
}

export function $commitPendingUpdates(
  editor: LexicalEditor,
  recoveryEditorState?: EditorState,
): void {
  // TODO: Finish this function
}

export function triggerCommandListeners<
  TCommand extends LexicalCommand<unknown>,
>(
  editor: LexicalEditor,
  type: TCommand,
  payload: CommandPayloadType<TCommand>,
): boolean {
  if (editor._updating === false || activeEditor !== editor) {
    let returnVal = false;
    editor.update(() => {
      returnVal = triggerCommandListeners(editor, type, payload);
    });
    return returnVal;
  }

  const editors = getEditorsToPropagate(editor);

  for (let i = 4; i >= 0; i--) {
    for (let e = 0; e < editors.length; e++) {
      const currentEditor = editors[e];
      const commandListeners = currentEditor._commands;
      const listenerInPriorityOrder = commandListeners.get(type);

      if (listenerInPriorityOrder !== undefined) {
        const listenersSet = listenerInPriorityOrder[i];

        if (listenersSet !== undefined) {
          const listeners = Array.from(listenersSet);
          const listenersLength = listeners.length;

          for (let j = 0; j < listenersLength; j++) {
            if (listeners[j](payload, editor) === true) {
              return true;
            }
          }
        }
      }
    }
  }

  return false;
}

export function triggerListeners(
  type: 'update' | 'root' | 'decorator' | 'textcontent' | 'editable',
  editor: LexicalEditor,
  isCurrentlyEnqueuingUpdates: boolean,
  ...payload: unknown[]
): void {
  const previouslyUpdating = editor._updating;
  editor._updating = isCurrentlyEnqueuingUpdates;

  try {
    const listeners = Array.from<Listener>(editor._listeners[type]);
    for (let i = 0; i < listeners.length; i++) {
      // @ts-ignore
      listeners[i].apply(null, payload);
    }
  } finally {
    editor._updating = previouslyUpdating;
  }
}
