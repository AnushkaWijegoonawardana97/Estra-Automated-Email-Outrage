import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const emailEventSchema = new Schema(
  {
    emailId: { type: Schema.Types.ObjectId, ref: "EmailSent", required: true },
    leadId: { type: Schema.Types.ObjectId, ref: "Lead", required: true },
    eventType: {
      type: String,
      enum: ["opened", "clicked", "replied", "bounced", "unsubscribed"],
      required: true,
    },
    serviceTag: { type: String, default: null },
    occurredAt: { type: Date, default: Date.now },
  },
  { collection: "email_events" },
);

emailEventSchema.index({ emailId: 1 });
emailEventSchema.index({ leadId: 1 });
emailEventSchema.index({ eventType: 1 });

export type EmailEventDocument = InferSchemaType<typeof emailEventSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const EmailEvent: Model<EmailEventDocument> =
  mongoose.models.EmailEvent ??
  mongoose.model<EmailEventDocument>("EmailEvent", emailEventSchema);
