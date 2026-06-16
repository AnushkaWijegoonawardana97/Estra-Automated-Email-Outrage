import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const pipelineLogSchema = new Schema(
  {
    stage: {
      type: String,
      enum: ["scraper", "filter", "enricher", "sender", "follow_up", "pipeline"],
      required: true,
    },
    level: {
      type: String,
      enum: ["info", "warning", "error", "success"],
      default: "info",
    },
    message: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: "pipeline_logs" },
);

pipelineLogSchema.index({ createdAt: -1 });
pipelineLogSchema.index({ stage: 1 });

export type PipelineLogDocument = InferSchemaType<typeof pipelineLogSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const PipelineLog: Model<PipelineLogDocument> =
  mongoose.models.PipelineLog ??
  mongoose.model<PipelineLogDocument>("PipelineLog", pipelineLogSchema);
