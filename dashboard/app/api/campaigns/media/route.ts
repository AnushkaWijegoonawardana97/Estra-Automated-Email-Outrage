import { NextResponse } from "next/server";
import {
  CAMPAIGN_MEDIA_DEFAULTS,
  buildCloudinaryDeliveryUrl,
  getDefaultMediaUrls,
} from "@/lib/cloudinary";

export async function GET() {
  const defaults = getDefaultMediaUrls();
  const publicIds = CAMPAIGN_MEDIA_DEFAULTS;

  return NextResponse.json({
    defaults,
    publicIds,
    slots: [
      {
        key: "seoReportUrl",
        label: "SEO report",
        defaultUrl: defaults.seo_report,
        publicId: publicIds.seo_report,
      },
      {
        key: "uiIssuesUrl",
        label: "UI issues",
        defaultUrl: defaults.ui_issues,
        publicId: publicIds.ui_issues,
      },
      {
        key: "demoPreviewUrl",
        label: "Demo preview",
        defaultUrl: defaults.demo_preview_restaurant,
        publicId: publicIds.demo_preview_restaurant,
      },
      {
        key: "demoVideoUrl",
        label: "Demo video",
        defaultUrl: null,
        publicId: null,
      },
    ],
  });
}

export async function POST(request: Request) {
  const cloudName =
    process.env.CLOUDINARY_CLOUD_NAME ??
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const uploadPreset =
    process.env.CLOUDINARY_UPLOAD_PRESET ??
    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName) {
    return NextResponse.json(
      { error: "Cloudinary cloud name is not configured" },
      { status: 503 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const leadId = String(formData.get("leadId") ?? "unknown");
  const slot = String(formData.get("slot") ?? "asset");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  const uploadPresetValue = uploadPreset?.trim();

  if (uploadPresetValue) {
    const uploadForm = new FormData();
    uploadForm.append("file", file);
    uploadForm.append("upload_preset", uploadPresetValue);
    uploadForm.append("folder", `estra-campaigns/leads/${leadId}/${slot}`);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
      { method: "POST", body: uploadForm },
    );
    const payload = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { error: payload.error?.message ?? "Cloudinary upload failed" },
        { status: response.status },
      );
    }

    const secureUrl = String(payload.secure_url ?? "");
    const publicId = String(payload.public_id ?? "");
    const resourceType = String(payload.resource_type ?? "image");

    return NextResponse.json({
      secureUrl,
      publicId,
      resourceType,
      deliveryUrl:
        resourceType === "video"
          ? secureUrl
          : buildCloudinaryDeliveryUrl(publicId),
    });
  }

  if (!apiKey || !apiSecret) {
    return NextResponse.json(
      {
        error:
          "Signed Cloudinary upload requires API key and secret, or set CLOUDINARY_UPLOAD_PRESET",
      },
      { status: 503 },
    );
  }

  const uploadForm = new FormData();
  uploadForm.append("file", file);
  uploadForm.append("folder", `estra-campaigns/leads/${leadId}/${slot}`);

  const timestamp = Math.floor(Date.now() / 1000);
  const params = new URLSearchParams({
    timestamp: String(timestamp),
    folder: `estra-campaigns/leads/${leadId}/${slot}`,
  });

  const crypto = await import("crypto");
  const signature = crypto
    .createHash("sha1")
    .update(`${params.toString()}${apiSecret}`)
    .digest("hex");

  uploadForm.append("api_key", apiKey);
  uploadForm.append("timestamp", String(timestamp));
  uploadForm.append("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
    { method: "POST", body: uploadForm },
  );

  const payload = await response.json();
  if (!response.ok) {
    return NextResponse.json(
      { error: payload.error?.message ?? "Cloudinary upload failed" },
      { status: response.status },
    );
  }

  const secureUrl = String(payload.secure_url ?? "");
  const publicId = String(payload.public_id ?? "");
  const resourceType = String(payload.resource_type ?? "image");

  return NextResponse.json({
    secureUrl,
    publicId,
    resourceType,
    deliveryUrl:
      resourceType === "video"
        ? secureUrl
        : buildCloudinaryDeliveryUrl(publicId),
  });
}
