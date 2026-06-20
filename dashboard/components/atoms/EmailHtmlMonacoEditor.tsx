"use client";

import dynamic from "next/dynamic";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import type { Monaco, OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { registerEmailHtmlCompletions } from "@/lib/emailHtmlCompletions";
import {
  runEmailHtmlDiagnostics,
  scheduleEmailHtmlDiagnostics,
} from "@/lib/emailHtmlDiagnostics";
import {
  insertAtCursor,
  wrapSelectionAsLink,
} from "@/lib/monacoEditorInsert";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[400px] items-center justify-center bg-zinc-950 text-sm text-zinc-400">
      Loading editor…
    </div>
  ),
});

export interface EmailHtmlEditorHandle {
  insertAtCursor: (snippet: string) => void;
  wrapSelectionAsLink: (href: string, label?: string) => void;
  focus: () => void;
}

interface EmailHtmlMonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  leadId: string;
  className?: string;
  height?: string;
}

export const EmailHtmlMonacoEditor = forwardRef<
  EmailHtmlEditorHandle,
  EmailHtmlMonacoEditorProps
>(function EmailHtmlMonacoEditor(
  { value, onChange, leadId, className = "", height = "100%" },
  ref,
) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useImperativeHandle(ref, () => ({
    insertAtCursor: (snippet: string) => {
      const editorInstance = editorRef.current;
      if (!editorInstance) return;
      const next = insertAtCursor(editorInstance, snippet);
      onChangeRef.current(next);
    },
    wrapSelectionAsLink: (href: string, label?: string) => {
      const editorInstance = editorRef.current;
      if (!editorInstance) return;
      const next = wrapSelectionAsLink(editorInstance, href, label);
      onChangeRef.current(next);
    },
    focus: () => {
      editorRef.current?.focus();
    },
  }));

  useEffect(() => {
    editorRef.current?.focus();
  }, [leadId]);

  const handleMount: OnMount = useCallback((editorInstance, monaco) => {
    editorRef.current = editorInstance;
    monacoRef.current = monaco;

    registerEmailHtmlCompletions(monaco);

    const model = editorInstance.getModel();
    if (model) {
      runEmailHtmlDiagnostics(monaco, model);
    }

    editorInstance.onDidChangeModelContent(() => {
      const currentModel = editorInstance.getModel();
      if (!currentModel || !monacoRef.current) return;
      scheduleEmailHtmlDiagnostics(monacoRef.current, currentModel);
    });
  }, []);

  return (
    <div
      className={`overflow-hidden rounded-md border border-zinc-300 ${className}`}
      style={{ minHeight: height === "100%" ? "400px" : height }}
    >
      <MonacoEditor
        height={height}
        language="html"
        theme="vs-dark"
        value={value}
        onChange={(nextValue) => onChangeRef.current(nextValue ?? "")}
        onMount={handleMount}
        options={{
          minimap: { enabled: false },
          wordWrap: "on",
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          fontSize: 13,
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          formatOnPaste: true,
          bracketPairColorization: { enabled: true },
          suggestOnTriggerCharacters: true,
          quickSuggestions: { other: true, strings: true, comments: false },
          padding: { top: 12, bottom: 12 },
        }}
      />
    </div>
  );
});
