"use client";

import { useCallback, useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { Badge } from "@/components/atoms/Badge";
import { Checkbox } from "@/components/atoms/Checkbox";
import { Pagination } from "@/components/molecules/Pagination";
import { LeadsBulkActionBar } from "@/components/molecules/LeadsBulkActionBar";
import { LeadDetailDrawer } from "@/components/organisms/LeadDetailDrawer";
import { phoneTelHref } from "@/lib/contactLinks";
import type { LeadRow } from "@/lib/serializeLead";

const PAGE_SIZE = 25;

const TABLE_COLUMNS = [
  { heading: "Business", width: "min-w-[130px] w-[14%]" },
  { heading: "Location", width: "min-w-[90px] w-[10%]" },
  { heading: "Search", width: "min-w-[110px] w-[12%]" },
  { heading: "Rating", width: "min-w-[68px] w-[7%]" },
  { heading: "Phone", width: "min-w-[90px] w-[10%]" },
  { heading: "Website", width: "min-w-[90px] w-[11%]" },
  { heading: "Email", width: "min-w-[72px] w-[8%]" },
  { heading: "Digital Gap", width: "min-w-[88px] w-[10%]" },
  { heading: "Status", width: "min-w-[72px] w-[8%]" },
] as const;

interface LeadsResponse {
  leads: LeadRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function CellText({
  children,
  title,
  className = "",
}: {
  children: ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <span className={`block truncate ${className}`} title={title}>
      {children}
    </span>
  );
}

function stopRowClick(event: MouseEvent) {
  event.stopPropagation();
}

function gapTone(gap?: string | null) {
  if (gap === "no_website") return "danger" as const;
  if (gap === "social_only") return "warning" as const;
  if (gap === "weak_site") return "info" as const;
  return "neutral" as const;
}

const contactLinkClassName =
  "text-sky-700 underline decoration-sky-700/30 underline-offset-2 hover:text-sky-900";

function exportCsv(leads: LeadRow[]) {
  const headers = [
    "businessName",
    "category",
    "city",
    "country",
    "rating",
    "phone",
    "email",
    "searchTerm",
    "scrapeQuery",
    "status",
    "digitalGap",
  ];
  const rows = leads.map((lead) =>
    headers
      .map((header) =>
        JSON.stringify((lead as unknown as Record<string, unknown>)[header] ?? ""),
      )
      .join(","),
  );
  const blob = new Blob([[headers.join(","), ...rows].join("\n")], {
    type: "text/csv",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "leads.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

type AvailabilityFilter = "" | "yes" | "no";

interface LeadsTableProps {
  initialLeads: LeadRow[];
  initialTotal: number;
  searchTermOptions: string[];
  countryOptions: string[];
}

export function LeadsTable({
  initialLeads,
  initialTotal,
  searchTermOptions,
  countryOptions,
}: LeadsTableProps) {
  const [leads, setLeads] = useState(initialLeads);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(Math.max(1, Math.ceil(initialTotal / PAGE_SIZE)));
  const [selected, setSelected] = useState<LeadRow | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [country, setCountry] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [hasEmail, setHasEmail] = useState<AvailabilityFilter>("");
  const [hasContact, setHasContact] = useState<AvailabilityFilter>("");
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchLeads = useCallback(
    async (pageToLoad: number) => {
      const params = new URLSearchParams({
        page: String(pageToLoad),
        limit: String(PAGE_SIZE),
      });
      if (country) params.set("country", country);
      if (searchTerm) params.set("searchTerm", searchTerm);
      if (query.trim()) params.set("q", query.trim());
      if (status) params.set("status", status);
      if (hasEmail) params.set("hasEmail", hasEmail);
      if (hasContact) params.set("hasContact", hasContact);

      const response = await fetch(`/api/leads?${params.toString()}`);
      if (!response.ok) return;

      const data: LeadsResponse = await response.json();
      setLeads(data.leads);
      setTotal(data.total);
      setPage(data.page);
      setTotalPages(data.totalPages);
    },
    [country, searchTerm, query, status, hasEmail, hasContact],
  );

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => fetchLeads(page), 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchLeads, page]);

  async function applyFilters() {
    await fetchLeads(1);
  }

  async function handlePageChange(nextPage: number) {
    await fetchLeads(nextPage);
  }

  const selectableOnPage = leads.filter((lead) => Boolean(lead.email));
  const allOnPageSelected =
    selectableOnPage.length > 0 &&
    selectableOnPage.every((lead) => selectedIds.has(lead._id));

  function toggleLeadSelection(leadId: string, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(leadId);
      else next.delete(leadId);
      return next;
    });
  }

  function toggleSelectAllOnPage(checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const lead of selectableOnPage) {
        if (checked) next.add(lead._id);
        else next.delete(lead._id);
      }
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <LeadsBulkActionBar
        selectedCount={selectedIds.size}
        selectedIds={[...selectedIds]}
        onClear={() => setSelectedIds(new Set())}
      />
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-zinc-500">Search</span>
          <input
            className="min-w-[220px] rounded-md border border-zinc-300 px-3 py-2"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void applyFilters();
            }}
            placeholder="Business, email, or phone"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-zinc-500">Country</span>
          <select
            className="rounded-md border border-zinc-300 px-3 py-2"
            value={country}
            onChange={(event) => setCountry(event.target.value)}
          >
            <option value="">All</option>
            {countryOptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-zinc-500">Search term</span>
          <select
            className="rounded-md border border-zinc-300 px-3 py-2"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          >
            <option value="">All</option>
            {searchTermOptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-zinc-500">Status</span>
          <select
            className="rounded-md border border-zinc-300 px-3 py-2"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">All</option>
            {["scraped", "enriched", "emailed", "replied", "unsubscribed"].map(
              (value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ),
            )}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-zinc-500">Email</span>
          <select
            className="rounded-md border border-zinc-300 px-3 py-2"
            value={hasEmail}
            onChange={(event) => setHasEmail(event.target.value as AvailabilityFilter)}
          >
            <option value="">All</option>
            <option value="yes">Available</option>
            <option value="no">Missing</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-zinc-500">Contact</span>
          <select
            className="rounded-md border border-zinc-300 px-3 py-2"
            value={hasContact}
            onChange={(event) => setHasContact(event.target.value as AvailabilityFilter)}
          >
            <option value="">All</option>
            <option value="yes">Available</option>
            <option value="no">Missing</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => fetchLeads(page)}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          Refresh
        </button>
        <button
          type="button"
          onClick={applyFilters}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm"
        >
          Filter
        </button>
        <button
          type="button"
          onClick={() => exportCsv(leads)}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm"
        >
          Export CSV
        </button>
        <label className="flex items-center gap-2 text-sm text-zinc-600">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(event) => setAutoRefresh(event.target.checked)}
          />
          Auto-refresh (10s)
        </label>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full table-fixed text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="w-10 px-3 py-3">
                <Checkbox
                  checked={allOnPageSelected}
                  ariaLabel="Select all leads with email on this page"
                  onChange={toggleSelectAllOnPage}
                  disabled={selectableOnPage.length === 0}
                />
              </th>
              {TABLE_COLUMNS.map(({ heading, width }) => (
                <th key={heading} className={`px-4 py-3 font-medium ${width}`}>
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-zinc-500">
                  No leads yet. Run the pipeline, then click Refresh.
                </td>
              </tr>
            ) : (
              leads.map((lead) => {
                const telHref = lead.phone ? phoneTelHref(lead.phone) : null;

                return (
                  <tr
                    key={lead._id}
                    className="cursor-pointer border-t border-zinc-100 hover:bg-zinc-50"
                    onClick={() => setSelected(lead)}
                  >
                    <td className="px-3 py-3">
                      <Checkbox
                        checked={selectedIds.has(lead._id)}
                        disabled={!lead.email}
                        ariaLabel={`Select ${lead.businessName}`}
                        onChange={(checked) => toggleLeadSelection(lead._id, checked)}
                      />
                    </td>
                    <td className="max-w-0 px-4 py-3">
                      <CellText className="font-medium text-zinc-900" title={lead.businessName}>
                        {lead.businessName}
                      </CellText>
                      <CellText className="text-xs text-zinc-500" title={lead.category}>
                        {lead.category}
                      </CellText>
                    </td>
                    <td className="max-w-0 px-4 py-3">
                      <CellText title={`${lead.city}, ${lead.country}`}>
                        {lead.city}, {lead.country}
                      </CellText>
                    </td>
                    <td className="max-w-0 px-4 py-3">
                      <CellText
                        className="text-xs text-zinc-700"
                        title={lead.searchTerm || undefined}
                      >
                        {lead.searchTerm || "—"}
                      </CellText>
                      <CellText
                        className="text-xs text-zinc-400"
                        title={lead.scrapeQuery || undefined}
                      >
                        {lead.scrapeQuery || "—"}
                      </CellText>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {lead.rating} ({lead.reviewCount})
                    </td>
                    <td className="max-w-0 px-4 py-3">
                      {telHref ? (
                        <a
                          href={telHref}
                          className={`block truncate ${contactLinkClassName}`}
                          title={lead.phone}
                          onClick={stopRowClick}
                        >
                          {lead.phone}
                        </a>
                      ) : (
                        <CellText>—</CellText>
                      )}
                    </td>
                    <td className="max-w-0 px-4 py-3">
                      <CellText title={lead.website ?? undefined}>
                        {lead.website ?? "None"}
                      </CellText>
                    </td>
                    <td className="max-w-0 px-4 py-3">
                      {lead.email ? (
                        <a
                          href={`mailto:${lead.email}`}
                          className={`block truncate ${contactLinkClassName}`}
                          title={lead.email}
                          onClick={stopRowClick}
                        >
                          {lead.email}
                        </a>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {lead.digitalGap ? (
                        <Badge label={lead.digitalGap} tone={gapTone(lead.digitalGap)} />
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge label={lead.status ?? "scraped"} />
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

      <LeadDetailDrawer
        leadId={selected?._id ?? null}
        fallbackTitle={selected?.businessName}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
