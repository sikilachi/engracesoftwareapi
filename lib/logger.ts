import { prisma } from "./db";

type Level = "info" | "warn" | "error";

export async function log(area: string, message: string, level: Level = "info", detail?: unknown) {
  try {
    await prisma.logEntry.create({
      data: {
        area, message, level,
        detail: detail ? JSON.stringify(detail).slice(0, 8000) : null,
      },
    });
  } catch {
    console.error(`[log-fail] ${area}: ${message}`);
  }
}
