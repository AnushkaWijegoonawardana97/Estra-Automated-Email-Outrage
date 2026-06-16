import { DashboardNav } from "@/components/organisms/DashboardNav";
import { UnsubscribedTable } from "@/components/organisms/UnsubscribedTable";
import { connectMongo } from "@/lib/mongodb";
import { Unsubscribed } from "@/lib/models";

export const dynamic = "force-dynamic";

export default async function UnsubscribedPage() {
  await connectMongo();
  const records = await Unsubscribed.find().sort({ unsubscribedAt: -1 }).lean();

  const serialized = records.map((record) => ({
    _id: String(record._id),
    email: record.email,
    businessName: record.businessName,
    source: record.source,
    unsubscribedAt: record.unsubscribedAt.toISOString(),
  }));

  return (
    <>
      <DashboardNav />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <UnsubscribedTable initialRecords={serialized} />
      </main>
    </>
  );
}
