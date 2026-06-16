import { DashboardNav } from "@/components/organisms/DashboardNav";
import { EmailsTable } from "@/components/organisms/EmailsTable";
import { connectMongo } from "@/lib/mongodb";
import { EmailEvent, EmailSent, Lead } from "@/lib/models";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

export default async function EmailsPage() {
  await connectMongo();

  const [emails, total] = await Promise.all([
    EmailSent.find().sort({ sentAt: -1 }).limit(PAGE_SIZE).lean(),
    EmailSent.countDocuments(),
  ]);

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

  const emailIds = serializedEmails.map((email) => email._id);
  const events = emailIds.length
    ? await EmailEvent.find({ emailId: { $in: emailIds } }).lean()
    : [];

  const serializedEvents = events.map((event) => ({
    emailId: String(event.emailId),
    leadId: String(event.leadId),
    eventType: event.eventType,
    serviceTag: event.serviceTag,
    occurredAt: event.occurredAt.toISOString(),
  }));

  const emailedLeadIds = await EmailSent.distinct("leadId");
  const [openedIds, clickedIds, replied, unsubscribed] = await Promise.all([
    EmailEvent.distinct("emailId", { eventType: "opened" }),
    EmailEvent.distinct("emailId", { eventType: "clicked" }),
    Lead.countDocuments({ _id: { $in: emailedLeadIds }, status: "replied" }),
    Lead.countDocuments({ _id: { $in: emailedLeadIds }, status: "unsubscribed" }),
  ]);

  const initialStats = {
    total,
    opened: openedIds.length,
    clicked: clickedIds.length,
    replied,
    unsubscribed,
  };

  return (
    <>
      <DashboardNav />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-zinc-900">Emails</h2>
          <p className="mt-1 text-sm text-zinc-500">
            {total} email{total === 1 ? "" : "s"} sent
          </p>
        </div>
        <EmailsTable
          initialEmails={serializedEmails}
          initialEvents={serializedEvents}
          initialTotal={total}
          initialStats={initialStats}
        />
      </main>
    </>
  );
}
