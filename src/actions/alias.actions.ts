"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { createDb } from "@/lib/db/client";
import { getEnv } from "@/lib/env";
import { locationAliases } from "@/lib/db/schema";
import { verifyAdminSession } from "@/lib/auth/admin-auth";

export async function createAliasAction(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  await verifyAdminSession();

  const alias = (formData.get("alias") as string)?.trim();
  const language = formData.get("language") as string;
  const spotId = formData.get("spotId") as string;

  if (!alias) return { error: "검색어는 필수입니다." };
  if (!language) return { error: "언어를 선택해주세요." };
  if (!spotId) return { error: "연결 장소를 선택해주세요." };

  try {
    const env = getEnv();
    const db = createDb(env.DATABASE_URL);
    const type = (formData.get("type") as string) || "place";
    await db.insert(locationAliases).values({
      alias,
      language,
      spotId,
      source: "manual",
      type,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "저장에 실패했습니다.";
    if (msg.includes("uq_alias_language")) {
      return { error: "이미 동일한 검색어와 언어 조합이 존재합니다." };
    }
    return { error: msg };
  }

  revalidatePath("/admin/aliases");
  redirect("/admin/aliases");
}

export async function updateAliasAction(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  await verifyAdminSession();

  const id = formData.get("id") as string;
  if (!id) return { error: "ID가 없습니다." };

  const alias = (formData.get("alias") as string)?.trim();
  const language = formData.get("language") as string;
  const spotId = formData.get("spotId") as string;

  if (!alias) return { error: "검색어는 필수입니다." };
  if (!language) return { error: "언어를 선택해주세요." };
  if (!spotId) return { error: "연결 장소를 선택해주세요." };

  try {
    const env = getEnv();
    const db = createDb(env.DATABASE_URL);
    await db
      .update(locationAliases)
      .set({ alias, language, spotId, source: "manual", type: (formData.get("type") as string) || "place" })
      .where(eq(locationAliases.id, id));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "저장에 실패했습니다.";
    if (msg.includes("uq_alias_language")) {
      return { error: "이미 동일한 검색어와 언어 조합이 존재합니다." };
    }
    return { error: msg };
  }

  revalidatePath("/admin/aliases");
  redirect("/admin/aliases");
}

export async function deleteAliasAction(formData: FormData): Promise<void> {
  await verifyAdminSession();

  const id = formData.get("id") as string;
  if (!id) return;

  const env = getEnv();
  const db = createDb(env.DATABASE_URL);
  await db.delete(locationAliases).where(eq(locationAliases.id, id));

  revalidatePath("/admin/aliases");
  redirect("/admin/aliases");
}
