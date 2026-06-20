"use client";

interface EmailHtmlPreviewProps {
  htmlBody: string;
  className?: string;
  minHeight?: string;
}

export function EmailHtmlPreview({
  htmlBody,
  className = "",
  minHeight = "min-h-[420px]",
}: EmailHtmlPreviewProps) {
  return (
    <iframe
      title="Email preview"
      srcDoc={htmlBody}
      sandbox=""
      className={`w-full border-0 bg-white ${minHeight} ${className}`}
    />
  );
}
