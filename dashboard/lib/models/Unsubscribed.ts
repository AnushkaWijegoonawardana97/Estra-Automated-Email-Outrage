import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const unsubscribedSchema = new Schema(
  {
    email: { type: String, required: true, unique: true },
    businessName: { type: String, default: "" },
    token: { type: String, required: true, unique: true },
    unsubscribedAt: { type: Date, default: Date.now },
    source: {
      type: String,
      enum: ["link_click", "brevo_webhook", "manual"],
      default: "link_click",
    },
  },
  { collection: "unsubscribed" },
);

export type UnsubscribedDocument = InferSchemaType<typeof unsubscribedSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Unsubscribed: Model<UnsubscribedDocument> =
  mongoose.models.Unsubscribed ??
  mongoose.model<UnsubscribedDocument>("Unsubscribed", unsubscribedSchema);
