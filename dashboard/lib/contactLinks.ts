export function phoneTelHref(phone: string): string | null {
  const normalized = phone.replace(/[^\d+]/g, "");
  return normalized ? `tel:${normalized}` : null;
}

export function websiteHref(website: string): string {
  return website.startsWith("http") ? website : `https://${website}`;
}
