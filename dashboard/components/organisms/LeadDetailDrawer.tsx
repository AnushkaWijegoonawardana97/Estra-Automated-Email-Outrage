"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Badge } from "@/components/atoms/Badge";
import { Drawer } from "@/components/molecules/Drawer";
import { phoneTelHref, websiteHref } from "@/lib/contactLinks";
import type { EmailDiscoveryAttempt, LeadDetail } from "@/lib/serializeLead";

interface LeadDetailDrawerProps {
  leadId: string | null;
  fallbackTitle?: string;
  onClose: () => void;
}

function gapTone(gap?: string | null) {
  if (gap === "no_website") return "danger" as const;
  if (gap === "social_only") return "warning" as const;
  if (gap === "weak_site") return "info" as const;
  return "neutral" as const;
}

function emailDiscoveryTone(status?: string | null) {
  if (status === "found") return "success" as const;
  if (status === "not_found") return "danger" as const;
  return "warning" as const;
}

const linkClassName =
  "text-sky-700 underline decoration-sky-700/30 underline-offset-2 hover:text-sky-900";

const actionButtonClassName =
  "inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40";

function formatDate(value?: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleString();
}

function formatOpeningHours(hours: Record<string, string>) {
  const entries = Object.entries(hours);
  if (entries.length === 0) return null;
  return entries.map(([day, time]) => ({ day, time }));
}

function displayValue(value?: string | null) {
  return value?.trim() ? value : null;
}

function DetailCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
        {description && <p className="mt-0.5 text-xs text-zinc-500">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function ActivityDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-zinc-200" />
      <span className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">{label}</span>
      <div className="h-px flex-1 bg-zinc-200" />
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="grid gap-1 sm:grid-cols-[140px_1fr] sm:items-start sm:gap-3">
      <dt className="text-xs font-medium text-zinc-500">{label}</dt>
      <dd
        className={`text-sm break-words text-zinc-800 ${mono ? "font-mono text-xs" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}

function InfoLinkRow({
  label,
  href,
  display,
  external,
}: {
  label: string;
  href: string;
  display: string;
  external?: boolean;
}) {
  return (
    <InfoRow
      label={label}
      value={
        <a
          href={href}
          className={linkClassName}
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {display}
        </a>
      }
    />
  );
}

function EmptyValue() {
  return <span className="text-zinc-400">—</span>;
}

function TimelineItem({
  label,
  timestamp,
  detail,
  isLast,
}: {
  label: string;
  timestamp?: string | null;
  detail?: ReactNode;
  isLast?: boolean;
}) {
  return (
    <li className="relative flex gap-3 pb-4 last:pb-0">
      <div className="flex flex-col items-center">
        <span
          className={`mt-1.5 size-2.5 shrink-0 rounded-full ${
            timestamp ? "bg-emerald-500" : "bg-zinc-300"
          }`}
        />
        {!isLast && <span className="mt-1 w-px flex-1 bg-zinc-200" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-zinc-900">{label}</p>
        <p className="text-xs text-zinc-500">{timestamp ? formatDate(timestamp) : "Not yet"}</p>
        {detail && <div className="mt-1 text-xs text-zinc-600">{detail}</div>}
      </div>
    </li>
  );
}

function EmailDiscoveryLogList({ attempts }: { attempts: EmailDiscoveryAttempt[] }) {
  if (attempts.length === 0) {
    return <p className="text-sm text-zinc-500">No discovery attempts logged.</p>;
  }

  return (
    <ul className="space-y-2">
      {attempts.map((attempt, index) => (
        <li
          key={`${attempt.strategy}-${index}`}
          className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium text-zinc-900 capitalize">
              {attempt.strategy.replace(/_/g, " ")}
            </span>
            <Badge
              label={attempt.success ? "found" : "failed"}
              tone={attempt.success ? "success" : "danger"}
            />
          </div>
          <p className="mt-1 text-xs text-zinc-600">{attempt.reason.replace(/_/g, " ")}</p>
          {attempt.email && (
            <p className="mt-1 font-mono text-xs text-zinc-700">{attempt.email}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
            {typeof attempt.pagesChecked === "number" && (
              <span>{attempt.pagesChecked} pages</span>
            )}
            {(attempt.candidatesSeen?.length ?? 0) > 0 && (
              <span>{attempt.candidatesSeen?.length} candidates</span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function LeadDetailDrawer({ leadId, fallbackTitle, onClose }: LeadDetailDrawerProps) {
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    if (!leadId) {
      setLead(null);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch(`/api/leads/${leadId}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? "Could not load lead");
        }
        return response.json() as Promise<LeadDetail>;
      })
      .then((data) => {
        setLead(data);
        setLoading(false);
      })
      .catch((fetchError: unknown) => {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") return;
        setLead(null);
        setLoading(false);
        setError(fetchError instanceof Error ? fetchError.message : "Could not load lead");
      });

    return () => controller.abort();
  }, [leadId]);

  const phoneHref = lead?.phone ? phoneTelHref(lead.phone) : null;
  const socialEntries = Object.entries(lead?.socialProfiles ?? {});
  const openingHours = lead ? formatOpeningHours(lead.openingHours) : null;
  const summary =
    displayValue(lead?.businessSummary) ??
    displayValue(lead?.gmbDescription) ??
    "No summary available yet.";

  async function copyLeadId() {
    if (!lead?._id) return;
    await navigator.clipboard.writeText(lead._id);
    setCopiedId(true);
    window.setTimeout(() => setCopiedId(false), 1500);
  }

  return (
    <Drawer
      open={Boolean(leadId)}
      onClose={onClose}
      title={lead?.businessName ?? fallbackTitle ?? "Lead details"}
      panelClassName="max-w-2xl"
    >
      {loading && (
        <div className="space-y-4">
          <div className="h-24 animate-pulse rounded-xl bg-zinc-100" />
          <div className="h-40 animate-pulse rounded-xl bg-zinc-100" />
          <div className="h-32 animate-pulse rounded-xl bg-zinc-100" />
        </div>
      )}

      {error && !loading && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {lead && !loading && (
        <div className="space-y-5">
          <div className="rounded-xl border border-zinc-200 bg-gradient-to-br from-zinc-50 to-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                {lead.category && (
                  <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                    {lead.category}
                  </p>
                )}
                <p className="text-sm text-zinc-600">
                  {lead.city}, {lead.country}
                </p>
                <p className="text-sm font-medium text-zinc-900">
                  {lead.rating} rating · {lead.reviewCount} reviews
                </p>
              </div>
              <div className="flex flex-wrap justify-end gap-1.5">
                <Badge label={lead.status ?? "scraped"} />
                {lead.digitalGap && (
                  <Badge label={lead.digitalGap} tone={gapTone(lead.digitalGap)} />
                )}
                {lead.enrichmentStatus && <Badge label={lead.enrichmentStatus} />}
                {lead.emailDiscoveryStatus && (
                  <Badge
                    label={lead.emailDiscoveryStatus}
                    tone={emailDiscoveryTone(lead.emailDiscoveryStatus)}
                  />
                )}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {phoneHref ? (
                <a href={phoneHref} className={actionButtonClassName}>
                  Call
                </a>
              ) : (
                <button type="button" disabled className={actionButtonClassName}>
                  Call
                </button>
              )}
              {lead.email ? (
                <a href={`mailto:${lead.email}`} className={actionButtonClassName}>
                  Email
                </a>
              ) : (
                <button type="button" disabled className={actionButtonClassName}>
                  Email
                </button>
              )}
              {lead.website ? (
                <a
                  href={websiteHref(lead.website)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={actionButtonClassName}
                >
                  Website
                </a>
              ) : (
                <button type="button" disabled className={actionButtonClassName}>
                  Website
                </button>
              )}
              {lead.mapsUrl ? (
                <a
                  href={lead.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={actionButtonClassName}
                >
                  Maps
                </a>
              ) : (
                <button type="button" disabled className={actionButtonClassName}>
                  Maps
                </button>
              )}
            </div>
          </div>

          <DetailCard title="About" description="Business summary from enrichment or Google listing">
            <p className="text-sm leading-relaxed text-zinc-700">{summary}</p>
          </DetailCard>

          <DetailCard title="Contact" description="Reach-out details scraped from Google Maps and websites">
            <dl className="space-y-3">
              {phoneHref ? (
                <InfoLinkRow label="Phone" href={phoneHref} display={lead.phone} />
              ) : (
                <InfoRow label="Phone" value={<EmptyValue />} />
              )}
              {lead.email ? (
                <InfoLinkRow
                  label="Email"
                  href={`mailto:${lead.email}`}
                  display={lead.email}
                />
              ) : (
                <InfoRow label="Email" value={<EmptyValue />} />
              )}
              {displayValue(lead.emailSource) ? (
                <InfoRow label="Email source" value={lead.emailSource} />
              ) : null}
              {lead.website ? (
                <InfoLinkRow
                  label="Website"
                  href={websiteHref(lead.website)}
                  display={lead.website}
                  external
                />
              ) : (
                <InfoRow label="Website" value={<EmptyValue />} />
              )}
              <InfoRow
                label="Address"
                value={displayValue(lead.fullAddress) ?? <EmptyValue />}
              />
            </dl>
          </DetailCard>

          <div className="grid gap-5 lg:grid-cols-2">
            <DetailCard title="Google listing" description="Raw data from the Maps profile">
              <dl className="space-y-3">
                {lead.mapsUrl ? (
                  <InfoLinkRow
                    label="Maps URL"
                    href={lead.mapsUrl}
                    display="Open in Google Maps"
                    external
                  />
                ) : (
                  <InfoRow label="Maps URL" value={<EmptyValue />} />
                )}
                <InfoRow
                  label="Place ID"
                  value={displayValue(lead.mapsPlaceId) ?? <EmptyValue />}
                  mono
                />
                <InfoRow
                  label="Description"
                  value={displayValue(lead.gmbDescription) ?? <EmptyValue />}
                />
                <InfoRow
                  label="Services"
                  value={
                    (lead.gmbServices ?? []).length > 0 ? (
                      lead.gmbServices!.join(", ")
                    ) : (
                      <EmptyValue />
                    )
                  }
                />
                <InfoRow
                  label="Sections scraped"
                  value={
                    lead.sectionsFound
                      ? `Overview ${lead.sectionsFound.overview ? "yes" : "no"} · About ${lead.sectionsFound.about ? "yes" : "no"}`
                      : <EmptyValue />
                  }
                />
                <InfoRow
                  label="Top review"
                  value={displayValue(lead.topReviewSnippet) ?? <EmptyValue />}
                />
              </dl>
              {openingHours && (
                <div className="mt-4 border-t border-zinc-100 pt-4">
                  <p className="mb-2 text-xs font-medium text-zinc-500">Opening hours</p>
                  <ul className="grid gap-1 sm:grid-cols-2">
                    {openingHours.map(({ day, time }) => (
                      <li key={day} className="flex justify-between gap-2 text-sm text-zinc-700">
                        <span>{day}</span>
                        <span className="text-zinc-500">{time}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </DetailCard>

            <DetailCard title="Digital presence" description="Website and social footprint from enrichment">
              <dl className="space-y-3">
                <InfoRow
                  label="Domain"
                  value={displayValue(lead.domainName) ?? <EmptyValue />}
                />
                <InfoRow
                  label="Domain age"
                  value={
                    lead.domainAgeYears != null ? (
                      `${lead.domainAgeYears} years`
                    ) : (
                      <EmptyValue />
                    )
                  }
                />
                <InfoRow
                  label="Tech stack"
                  value={
                    lead.websiteTechStack.length > 0 ? (
                      <span className="flex flex-wrap gap-1.5">
                        {lead.websiteTechStack.map((tech) => (
                          <Badge key={tech} label={tech} tone="info" />
                        ))}
                      </span>
                    ) : (
                      <EmptyValue />
                    )
                  }
                />
              </dl>
              <div className="mt-4 border-t border-zinc-100 pt-4">
                <p className="mb-2 text-xs font-medium text-zinc-500">Social profiles</p>
                {socialEntries.length > 0 ? (
                  <dl className="space-y-2">
                    {socialEntries.map(([platform, url]) => (
                      <InfoLinkRow
                        key={platform}
                        label={platform}
                        href={url}
                        display={url}
                        external
                      />
                    ))}
                  </dl>
                ) : (
                  <p className="text-sm text-zinc-400">No social profiles found.</p>
                )}
              </div>
            </DetailCard>
          </div>

          <ActivityDivider label="Pipeline activity" />

          <div className="grid gap-5 lg:grid-cols-2">
            <DetailCard title="Scrape & enrichment" description="How this lead entered the pipeline">
              <dl className="mb-4 space-y-3">
                <InfoRow label="Search term" value={displayValue(lead.searchTerm) ?? <EmptyValue />} />
                <InfoRow
                  label="Scrape query"
                  value={displayValue(lead.scrapeQuery) ?? <EmptyValue />}
                />
                <InfoRow label="Location" value={`${lead.city}, ${lead.country}`} />
                <InfoRow
                  label="Rating"
                  value={`${lead.rating} (${lead.reviewCount} reviews)`}
                />
              </dl>
              <ul>
                <TimelineItem label="Scraped" timestamp={lead.scrapedAt} />
                <TimelineItem
                  label="Enriched"
                  timestamp={lead.enrichedAt}
                  detail={
                    lead.enrichmentStatus
                      ? `Status: ${lead.enrichmentStatus}`
                      : undefined
                  }
                />
                <TimelineItem
                  label="Last updated"
                  timestamp={lead.updatedAt}
                  isLast
                />
              </ul>
            </DetailCard>

            <DetailCard
              title="Email discovery"
              description="Automated attempts to find a contact email"
            >
              <div className="mb-4 grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-zinc-50 px-3 py-2 text-center">
                  <p className="text-lg font-semibold text-zinc-900">
                    {lead.emailDiscoveryStatus ?? "pending"}
                  </p>
                  <p className="text-xs text-zinc-500">Status</p>
                </div>
                <div className="rounded-lg bg-zinc-50 px-3 py-2 text-center">
                  <p className="text-lg font-semibold text-zinc-900">
                    {lead.pagesChecked ?? "—"}
                  </p>
                  <p className="text-xs text-zinc-500">Pages</p>
                </div>
                <div className="rounded-lg bg-zinc-50 px-3 py-2 text-center">
                  <p className="text-lg font-semibold text-zinc-900">
                    {lead.emailCandidatesTried ?? "—"}
                  </p>
                  <p className="text-xs text-zinc-500">Strategies</p>
                </div>
              </div>
              <EmailDiscoveryLogList attempts={lead.emailDiscoveryLog} />
            </DetailCard>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-4 py-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-zinc-500">Lead ID</p>
              <p className="font-mono text-xs break-all text-zinc-700">{lead._id}</p>
            </div>
            <button
              type="button"
              onClick={copyLeadId}
              className="shrink-0 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              {copiedId ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </Drawer>
  );
}
