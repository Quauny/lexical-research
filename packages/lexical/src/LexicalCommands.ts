import { LexicalCommand } from './LexicalEditor';

export type PasteCommandType = ClipboardEvent | InputEvent | KeyboardEvent;

export function createCommand<T>(type?: string): LexicalCommand<T> {
  // return __DEV__ ? { type } : {};
  return { type };
}

export const CUT_COMMAND: LexicalCommand<
  ClipboardEvent | KeyboardEvent | null
> = createCommand('CUT_COMMAND');

export const COPY_COMMAND: LexicalCommand<
  ClipboardEvent | KeyboardEvent | null
> = createCommand('COPY_COMMAND');

export const PASTE_COMMAND: LexicalCommand<PasteCommandType> =
  createCommand('PASTE_COMMAND');

export const DRAGSTART_COMMAND: LexicalCommand<DragEvent> =
  createCommand('DRAGSTART_COMMAND');

export const DRAGOVER_COMMAND: LexicalCommand<DragEvent> =
  createCommand('DRAGOVER_COMMAND');

export const DRAGEND_COMMAND: LexicalCommand<DragEvent> =
  createCommand('DRAGEND_COMMAND');

export const FOCUS_COMMAND: LexicalCommand<FocusEvent> =
  createCommand('FOCUS_COMMAND');

export const BLUR_COMMAND: LexicalCommand<FocusEvent> =
  createCommand('BLUR_COMMAND');

export const DROP_COMMAND: LexicalCommand<DragEvent> =
  createCommand('DROP_COMMAND');
