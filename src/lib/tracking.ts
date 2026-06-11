/** Tracked-link utilities for Comment-to-DM campaigns */

const URL_PATTERN = /https?:\/\/[^\s<>"')[\]]+/i;

function trimTrailingPunctuation(url: string) {
  return url.replace(/[.,!?;:]+$/, "");
}

export function extractFirstUrl(message: string): string | null {
  const match = message.match(URL_PATTERN);
  if (!match) return null;
  try {
    return new URL(trimTrailingPunctuation(match[0])).toString();
  } catch {
    return null;
  }
}

export function buildTrackedUrl(slug: string, baseUrl?: string) {
  const resolved =
    baseUrl ??
    (typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXTAUTH_URL ?? "http://localhost:3000");
  return `${resolved.replace(/\/$/, "")}/r/${slug}`;
}

export function renderMessageWithTracking({
  message,
  commenterName,
  trackedLinks,
  baseUrl,
}: {
  message: string;
  commenterName?: string | null;
  trackedLinks?: { slug: string; destinationUrl: string }[];
  baseUrl?: string;
}) {
  let rendered = message.replace(/\{username\}/gi, commenterName ?? "there");
  const primaryLink = trackedLinks?.[0];
  if (!primaryLink) return rendered;

  const trackedUrl = buildTrackedUrl(primaryLink.slug, baseUrl);

  if (/\{link\}/i.test(rendered)) {
    return rendered.replace(/\{link\}/gi, trackedUrl);
  }
  if (rendered.includes(primaryLink.destinationUrl)) {
    return rendered.replaceAll(primaryLink.destinationUrl, trackedUrl);
  }
  return rendered.replaceAll(
    primaryLink.destinationUrl.replace(/\/$/, ""),
    trackedUrl
  );
}

/** Generate a short random slug for tracked links */
export function generateTrackedLinkSlug(): string {
  return Math.random().toString(36).slice(2, 9);
}

/** Generate a unique slug for campaign report sharing */
export function generateReportShareSlug(): string {
  return (
    Math.random().toString(36).slice(2, 9) +
    Math.random().toString(36).slice(2, 9)
  );
}

export function buildReportUrl(slug: string, baseUrl?: string) {
  const resolved =
    baseUrl ??
    (typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXTAUTH_URL ?? "http://localhost:3000");
  return `${resolved.replace(/\/$/, "")}/reports/${slug}`;
}
