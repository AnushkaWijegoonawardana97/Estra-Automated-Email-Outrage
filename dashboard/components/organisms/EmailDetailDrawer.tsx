"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/atoms/Badge";
import { Drawer } from "@/components/molecules/Drawer";
import type { EmailDetail } from "@/lib/serializeEmail";

interface EmailDetailDrawerProps {
  emailId: string | null;
  fallbackSubject?: string;
  onClose: () => void;
}

function formatDate(value?: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleString();
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <dt className="shrink-0 text-xs font-medium text-zinc-500">{label}</dt>
      <dd className="text-sm text-zinc-900 sm:text-right">{value}</dd>
    </div>
  );
}

export function EmailDetailDrawer({
  emailId,
  fallbackSubject,
  onClose,
}: EmailDetailDrawerProps) {
  const [email, setEmail] = useState<EmailDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"html" | "text">("html");

  useEffect(() => {
    if (!emailId) {
      setEmail(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setView("html");

    void (async () => {
      try {
        const response = await fetch(`/api/emails/${emailId}`);
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to load email");
        }
        if (!cancelled) {
          setEmail(payload as EmailDetail);
          if (!payload.htmlBody) {
            setView("text");
          }
        }
      } catch (fetchError) {
        if (!cancelled) {
          setEmail(null);
          setError(fetchError instanceof Error ? fetchError.message : "Failed to load email");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [emailId]);

  const title = email?.subject ?? fallbackSubject ?? "Email details";
  const opened = email?.events.some((event) => event.eventType === "opened");
  const clicks = email?.events.filter((event) => event.eventType === "clicked") ?? [];

  return (
    <Drawer open={Boolean(emailId)} onClose={onClose} title={title} panelClassName="max-w-2xl">
      {loading && <p className="text-sm text-zinc-500">Loading sent email…</p>}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {email && !loading && (
        <div className="space-y-4">
          <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge label={email.emailType} tone="info" />
              {email.sendSource === "manual_campaign" ? (
                <Badge label="manual campaign" tone="warning" />
              ) : null}
              {email.campaignTemplateId ? (
                <Badge label={email.campaignTemplateId} tone="neutral" />
              ) : null}
              {email.lead?.status && <Badge label={email.lead.status} />}
              {opened && <Badge label="Opened" tone="success" />}
              {clicks.length > 0 && (
                <Badge label={`${clicks.length} click${clicks.length === 1 ? "" : "s"}`} tone="info" />
              )}
            </div>
            <dl className="space-y-3">
              <InfoRow label="Sent" value={formatDate(email.sentAt)} />
              <InfoRow label="To" value={email.lead?.email} />
              <InfoRow label="Business" value={email.lead?.businessName} />
              <InfoRow label="Brevo message ID" value={email.brevoMessageId || null} />
            </dl>
            {email.leadId && (
              <p className="mt-4 text-xs text-zinc-500">
                Lead ID:{" "}
                <Link href="/leads" className="font-mono text-sky-700 hover:underline">
                  {email.leadId}
                </Link>
              </p>
            )}
          </section>

          {clicks.length > 0 && (
            <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-zinc-900">Engagement</h3>
              <ul className="space-y-2 text-sm text-zinc-700">
                {email.events.map((event, index) => (
                  <li
                    key={`${event.eventType}-${event.occurredAt}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-lg bg-zinc-50 px-3 py-2"
                  >
                    <span className="capitalize">
                      {event.eventType}
                      {event.serviceTag ? ` · ${event.serviceTag}` : ""}
                    </span>
                    <span className="shrink-0 text-xs text-zinc-500">
                      {formatDate(event.occurredAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900">Sent email preview</h3>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Exact HTML stored when this email was sent via Brevo.
                </p>
              </div>
              <div className="flex rounded-lg border border-zinc-200 p-0.5">
                <button
                  type="button"
                  disabled={!email.htmlBody}
                  onClick={() => setView("html")}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                    view === "html"
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
                  }`}
                >
                  HTML
                </button>
                <button
                  type="button"
                  onClick={() => setView("text")}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                    view === "text"
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-600 hover:bg-zinc-50"
                  }`}
                >
                  Plain text
                </button>
              </div>
            </div>

            {!email.htmlBody && view === "html" && (
              <p className="mb-3 text-sm text-amber-700">
                No HTML was stored for this send. Showing plain text only.
              </p>
            )}

            {view === "html" && email.htmlBody ? (
              <div className="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100">
                <iframe
                  title="Sent email HTML preview"
                  srcDoc={email.htmlBody}
                  sandbox=""
                  className="h-[min(70vh,640px)] w-full bg-white"
                />
              </div>
            ) : (
              <pre className="max-h-[min(70vh,640px)] overflow-auto whitespace-pre-wrap rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
                {email.body}
              </pre>
            )}
          </section>
        </div>
      )}
    </Drawer>
  );
}
