"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { createDb } from "@/lib/db/client";
import { getEnv } from "@/lib/env";
import { tourismSpots } from "@/lib/db/schema";
import { verifyAdminSession } from "@/lib/auth/admin-auth";

function extractLocalized(formData: FormData, prefix: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const locale of ["ko", "en", "ja", "zh"]) {
    const value = formData.get(`${prefix}.${locale}`) as string | null;
    if (value) result[locale] = value;
  }
  return result;
}

function extractSpotData(formData: FormData) {
  const nameKo = formData.get("nameKo") as string;
  if (!nameKo) throw new Error("한국어 이름은 필수입니다.");

  const lat = formData.get("latitude") as string;
  const lng = formData.get("longitude") as string;
  const rating = formData.get("rating") as string;
  const imagesRaw = (formData.get("images") as string) ?? "";
  const images = imagesRaw.split("\n").map((s) => s.trim()).filter(Boolean);

  return {
    nameKo,
    names: extractLocalized(formData, "names"),
    description: extractLocalized(formData, "description"),
    addressKo: (extractLocalized(formData, "addresses").ko as string) || null,
    addresses: extractLocalized(formData, "addresses"),
    latitude: lat ? lat : null,
    longitude: lng ? lng : null,
    phone: (formData.get("phone") as string) || null,
    website: (formData.get("website") as string) || null,
    rating: rating ? rating : null,
    images,
    isActive: formData.get("isActive") === "true",
    source: "curated" as const,
  };
}

export async function createSpotAction(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  await verifyAdminSession();

  try {
    const data = extractSpotData(formData);
    const env = getEnv();
    const db = createDb(env.DATABASE_URL);
    await db.insert(tourismSpots).values(data);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "저장에 실패했습니다." };
  }

  revalidatePath("/admin/spots");
  redirect("/admin/spots");
}

export async function updateSpotAction(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  await verifyAdminSession();

  const id = formData.get("id") as string;
  if (!id) return { error: "ID가 없습니다." };

  try {
    const data = extractSpotData(formData);
    const env = getEnv();
    const db = createDb(env.DATABASE_URL);
    await db.update(tourismSpots).set({ ...data, updatedAt: new Date() }).where(eq(tourismSpots.id, id));
  } catch (e) {
    return { error: e instanceof Error ? e.message : "저장에 실패했습니다." };
  }

  revalidatePath("/admin/spots");
  redirect("/admin/spots");
}

export async function deleteSpotAction(formData: FormData): Promise<void> {
  await verifyAdminSession();

  const id = formData.get("id") as string;
  if (!id) return;

  const env = getEnv();
  const db = createDb(env.DATABASE_URL);
  await db.delete(tourismSpots).where(eq(tourismSpots.id, id));

  revalidatePath("/admin/spots");
  redirect("/admin/spots");
}
