import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const emailSentSchema = new Schema(
  {
    leadId: { type: Schema.Types.ObjectId, ref: "Lead", required: true },
    emailType: {
      type: String,
      enum: ["initial", "followup_generic", "followup_targeted"],
      required: true,
    },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    serviceClicked: { type: String, default: null },
    sentAt: { type: Date, default: Date.now },
    brevoMessageId: { type: String, default: "" },
    followUpCount: { type: Number, default: 0 },
  },
  { collection: "emails_sent" },
);

emailSentSchema.index({ leadId: 1 });
emailSentSchema.index({ sentAt: -1 });

export type EmailSentDocument = InferSchemaType<typeof emailSentSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const EmailSent: Model<EmailSentDocument> =
  mongoose.models.EmailSent ??
  mongoose.model<EmailSentDocument>("EmailSent", emailSentSchema);
