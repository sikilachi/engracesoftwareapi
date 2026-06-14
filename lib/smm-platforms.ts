export const SMM_PLATFORMS = [
  "Instagram",
  "TikTok",
  "YouTube",
  "Facebook",
  "X / Twitter",
  "Telegram",
  "Spotify",
  "Twitch",
  "Discord",
  "Snapchat",
  "LinkedIn",
  "Pinterest",
  "Reddit",
  "Trustpilot",
  "Kick",
];

export function norm(value: unknown): string {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function normalizePlatform(value: unknown): string {
  const s = norm(value);
  if (!s) return "";
  if (s === "twitter" || s === "x" || s === "x / twitter") return "x";
  return s;
}

export function detectPlatform(name: string, category = ""): string {
  const s = norm(`${name} ${category}`);
  const pairs: [string, string][] = [
    ["instagram", "instagram"],
    ["tiktok", "tiktok"],
    ["youtube", "youtube"],
    ["facebook", "facebook"],
    ["twitter", "x"],
    ["telegram", "telegram"],
    ["spotify", "spotify"],
    ["twitch", "twitch"],
    ["discord", "discord"],
    ["snapchat", "snapchat"],
    ["linkedin", "linkedin"],
    ["pinterest", "pinterest"],
    ["reddit", "reddit"],
    ["trustpilot", "trustpilot"],
    ["kick", "kick"],
  ];
  return pairs.find(([needle]) => s.includes(needle))?.[1] ?? "other";
}

export function detectServiceType(name: string, category = ""): string {
  const s = norm(`${name} ${category}`);
  const pairs: [string, string][] = [
    ["follower", "followers"],
    ["takip", "followers"],
    ["subscriber", "subscribers"],
    ["member", "members"],
    ["view", "views"],
    ["play", "plays"],
    ["like", "likes"],
    ["comment", "comments"],
    ["share", "shares"],
    ["save", "saves"],
    ["review", "reviews"],
  ];
  return pairs.find(([needle]) => s.includes(needle))?.[1] ?? "";
}

export function asInt(value: unknown): number | null {
  const n = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? Math.trunc(n) : null;
}
