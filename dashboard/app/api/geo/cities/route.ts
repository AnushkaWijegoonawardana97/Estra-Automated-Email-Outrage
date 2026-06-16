import { NextRequest, NextResponse } from "next/server";
import { getCities } from "@/lib/cscClient";

export async function GET(request: NextRequest) {
  const country = request.nextUrl.searchParams.get("country");
  const state = request.nextUrl.searchParams.get("state") ?? undefined;

  if (!country) {
    return NextResponse.json({ error: "country is required" }, { status: 400 });
  }

  try {
    const cities = await getCities(country, state);
    return NextResponse.json(cities);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load cities";
    const status = message.includes("CSC_API_KEY") ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
