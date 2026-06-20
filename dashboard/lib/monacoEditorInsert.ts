import type { editor } from "monaco-editor";

export function insertAtCursor(
  monacoEditor: editor.IStandaloneCodeEditor,
  snippet: string,
): string {
  const model = monacoEditor.getModel();
  if (!model) return monacoEditor.getValue();

  const selection = monacoEditor.getSelection();
  if (!selection) return model.getValue();

  const startOffset = model.getOffsetAt(selection.getStartPosition());

  monacoEditor.executeEdits("insert-at-cursor", [
    {
      range: selection,
      text: snippet,
      forceMoveMarkers: true,
    },
  ]);

  monacoEditor.setPosition(model.getPositionAt(startOffset + snippet.length));
  monacoEditor.focus();

  return model.getValue();
}

export function wrapSelectionAsLink(
  monacoEditor: editor.IStandaloneCodeEditor,
  href: string,
  label?: string,
): string {
  const model = monacoEditor.getModel();
  if (!model) return monacoEditor.getValue();

  const selection = monacoEditor.getSelection();
  if (!selection) return model.getValue();

  const selected = model.getValueInRange(selection) || label || href;
  const snippet = `<a href="${href}">${selected}</a>`;
  return insertAtCursor(monacoEditor, snippet);
}
