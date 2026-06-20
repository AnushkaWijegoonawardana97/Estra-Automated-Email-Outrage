import type { Monaco } from "@monaco-editor/react";
import type { editor, Position } from "monaco-editor";
import { buildImageSnippet } from "@/lib/insertHtmlAtCursor";

const EMAIL_SNIPPETS = [
  {
    label: "email-table",
    detail: "Email-safe table layout",
    insertText: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
  <tr>
    <td style="padding:16px 0;">
      $0
    </td>
  </tr>
</table>`,
    documentation: "Table scaffold for email clients",
  },
  {
    label: "email-img",
    detail: "Responsive campaign image",
    insertText: buildImageSnippet("https://"),
    documentation: "Pre-styled image block for email",
  },
  {
    label: "email-cta",
    detail: "Styled CTA link",
    insertText: `<p style="margin:24px 0;text-align:center;">
  <a href="$1" style="display:inline-block;background:#8b5cf6;color:#ffffff;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:8px;">$2</a>
</p>`,
    documentation: "Call-to-action button link",
  },
  {
    label: "email-unsub",
    detail: "Unsubscribe footer link",
    insertText: `<p style="margin:24px 0;font-size:12px;color:#71717a;text-align:center;">
  <a href="{{unsubscribe_url}}" style="color:#71717a;text-decoration:underline;">Unsubscribe</a>
</p>`,
    documentation: "Required unsubscribe footer pattern",
  },
  {
    label: "email-demo-link",
    detail: "Demo video link",
    insertText: `<p style="margin:16px 0;text-align:center;"><a href="$1" style="color:#8b5cf6;font-weight:600;text-decoration:none;">Watch 60s demo →</a></p>`,
    documentation: "Video demo link (no inline video tag)",
  },
];

let registered = false;

export function registerEmailHtmlCompletions(monaco: Monaco): void {
  if (registered) return;
  registered = true;

  monaco.languages.registerCompletionItemProvider("html", {
    triggerCharacters: ["<", " ", '"'],
    provideCompletionItems: (
      model: editor.ITextModel,
      position: Position,
    ) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const suggestions = EMAIL_SNIPPETS.map((snippet) => ({
        label: snippet.label,
        kind: monaco.languages.CompletionItemKind.Snippet,
        detail: snippet.detail,
        documentation: snippet.documentation,
        insertText: snippet.insertText,
        insertTextRules:
          monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range,
        sortText: `0_${snippet.label}`,
      }));

      return { suggestions };
    },
  });
}
