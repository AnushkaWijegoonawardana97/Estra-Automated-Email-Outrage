import { NextResponse } from "next/server";
import { runCampaignService } from "@/lib/runCampaignService";

export async function GET() {
  const result = await runCampaignService<{ templates: Record<string, unknown> }>(
    "list-templates",
    {},
  );
  return NextResponse.json(result);
}
