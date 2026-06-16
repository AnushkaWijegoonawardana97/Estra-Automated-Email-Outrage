import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { EmailEvent, EmailSent } from "@/lib/models";

const SERVICE_URLS: Record<string, string> = {
  "web-design": "https://estradigital.co.uk/services/web-design",
  seo: "https://estradigital.co.uk/services/seo",
  automation: "https://estradigital.co.uk/services/automation",
};

export async function GET(request: NextRequest) {
  const leadId = request.nextUrl.searchParams.get("lead");
  const service = request.nextUrl.searchParams.get("service") ?? "web-design";

  const redirectUrl =
    SERVICE_URLS[service] ?? "https://estradigital.co.uk/services";

  if (!leadId) {
    return NextResponse.redirect(redirectUrl);
  }

  await connectMongo();

  const latestEmail = await EmailSent.findOne({ leadId })
    .sort({ sentAt: -1 })
    .lean();

  if (latestEmail) {
    await EmailEvent.create({
      emailId: latestEmail._id,
      leadId: latestEmail.leadId,
      eventType: "clicked",
      serviceTag: service,
      occurredAt: new Date(),
    });
  }

  return NextResponse.redirect(redirectUrl);
}
