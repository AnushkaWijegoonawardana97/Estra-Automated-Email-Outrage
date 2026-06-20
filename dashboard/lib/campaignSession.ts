import type { CampaignMediaOverrides } from "@/lib/cloudinary";

export interface CampaignDraft {
  subject: string;
  htmlBody: string;
  textBody: string;
}

export interface CampaignSession {
  leadIds: string[];
  templateId: string;
  activeLeadId: string;
  drafts: Record<string, CampaignDraft>;
  mediaOverrides: Record<string, CampaignMediaOverrides>;
  sendStatus: Record<string, "idle" | "sent" | "failed">;
  updatedAt: string;
}

const STORAGE_KEY = "estra-campaign-session";

function sessionKey(leadIds: string[]) {
  return `${STORAGE_KEY}:${[...leadIds].sort().join(",")}`;
}

export function loadCampaignSession(leadIds: string[]): CampaignSession | null {
  if (typeof window === "undefined" || leadIds.length === 0) return null;
  try {
    const raw = sessionStorage.getItem(sessionKey(leadIds));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CampaignSession;
    const sameLeads =
      parsed.leadIds.length === leadIds.length &&
      parsed.leadIds.every((id) => leadIds.includes(id));
    return sameLeads ? parsed : null;
  } catch {
    return null;
  }
}

export function saveCampaignSession(session: CampaignSession): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(
    sessionKey(session.leadIds),
    JSON.stringify({ ...session, updatedAt: new Date().toISOString() }),
  );
}

export function clearCampaignSession(leadIds: string[]): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(sessionKey(leadIds));
}
