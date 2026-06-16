import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { Lead, Unsubscribed } from "@/lib/models";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;

  if (!token) {
    return NextResponse.redirect(`${appUrl}/unsubscribe?status=missing`);
  }

  await connectMongo();

  let record = await Unsubscribed.findOne({ token }).lean();

  if (!record) {
    const lead = await Lead.findOne({ unsubscribeToken: token }).lean();
    if (lead?.email) {
      record = await Unsubscribed.findOneAndUpdate(
        { email: lead.email.toLowerCase() },
        {
          email: lead.email.toLowerCase(),
          businessName: lead.businessName,
          token,
          source: "link_click",
          unsubscribedAt: new Date(),
        },
        { upsert: true, new: true },
      ).lean();

      await Lead.updateOne({ _id: lead._id }, { status: "unsubscribed" });
    }
  }

  if (!record) {
    return NextResponse.redirect(`${appUrl}/unsubscribe?status=not_found`);
  }

  return NextResponse.redirect(`${appUrl}/unsubscribe?status=success`);
}
