"use client";

interface EmailPreviewPaneProps {
  htmlBody: string;
  textBody: string;
  recipientLabel?: string;
}

export function EmailPreviewPane({
  htmlBody,
  textBody,
  recipientLabel,
}: EmailPreviewPaneProps) {
  return (
    <div className="flex h-full min-h-[480px] flex-col rounded-lg border border-zinc-200 bg-zinc-50">
      <div className="border-b border-zinc-200 px-4 py-3">
        <p className="text-sm font-medium text-zinc-900">Preview</p>
        {recipientLabel ? (
          <p className="text-xs text-zinc-500">{recipientLabel}</p>
        ) : null}
      </div>
      <div className="flex-1 overflow-hidden bg-white">
        {htmlBody ? (
          <iframe
            title="Email preview"
            srcDoc={htmlBody}
            sandbox=""
            className="h-full min-h-[420px] w-full border-0"
          />
        ) : (
          <pre className="h-full overflow-auto p-4 text-xs whitespace-pre-wrap text-zinc-700">
            {textBody || "Generate a template to preview the email."}
          </pre>
        )}
      </div>
    </div>
  );
}
