export function insertHtmlAtCursor(
  textarea: HTMLTextAreaElement,
  snippet: string,
): string {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  const next = value.slice(0, start) + snippet + value.slice(end);
  const cursor = start + snippet.length;
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(cursor, cursor);
  });
  return next;
}

export function wrapSelectionAsLink(
  textarea: HTMLTextAreaElement,
  href: string,
  label?: string,
): string {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  const selected = value.slice(start, end) || label || href;
  const snippet = `<a href="${href}">${selected}</a>`;
  return insertHtmlAtCursor(textarea, snippet);
}

export function buildImageSnippet(url: string, alt = ""): string {
  return `<img src="${url}" alt="${alt}" width="520" style="display:block;width:100%;max-width:520px;height:auto;border-radius:12px;" />`;
}

export function buildVideoLinkSnippet(url: string): string {
  return `<p style="margin:16px 0;text-align:center;"><a href="${url}" style="color:#8b5cf6;font-weight:600;text-decoration:none;">Watch 60s demo →</a></p>`;
}
