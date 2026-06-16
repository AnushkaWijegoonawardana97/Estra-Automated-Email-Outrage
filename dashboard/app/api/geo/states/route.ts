import { NextRequest, NextResponse } from "next/server";
import { getStates } from "@/lib/cscClient";

export async function GET(request: NextRequest) {
  const country = request.nextUrl.searchParams.get("country");

  if (!country) {
    return NextResponse.json({ error: "country is required" }, { status: 400 });
  }

  try {
    const states = await getStates(country);
    return NextResponse.json(states);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load states";
    const status = message.includes("CSC_API_KEY") ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
