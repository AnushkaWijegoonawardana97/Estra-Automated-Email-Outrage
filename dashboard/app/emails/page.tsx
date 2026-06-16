import { DashboardNav } from "@/components/organisms/DashboardNav";
import { EmailsTable } from "@/components/organisms/EmailsTable";
import { connectMongo } from "@/lib/mongodb";
import { EmailEvent, EmailSent, Lead } from "@/lib/models";

export const dynamic = "force-dynamic";

export default async function EmailsPage() {
  await connectMongo();

  const emails = await EmailSent.find().sort({ sentAt: -1 }).limit(500).lean();
  const events = await EmailEvent.find().sort({ occurredAt: -1 }).limit(1000).lean();
  const leadIds = emails.map((email) => email.leadId);
  const leads = await Lead.find({ _id: { $in: leadIds } }).lean();
  const leadMap = new Map(leads.map((lead) => [String(lead._id), lead]));

  const serializedEmails = emails.map((email) => ({
    _id: String(email._id),
    subject: email.subject,
    body: email.body,
    emailType: email.emailType,
    sentAt: email.sentAt.toISOString(),
    leadId: String(email.leadId),
    lead: leadMap.get(String(email.leadId))
      ? {
          businessName: leadMap.get(String(email.leadId))?.businessName,
          email: leadMap.get(String(email.leadId))?.email ?? undefined,
          status: leadMap.get(String(email.leadId))?.status,
        }
      : null,
  }));

  const serializedEvents = events.map((event) => ({
    emailId: String(event.emailId),
    leadId: String(event.leadId),
    eventType: event.eventType,
    serviceTag: event.serviceTag,
    occurredAt: event.occurredAt.toISOString(),
  }));

  return (
    <>
      <DashboardNav />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <EmailsTable
          initialEmails={serializedEmails}
          initialEvents={serializedEvents}
        />
      </main>
    </>
  );
}
