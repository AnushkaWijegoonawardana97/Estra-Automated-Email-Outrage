"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/atoms/Badge";
import { StatCard } from "@/components/atoms/StatCard";
import { Pagination } from "@/components/molecules/Pagination";
import { EmailDetailDrawer } from "@/components/organisms/EmailDetailDrawer";

const PAGE_SIZE = 25;

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

interface EmailStats {
  total: number;
  opened: number;
  clicked: number;
  replied: number;
  unsubscribed: number;
}

interface EmailsResponse {
  emails: EmailRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats: EmailStats;
}

function formatRate(value: number, total: number) {
  return total ? `${Math.round((value / total) * 100)}%` : "0%";
}

export function EmailsTable({
  initialEmails,
  initialEvents,
  initialTotal,
  initialStats,
}: {
  initialEmails: EmailRow[];
  initialEvents: EmailEvent[];
  initialTotal: number;
  initialStats: EmailStats;
}) {
  const [emails, setEmails] = useState(initialEmails);
  const [events, setEvents] = useState(initialEvents);
  const [stats, setStats] = useState(initialStats);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(
    Math.max(1, Math.ceil(initialTotal / PAGE_SIZE)),
  );
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | undefined>();
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchEventsForEmails = useCallback(async (emailRows: EmailRow[]) => {
    if (emailRows.length === 0) {
      setEvents([]);
      return;
    }
    const params = new URLSearchParams({
      emailIds: emailRows.map((email) => email._id).join(","),
    });
    const response = await fetch(`/api/events?${params.toString()}`);
    if (response.ok) {
      setEvents(await response.json());
    }
  }, []);

  const fetchEmails = useCallback(
    async (pageToLoad: number) => {
      const params = new URLSearchParams({
        page: String(pageToLoad),
        limit: String(PAGE_SIZE),
      });
      const response = await fetch(`/api/emails?${params.toString()}`);
      if (!response.ok) return;

      const data: EmailsResponse = await response.json();
      setEmails(data.emails);
      setTotal(data.total);
      setPage(data.page);
      setTotalPages(data.totalPages);
      setStats(data.stats);
      await fetchEventsForEmails(data.emails);
    },
    [fetchEventsForEmails],
  );

  const refresh = useCallback(async () => {
    await fetchEmails(page);
  }, [fetchEmails, page]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, refresh]);

  const statCards = useMemo(
    () => ({
      total: String(stats.total),
      opened: formatRate(stats.opened, stats.total),
      clicked: formatRate(stats.clicked, stats.total),
      replied: formatRate(stats.replied, stats.total),
      unsubscribed: formatRate(stats.unsubscribed, stats.total),
    }),
    [stats],
  );

  function eventsForEmail(emailId: string) {
    return events.filter((event) => String(event.emailId) === emailId);
  }

  async function handlePageChange(nextPage: number) {
    setSelectedEmailId(null);
    await fetchEmails(nextPage);
  }

  function openEmailDetail(email: EmailRow) {
    setSelectedEmailId(email._id);
    setSelectedSubject(email.subject);
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
        <StatCard label="Total sent" value={statCards.total} />
        <StatCard label="Open rate" value={statCards.opened} />
        <StatCard label="Click rate" value={statCards.clicked} />
        <StatCard label="Reply rate" value={statCards.replied} />
        <StatCard label="Unsubscribe rate" value={statCards.unsubscribed} />
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
                const emailEvents = eventsForEmail(email._id);
                const opened = emailEvents.some((event) => event.eventType === "opened");
                const clicks = emailEvents
                  .filter((event) => event.eventType === "clicked")
                  .map((event) => event.serviceTag)
                  .filter(Boolean);

                return (
                  <tr
                    key={email._id}
                    className="cursor-pointer border-t border-zinc-100 hover:bg-zinc-50"
                    onClick={() => openEmailDetail(email)}
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
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={PAGE_SIZE}
          onPageChange={handlePageChange}
        />
      </div>

      <EmailDetailDrawer
        emailId={selectedEmailId}
        fallbackSubject={selectedSubject}
        onClose={() => setSelectedEmailId(null)}
      />
    </div>
  );
}
