"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/atoms/Badge";
import { StatCard } from "@/components/atoms/StatCard";

interface EmailRow {
  _id: string;
  subject: string;
  body: string;
  emailType: string;
  sentAt: string;
  leadId: string;
  lead?: {
    businessName?: string;
    email?: string;
    status?: string;
  } | null;
}

interface EmailEvent {
  emailId: string;
  leadId: string;
  eventType: string;
  serviceTag?: string | null;
  occurredAt: string;
}

export function EmailsTable({
  initialEmails,
  initialEvents,
}: {
  initialEmails: EmailRow[];
  initialEvents: EmailEvent[];
}) {
  const [emails, setEmails] = useState(initialEmails);
  const [events, setEvents] = useState(initialEvents);
  const [selected, setSelected] = useState<EmailRow | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const refresh = useCallback(async () => {
    const [emailsResponse, eventsResponse] = await Promise.all([
      fetch("/api/emails"),
      fetch("/api/events"),
    ]);
    if (emailsResponse.ok) setEmails(await emailsResponse.json());
    if (eventsResponse.ok) setEvents(await eventsResponse.json());
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, refresh]);

  const stats = useMemo(() => {
    const total = emails.length;
    const opened = new Set(
      events.filter((event) => event.eventType === "opened").map((event) => String(event.emailId)),
    ).size;
    const clicked = new Set(
      events.filter((event) => event.eventType === "clicked").map((event) => String(event.emailId)),
    ).size;
    const replied = emails.filter((email) => email.lead?.status === "replied").length;
    const unsubscribed = emails.filter(
      (email) => email.lead?.status === "unsubscribed",
    ).length;

    const pct = (value: number) => (total ? `${Math.round((value / total) * 100)}%` : "0%");

    return {
      total,
      opened: pct(opened),
      clicked: pct(clicked),
      replied: pct(replied),
      unsubscribed: pct(unsubscribed),
    };
  }, [emails, events]);

  function eventsForEmail(emailId: string) {
    return events.filter((event) => String(event.emailId) === emailId);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={refresh}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          Refresh
        </button>
        <label className="flex items-center gap-2 text-sm text-zinc-600">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(event) => setAutoRefresh(event.target.checked)}
          />
          Auto-refresh (10s)
        </label>
        <Link href="/activity?stage=sender" className="text-sm text-sky-700 hover:underline">
          View send logs in Activity →
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-5">
        <StatCard label="Total sent" value={String(stats.total)} />
        <StatCard label="Open rate" value={stats.opened} />
        <StatCard label="Click rate" value={stats.clicked} />
        <StatCard label="Reply rate" value={stats.replied} />
        <StatCard label="Unsubscribe rate" value={stats.unsubscribed} />
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              {["Business", "Email", "Sent", "Type", "Opened", "Clicked", "Status"].map(
                (heading) => (
                  <th key={heading} className="px-4 py-3 font-medium">
                    {heading}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {emails.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                  No emails sent yet. Check Activity for send attempts and skips.
                </td>
              </tr>
            ) : (
              emails.map((email) => {
              const events = eventsForEmail(email._id);
              const opened = events.some((event) => event.eventType === "opened");
              const clicks = events
                .filter((event) => event.eventType === "clicked")
                .map((event) => event.serviceTag)
                .filter(Boolean);

              return (
                <tr
                  key={email._id}
                  className="cursor-pointer border-t border-zinc-100 hover:bg-zinc-50"
                  onClick={() => setSelected(email)}
                >
                  <td className="px-4 py-3">{email.lead?.businessName ?? "—"}</td>
                  <td className="px-4 py-3">{email.lead?.email ?? "—"}</td>
                  <td className="px-4 py-3">
                    {new Date(email.sentAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <Badge label={email.emailType} tone="info" />
                  </td>
                  <td className="px-4 py-3">{opened ? "Yes" : "No"}</td>
                  <td className="px-4 py-3">{clicks.join(", ") || "—"}</td>
                  <td className="px-4 py-3">
                    <Badge label={email.lead?.status ?? "emailed"} />
                  </td>
                </tr>
              );
            })
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">{selected.subject}</h3>
            <button
              type="button"
              className="text-sm text-zinc-500"
              onClick={() => setSelected(null)}
            >
              Close
            </button>
          </div>
          <pre className="whitespace-pre-wrap text-sm text-zinc-700">{selected.body}</pre>
        </div>
      )}
    </div>
  );
}
