import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { defaultConfigValues } from "@/lib/defaultConfig";
import {
  migrateTargetMarketsConfig,
  validateTargetMarketsConfig,
} from "@/lib/migrateTargetMarkets";
import { Config } from "@/lib/models";

function normalizeConfig<T extends Record<string, unknown>>(config: T) {
  return migrateTargetMarketsConfig(config);
}

function buildConfigUpdate(normalized: ReturnType<typeof normalizeConfig>) {
  return {
    minRating: normalized.minRating ?? defaultConfigValues.minRating,
    requireNoWebsite:
      normalized.requireNoWebsite ?? defaultConfigValues.requireNoWebsite,
    weakWebsiteDomains:
      normalized.weakWebsiteDomains ?? defaultConfigValues.weakWebsiteDomains,
    maxEmailsPerDay:
      normalized.maxEmailsPerDay ?? defaultConfigValues.maxEmailsPerDay,
    sendDays: normalized.sendDays ?? defaultConfigValues.sendDays,
    sendHourStart:
      normalized.sendHourStart ?? defaultConfigValues.sendHourStart,
    sendHourEnd: normalized.sendHourEnd ?? defaultConfigValues.sendHourEnd,
    followUpDelayDays:
      normalized.followUpDelayDays ?? defaultConfigValues.followUpDelayDays,
    maxFollowUps: normalized.maxFollowUps ?? defaultConfigValues.maxFollowUps,
    targetedFollowUpDelayDays:
      normalized.targetedFollowUpDelayDays ??
      defaultConfigValues.targetedFollowUpDelayDays,
    openedFollowUpDelayDays:
      normalized.openedFollowUpDelayDays ??
      defaultConfigValues.openedFollowUpDelayDays,
    stopFollowUpAfterDays:
      normalized.stopFollowUpAfterDays ??
      defaultConfigValues.stopFollowUpAfterDays,
    franchiseKeywords:
      normalized.franchiseKeywords ?? defaultConfigValues.franchiseKeywords,
    fromEmail: normalized.fromEmail ?? defaultConfigValues.fromEmail,
    fromName: normalized.fromName ?? defaultConfigValues.fromName,
    targetCountries: normalized.targetCountries,
    searchTerms: normalized.searchTerms,
    scrapeQueryTemplate: normalized.scrapeQueryTemplate,
    emailPrompts: normalized.emailPrompts ?? defaultConfigValues.emailPrompts,
    updatedAt: new Date(),
  };
}

export async function GET() {
  await connectMongo();
  let config = await Config.findOne().lean();

  if (!config) {
    const created = await Config.create({
      ...defaultConfigValues,
      updatedAt: new Date(),
    });
    config = created.toObject();
  }

  return NextResponse.json(normalizeConfig(config as Record<string, unknown>));
}

export async function POST(request: Request) {
  await connectMongo();
  const body = (await request.json()) as Record<string, unknown>;
  const normalized = normalizeConfig(body);
  const validationError = validateTargetMarketsConfig(normalized);

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const update = buildConfigUpdate(normalized);

  const config = await Config.findOneAndUpdate(
    {},
    { $set: update, $unset: { searchTargets: "" } },
    { upsert: true, new: true },
  ).lean();

  return NextResponse.json(normalizeConfig(config as Record<string, unknown>));
}
