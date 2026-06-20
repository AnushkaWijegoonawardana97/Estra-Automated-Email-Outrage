export interface UploadResult {
  secureUrl: string;
  deliveryUrl: string;
  publicId: string;
  resourceType: string;
}

export async function uploadCampaignMedia(
  leadId: string,
  slot: string,
  file: File,
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("leadId", leadId);
  formData.append("slot", slot);

  const response = await fetch("/api/campaigns/media", {
    method: "POST",
    body: formData,
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? "Upload failed");
  }

  return {
    secureUrl: payload.secureUrl,
    deliveryUrl: payload.deliveryUrl ?? payload.secureUrl,
    publicId: payload.publicId,
    resourceType: payload.resourceType ?? "image",
  };
}
