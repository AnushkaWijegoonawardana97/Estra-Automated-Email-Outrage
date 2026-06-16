import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { defaultConfigValues } from "../defaultConfig";

const targetCitySchema = new Schema(
  {
    name: String,
    enabled: Boolean,
    isCustom: Boolean,
  },
  { _id: false },
);

const targetCountrySchema = new Schema(
  {
    id: String,
    iso2: String,
    name: String,
    stateIso2: String,
    stateName: String,
    enabled: Boolean,
    cities: [targetCitySchema],
  },
  { _id: false },
);

const searchTermSchema = new Schema(
  {
    id: String,
    term: String,
    enabled: Boolean,
  },
  { _id: false },
);

const emailPromptsSchema = new Schema(
  {
    initialEmail: String,
    followupGeneric: String,
    followupTargeted: String,
    enrichmentSummary: String,
  },
  { _id: false },
);

const legacyCitySchema = new Schema(
  {
    city: String,
    enabled: Boolean,
    searchQueries: [String],
  },
  { _id: false },
);

const legacySearchTargetSchema = new Schema(
  {
    country: String,
    countryCode: String,
    enabled: Boolean,
    cities: [legacyCitySchema],
  },
  { _id: false },
);

const configSchema = new Schema(
  {
    minRating: { type: Number, default: defaultConfigValues.minRating },
    requireNoWebsite: {
      type: Boolean,
      default: defaultConfigValues.requireNoWebsite,
    },
    weakWebsiteDomains: {
      type: [String],
      default: defaultConfigValues.weakWebsiteDomains,
    },
    maxEmailsPerDay: {
      type: Number,
      default: defaultConfigValues.maxEmailsPerDay,
    },
    sendDays: { type: [String], default: defaultConfigValues.sendDays },
    sendHourStart: {
      type: Number,
      default: defaultConfigValues.sendHourStart,
    },
    sendHourEnd: { type: Number, default: defaultConfigValues.sendHourEnd },
    followUpDelayDays: {
      type: Number,
      default: defaultConfigValues.followUpDelayDays,
    },
    maxFollowUps: { type: Number, default: defaultConfigValues.maxFollowUps },
    targetedFollowUpDelayDays: {
      type: Number,
      default: defaultConfigValues.targetedFollowUpDelayDays,
    },
    openedFollowUpDelayDays: {
      type: Number,
      default: defaultConfigValues.openedFollowUpDelayDays,
    },
    stopFollowUpAfterDays: {
      type: Number,
      default: defaultConfigValues.stopFollowUpAfterDays,
    },
    franchiseKeywords: {
      type: [String],
      default: defaultConfigValues.franchiseKeywords,
    },
    fromEmail: { type: String, default: defaultConfigValues.fromEmail },
    fromName: { type: String, default: defaultConfigValues.fromName },
    targetCountries: {
      type: [targetCountrySchema],
      default: defaultConfigValues.targetCountries,
    },
    searchTerms: {
      type: [searchTermSchema],
      default: defaultConfigValues.searchTerms,
    },
    scrapeQueryTemplate: {
      type: String,
      default: defaultConfigValues.scrapeQueryTemplate,
    },
    searchTargets: {
      type: [legacySearchTargetSchema],
      required: false,
    },
    emailPrompts: {
      type: emailPromptsSchema,
      default: defaultConfigValues.emailPrompts,
    },
    maxWebsitePagesPerLead: {
      type: Number,
      default: defaultConfigValues.maxWebsitePagesPerLead,
    },
    enableDomainEmailSearch: {
      type: Boolean,
      default: defaultConfigValues.enableDomainEmailSearch,
    },
    enableSocialEmailScrape: {
      type: Boolean,
      default: defaultConfigValues.enableSocialEmailScrape,
    },
    enableGenericGoogleEmailSearch: {
      type: Boolean,
      default: defaultConfigValues.enableGenericGoogleEmailSearch,
    },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: "config" },
);

export type ConfigDocument = InferSchemaType<typeof configSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Config: Model<ConfigDocument> =
  mongoose.models.Config ??
  mongoose.model<ConfigDocument>("Config", configSchema);
