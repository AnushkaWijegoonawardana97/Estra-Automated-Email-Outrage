export interface EmailEventRow {
  eventType: string;
  serviceTag?: string | null;
  occurredAt: string;
}

export interface EmailDetail {
  _id: string;
  subject: string;
  body: string;
  htmlBody: string | null;
  emailType: string;
  sentAt: string;
  brevoMessageId: string;
  followUpCount: number;
  serviceClicked: string | null;
  sendSource?: string | null;
  campaignTemplateId?: string | null;
  leadId: string;
  lead: {
    businessName?: string;
    email?: string;
    status?: string;
  } | null;
  events: EmailEventRow[];
}

export function serializeEmailDetail(
  email: {
    _id: { toString(): string };
    subject: string;
    body: string;
    htmlBody?: string | null;
    emailType: string;
    sentAt: Date;
    brevoMessageId?: string | null;
    followUpCount?: number | null;
    serviceClicked?: string | null;
    sendSource?: string | null;
    campaignTemplateId?: string | null;
    leadId: { toString(): string };
  },
  lead: {
    businessName?: string;
    email?: string | null;
    status?: string;
  } | null,
  events: Array<{
    eventType: string;
    serviceTag?: string | null;
    occurredAt: Date;
  }>,
): EmailDetail {
  return {
    _id: String(email._id),
    subject: email.subject,
    body: email.body,
    htmlBody: email.htmlBody ?? null,
    emailType: email.emailType,
    sentAt: email.sentAt.toISOString(),
    brevoMessageId: email.brevoMessageId ?? "",
    followUpCount: email.followUpCount ?? 0,
    serviceClicked: email.serviceClicked ?? null,
    sendSource: email.sendSource ?? "automated",
    campaignTemplateId: email.campaignTemplateId ?? null,
    leadId: String(email.leadId),
    lead: lead
      ? {
          businessName: lead.businessName,
          email: lead.email ?? undefined,
          status: lead.status,
        }
      : null,
    events: events.map((event) => ({
      eventType: event.eventType,
      serviceTag: event.serviceTag,
      occurredAt: event.occurredAt.toISOString(),
    })),
  };
}
