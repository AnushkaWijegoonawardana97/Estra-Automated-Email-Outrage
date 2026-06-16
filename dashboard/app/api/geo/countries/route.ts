import { NextResponse } from "next/server";
import { getCountries } from "@/lib/cscClient";

export async function GET() {
  try {
    const countries = await getCountries();
    return NextResponse.json(countries);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load countries";
    const status = message.includes("CSC_API_KEY") ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
