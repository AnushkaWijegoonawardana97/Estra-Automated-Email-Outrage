import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectMongo } from "@/lib/mongodb";
import { serializeLead } from "@/lib/serializeLead";
import { Lead } from "@/lib/models";

export async function GET(request: Request) {
  await connectMongo();

  const { searchParams } = new URL(request.url);
  const country = searchParams.get("country");
  const city = searchParams.get("city");
  const searchTerm = searchParams.get("searchTerm");
  const status = searchParams.get("status");
  const query = searchParams.get("q")?.trim();
  const hasEmail = searchParams.get("hasEmail");
  const hasContact = searchParams.get("hasContact");
  const minRating = searchParams.get("minRating");
  const maxRating = searchParams.get("maxRating");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const filter: Record<string, unknown> = {};
  const andConditions: Record<string, unknown>[] = [];

  const idsParam = searchParams.get("ids");
  if (idsParam) {
    const ids = idsParam.split(",").map((value) => value.trim()).filter(Boolean);
    if (ids.length > 0) {
      filter._id = {
        $in: ids
          .filter((id) => mongoose.Types.ObjectId.isValid(id))
          .map((id) => new mongoose.Types.ObjectId(id)),
      };
    }
  }

  if (country) filter.country = country;
  if (city) filter.city = city;
  if (searchTerm) filter.searchTerm = searchTerm;
  if (status) filter.status = status;

  if (query) {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    andConditions.push({
      $or: [{ businessName: regex }, { email: regex }, { phone: regex }],
    });
  }

  if (hasEmail === "yes") {
    andConditions.push({ email: { $exists: true, $nin: [null, ""] } });
  } else if (hasEmail === "no") {
    andConditions.push({
      $or: [{ email: null }, { email: "" }, { email: { $exists: false } }],
    });
  }

  if (hasContact === "yes") {
    andConditions.push({ phone: { $exists: true, $nin: [null, ""] } });
  } else if (hasContact === "no") {
    andConditions.push({
      $or: [{ phone: null }, { phone: "" }, { phone: { $exists: false } }],
    });
  }

  if (andConditions.length > 0) {
    filter.$and = andConditions;
  }
  if (minRating || maxRating) {
    filter.rating = {};
    if (minRating) (filter.rating as Record<string, number>).$gte = Number(minRating);
    if (maxRating) (filter.rating as Record<string, number>).$lte = Number(maxRating);
  }
  if (from || to) {
    filter.scrapedAt = {};
    if (from) (filter.scrapedAt as Record<string, Date>).$gte = new Date(from);
    if (to) (filter.scrapedAt as Record<string, Date>).$lte = new Date(to);
  }

  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 25)));
  const skip = (page - 1) * limit;

  const [leads, total] = await Promise.all([
    Lead.find(filter).sort({ scrapedAt: -1 }).skip(skip).limit(limit).lean(),
    Lead.countDocuments(filter),
  ]);

  return NextResponse.json({
    leads: leads.map((lead) => serializeLead(lead)),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
}
