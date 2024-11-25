import { LexicalEditor } from './LexicalEditor';
import { getWindow } from './LexicalUtils';

let lastTextEntryTimeStamp = 0;

function updateTimeStamp(event: Event) {
  lastTextEntryTimeStamp = event.timeStamp;
}

function initTextEntryListener(editor: LexicalEditor): void {
  if (lastTextEntryTimeStamp === 0) {
    getWindow(editor).addEventListener('textInput', updateTimeStamp, true);
  }
}

export function $flushMutations(
  editor: LexicalEditor,
  mutations: Array<MutationRecord>,
  observer: MutationObserver,
) {
  // TODO: Finish this function
}

export function initMutationObserver(editor: LexicalEditor): void {
  initTextEntryListener(editor);
  editor._observer = new MutationObserver(
    (mutations: Array<MutationRecord>, observer: MutationObserver) => {
      $flushMutations(editor, mutations, observer);
    },
  );
}
