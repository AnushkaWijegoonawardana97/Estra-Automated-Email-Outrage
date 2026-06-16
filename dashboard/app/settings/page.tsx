import { DashboardNav } from "@/components/organisms/DashboardNav";
import { SettingsTabs } from "@/components/organisms/SettingsTabs";
import { defaultConfigValues } from "@/lib/defaultConfig";
import { migrateTargetMarketsConfig } from "@/lib/migrateTargetMarkets";
import { connectMongo } from "@/lib/mongodb";
import { Config } from "@/lib/models";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await connectMongo();
  let config = await Config.findOne().lean();
  if (!config) {
    const created = await Config.create({
      ...defaultConfigValues,
      updatedAt: new Date(),
    });
    config = created.toObject();
  }

  const migrated = migrateTargetMarketsConfig(config as Record<string, unknown>);
  const serialized = JSON.parse(JSON.stringify(migrated));

  const needsPersist =
    !Array.isArray(config.targetCountries) ||
    !Array.isArray(config.searchTerms) ||
    !config.scrapeQueryTemplate ||
    Array.isArray(config.searchTargets);

  if (needsPersist) {
    await Config.findOneAndUpdate(
      {},
      {
        $set: {
          targetCountries: migrated.targetCountries,
          searchTerms: migrated.searchTerms,
          scrapeQueryTemplate: migrated.scrapeQueryTemplate,
          updatedAt: new Date(),
        },
        $unset: { searchTargets: "" },
      },
    );
  }

  return (
    <>
      <DashboardNav />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <SettingsTabs initialConfig={serialized} />
      </main>
    </>
  );
}
