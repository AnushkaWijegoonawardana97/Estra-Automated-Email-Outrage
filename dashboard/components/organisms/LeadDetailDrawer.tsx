"use client";

import { Badge } from "@/components/atoms/Badge";
import { Drawer } from "@/components/molecules/Drawer";
import { phoneTelHref, websiteHref } from "@/lib/contactLinks";
import type { LeadRow } from "@/lib/serializeLead";

interface LeadDetailDrawerProps {
  lead: LeadRow | null;
  onClose: () => void;
}

function gapTone(gap?: string | null) {
  if (gap === "no_website") return "danger" as const;
  if (gap === "social_only") return "warning" as const;
  if (gap === "weak_site") return "info" as const;
  return "neutral" as const;
}

const linkClassName =
  "text-sky-700 underline decoration-sky-700/30 underline-offset-2 hover:text-sky-900 hover:decoration-sky-900/50";

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</dt>
      <dd className="mt-1 text-sm text-zinc-800 break-words">{value}</dd>
    </div>
  );
}

function DetailLinkField({
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
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</dt>
      <dd className="mt-1 text-sm break-words">
        <a
          href={href}
          className={linkClassName}
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {display}
        </a>
      </dd>
    </div>
  );
}

export function LeadDetailDrawer({ lead, onClose }: LeadDetailDrawerProps) {
  const phoneHref = lead?.phone ? phoneTelHref(lead.phone) : null;

  return (
    <Drawer open={Boolean(lead)} onClose={onClose} title={lead?.businessName ?? "Lead details"}>
      {lead && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge label={lead.status ?? "scraped"} />
            {lead.digitalGap && (
              <Badge label={lead.digitalGap} tone={gapTone(lead.digitalGap)} />
            )}
            {lead.category && (
              <span className="text-sm text-zinc-500">{lead.category}</span>
            )}
          </div>

          <p className="text-sm leading-relaxed text-zinc-600">
            {lead.businessSummary ?? "No summary yet."}
          </p>

          <section>
            <h3 className="mb-3 text-sm font-semibold text-zinc-900">Contact</h3>
            <dl className="grid gap-4">
              {phoneHref ? (
                <DetailLinkField label="Phone" href={phoneHref} display={lead.phone} />
              ) : (
                <DetailField label="Phone" value="Not found" />
              )}
              {lead.email ? (
                <DetailLinkField
                  label="Email"
                  href={`mailto:${lead.email}`}
                  display={lead.email}
                />
              ) : (
                <DetailField label="Email" value="Not found" />
              )}
              {lead.website ? (
                <DetailLinkField
                  label="Website"
                  href={websiteHref(lead.website)}
                  display={lead.website}
                  external
                />
              ) : (
                <DetailField label="Website" value="None" />
              )}
              <DetailField label="Address" value={lead.fullAddress || "—"} />
              <DetailField
                label="Email discovery"
                value={lead.emailDiscoveryStatus ?? "pending"}
              />
              {lead.emailSource && (
                <DetailField label="Email source" value={lead.emailSource} />
              )}
            </dl>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold text-zinc-900">Pipeline</h3>
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailField label="Search term" value={lead.searchTerm || "—"} />
              <DetailField label="Scrape query" value={lead.scrapeQuery || "—"} />
              <DetailField label="Location" value={`${lead.city}, ${lead.country}`} />
              <DetailField
                label="Rating"
                value={`${lead.rating} (${lead.reviewCount} reviews)`}
              />
              <DetailField label="Enrichment" value={lead.enrichmentStatus ?? "—"} />
              <DetailField
                label="Scraped"
                value={lead.scrapedAt ? new Date(lead.scrapedAt).toLocaleString() : "—"}
              />
            </dl>
          </section>

          {(lead.gmbServices ?? []).length > 0 && (
            <section>
              <h3 className="mb-3 text-sm font-semibold text-zinc-900">Services</h3>
              <p className="text-sm text-zinc-700">{(lead.gmbServices ?? []).join(", ")}</p>
            </section>
          )}
        </div>
      )}
    </Drawer>
  );
}
