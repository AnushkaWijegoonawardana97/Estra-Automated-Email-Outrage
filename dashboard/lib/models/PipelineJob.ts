import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

export const PIPELINE_ACTIONS = [
  "all",
  "scrape",
  "enrich",
  "find_email",
  "send",
  "follow_up",
  "retry_failed",
] as const;

export type PipelineAction = (typeof PIPELINE_ACTIONS)[number];

const pipelineJobSchema = new Schema(
  {
    action: {
      type: String,
      enum: PIPELINE_ACTIONS,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "running", "completed", "failed"],
      default: "pending",
    },
    requestedAt: { type: Date, default: Date.now },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    error: { type: String, default: null },
    requestedBy: { type: String, default: null },
  },
  { collection: "pipeline_jobs" },
);

pipelineJobSchema.index({ status: 1, requestedAt: 1 });
pipelineJobSchema.index({ requestedAt: -1 });

export type PipelineJobDocument = InferSchemaType<typeof pipelineJobSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const PipelineJob: Model<PipelineJobDocument> =
  mongoose.models.PipelineJob ??
  mongoose.model<PipelineJobDocument>("PipelineJob", pipelineJobSchema);
