import type { Monaco } from "@monaco-editor/react";
import type { editor } from "monaco-editor";

const VOID_TAGS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

const TAG_REGEX = /<\/?([a-zA-Z][\w-]*)\b[^>]*\/?>/g;

function findUnbalancedTags(html: string): editor.IMarkerData[] {
  const markers: editor.IMarkerData[] = [];
  const stack: { tag: string; index: number; line: number; column: number }[] =
    [];

  const lines = html.split("\n");
  let offset = 0;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    TAG_REGEX.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = TAG_REGEX.exec(line)) !== null) {
      const full = match[0];
      const tag = match[1].toLowerCase();
      const isClosing = full.startsWith("</");
      const isSelfClosing = full.endsWith("/>") || VOID_TAGS.has(tag);

      if (isClosing) {
        const last = stack.pop();
        if (!last || last.tag !== tag) {
          markers.push({
            severity: 8,
            message: `Unexpected closing tag </${tag}>`,
            startLineNumber: lineIndex + 1,
            startColumn: match.index + 1,
            endLineNumber: lineIndex + 1,
            endColumn: match.index + full.length + 1,
          });
        }
      } else if (!isSelfClosing) {
        stack.push({
          tag,
          index: offset + match.index,
          line: lineIndex + 1,
          column: match.index + 1,
        });
      }
    }

    offset += line.length + 1;
  }

  for (const unclosed of stack) {
    markers.push({
      severity: 8,
      message: `Unclosed <${unclosed.tag}> tag`,
      startLineNumber: unclosed.line,
      startColumn: unclosed.column,
      endLineNumber: unclosed.line,
      endColumn: unclosed.column + unclosed.tag.length + 1,
    });
  }

  return markers;
}

function findEmailRuleViolations(html: string): editor.IMarkerData[] {
  const markers: editor.IMarkerData[] = [];
  const lines = html.split("\n");

  if (html.trim() && !/unsubscribe/i.test(html)) {
    markers.push({
      severity: 4,
      message: "Missing unsubscribe link — add an unsubscribe footer",
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: 1,
      endColumn: 1,
    });
  }

  lines.forEach((line, lineIndex) => {
    const imgRegex = /<img\b[^>]*>/gi;
    let imgMatch: RegExpExecArray | null;
    while ((imgMatch = imgRegex.exec(line)) !== null) {
      if (!/\balt\s*=/.test(imgMatch[0])) {
        markers.push({
          severity: 4,
          message: "<img> should include an alt attribute",
          startLineNumber: lineIndex + 1,
          startColumn: imgMatch.index + 1,
          endLineNumber: lineIndex + 1,
          endColumn: imgMatch.index + imgMatch[0].length + 1,
        });
      }
    }

    const emptyHrefRegex = /href\s*=\s*["']\s*["']/gi;
    let hrefMatch: RegExpExecArray | null;
    while ((hrefMatch = emptyHrefRegex.exec(line)) !== null) {
      markers.push({
        severity: 8,
        message: "Empty href attribute — link will not work",
        startLineNumber: lineIndex + 1,
        startColumn: hrefMatch.index + 1,
        endLineNumber: lineIndex + 1,
        endColumn: hrefMatch.index + hrefMatch[0].length + 1,
      });
    }

    const videoRegex = /<video\b[^>]*>/gi;
    let videoMatch: RegExpExecArray | null;
    while ((videoMatch = videoRegex.exec(line)) !== null) {
      markers.push({
        severity: 4,
        message: "<video> is not email-safe — use a link to the video instead",
        startLineNumber: lineIndex + 1,
        startColumn: videoMatch.index + 1,
        endLineNumber: lineIndex + 1,
        endColumn: videoMatch.index + videoMatch[0].length + 1,
      });
    }
  });

  return markers;
}

export function runEmailHtmlDiagnostics(
  monaco: Monaco,
  model: editor.ITextModel,
): void {
  const html = model.getValue();
  const markers = [
    ...findUnbalancedTags(html),
    ...findEmailRuleViolations(html),
  ];

  monaco.editor.setModelMarkers(model, "email-html", markers);
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export function scheduleEmailHtmlDiagnostics(
  monaco: Monaco,
  model: editor.ITextModel,
): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    runEmailHtmlDiagnostics(monaco, model);
  }, 300);
}
