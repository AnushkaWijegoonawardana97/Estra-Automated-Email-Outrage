import { resolve } from "path";

const EMAIL_TRANSFORMS = "w_520,c_limit,f_auto,q_auto,dpr_1.0";

export const CAMPAIGN_MEDIA_DEFAULTS = {
  seo_report: "estra-campaigns/defaults/seo-audit-sample",
  ui_issues: "estra-campaigns/defaults/ui-issues-sample",
  demo_preview_restaurant: "estra-campaigns/defaults/demo-preview-restaurant",
  demo_preview_generic: "estra-campaigns/defaults/demo-preview-generic",
  hero_band: "estra-campaigns/defaults/hero-gradient",
} as const;

export type CampaignMediaSlot =
  | "seoReportUrl"
  | "uiIssuesUrl"
  | "demoPreviewUrl"
  | "demoVideoUrl"
  | "heroBandUrl";

export interface CampaignMediaOverrides {
  seoReportUrl?: string;
  uiIssuesUrl?: string;
  demoPreviewUrl?: string;
  demoVideoUrl?: string;
  heroBandUrl?: string;
}

export function getCloudName(): string {
  return (
    process.env.CLOUDINARY_CLOUD_NAME ??
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ??
    ""
  ).trim();
}

export function buildCloudinaryDeliveryUrl(
  publicId: string,
  options: { width?: number; resourceType?: "image" | "video" } = {},
): string {
  const cloudName = getCloudName();
  const { width = 520, resourceType = "image" } = options;

  if (!cloudName) {
    return fallbackUrlForPublicId(publicId);
  }

  const transforms = `${EMAIL_TRANSFORMS.replace("w_520", `w_${width}`)}`;
  return `https://res.cloudinary.com/${cloudName}/${resourceType}/upload/${transforms}/${publicId}`;
}

function fallbackUrlForPublicId(publicId: string): string {
  const base = "https://www.estradigital.co.uk/images";
  if (publicId.includes("seo")) return `${base}/hero-gradient.png`;
  if (publicId.includes("ui")) return `${base}/work-eventbook.png`;
  if (publicId.includes("restaurant") || publicId.includes("ordexia")) {
    return `${base}/work-ordexia.png`;
  }
  return `${base}/work-thesistechhub.png`;
}

export function getDefaultMediaUrls(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(CAMPAIGN_MEDIA_DEFAULTS).map(([key, publicId]) => [
      key,
      buildCloudinaryDeliveryUrl(publicId),
    ]),
  );
}

export function getMonorepoRoot(): string {
  const cwd = process.cwd();
  return cwd.endsWith("dashboard") ? resolve(cwd, "..") : cwd;
}

export function getPipelinePython(): string {
  return process.env.PIPELINE_PYTHON ?? "python3";
}
