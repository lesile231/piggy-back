"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { createDb } from "@/lib/db/client";
import { getEnv } from "@/lib/env";
import { resolutionLogs } from "@/lib/db/schema";
import { verifyAdminSession } from "@/lib/auth/admin-auth";

/**
 * Dismiss (delete) failed resolution logs for a given normalizedQuery+language.
 * The id field is formatted as "normalizedQuery|language".
 */
export async function dismissMissedAction(formData: FormData): Promise<void> {
  await verifyAdminSession();

  const raw = formData.get("id") as string;
  if (!raw) return;

  const [normalizedQuery, language] = raw.split("|");
  if (!normalizedQuery || !language) return;

  const env = getEnv();
  const db = createDb(env.DATABASE_URL);

  await db
    .delete(resolutionLogs)
    .where(
      and(
        eq(resolutionLogs.normalizedQuery, normalizedQuery),
        eq(resolutionLogs.language, language),
        eq(resolutionLogs.success, false),
      ),
    );

  revalidatePath("/admin/missed");
}
