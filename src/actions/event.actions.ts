"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { createDb } from "@/lib/db/client";
import { getEnv } from "@/lib/env";
import { events } from "@/lib/db/schema";
import { verifyAdminSession } from "@/lib/auth/admin-auth";
import { extractLocalized } from "@/lib/form-utils";

function extractEventData(formData: FormData) {
  const nameKo = formData.get("nameKo") as string;
  if (!nameKo) throw new Error("한국어 이름은 필수입니다.");

  const startsAt = formData.get("startsAt") as string;
  const endsAt = formData.get("endsAt") as string;
  if (!startsAt || !endsAt) throw new Error("시작일시와 종료일시는 필수입니다.");

  const lat = formData.get("latitude") as string;
  const lng = formData.get("longitude") as string;
  const imagesRaw = (formData.get("images") as string) ?? "";

  return {
    nameKo,
    names: extractLocalized(formData, "names"),
    description: extractLocalized(formData, "description"),
    category: (formData.get("category") as string) || "festival",
    venueName: extractLocalized(formData, "venueName"),
    addressKo: extractLocalized(formData, "venueName").ko || null,
    latitude: lat ? lat : null,
    longitude: lng ? lng : null,
    startsAt: new Date(startsAt),
    endsAt: new Date(endsAt),
    recurrence: (formData.get("recurrence") as string) || null,
    priceInfo: extractLocalized(formData, "priceInfo"),
    bookingUrl: (formData.get("bookingUrl") as string) || null,
    images: imagesRaw.split("\n").map((s) => s.trim()).filter(Boolean),
    isActive: formData.get("isActive") === "true",
    source: "curated" as const,
  };
}

export async function createEventAction(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  await verifyAdminSession();
  try {
    const data = extractEventData(formData);
    const env = getEnv();
    const db = createDb(env.DATABASE_URL);
    await db.insert(events).values(data);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "저장에 실패했습니다." };
  }
  revalidatePath("/admin/events");
  redirect("/admin/events");
}

export async function updateEventAction(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  await verifyAdminSession();
  const id = formData.get("id") as string;
  if (!id) return { error: "ID가 없습니다." };
  try {
    const data = extractEventData(formData);
    const env = getEnv();
    const db = createDb(env.DATABASE_URL);
    await db.update(events).set({ ...data, updatedAt: new Date() }).where(eq(events.id, id));
  } catch (e) {
    return { error: e instanceof Error ? e.message : "저장에 실패했습니다." };
  }
  revalidatePath("/admin/events");
  redirect("/admin/events");
}

export async function deleteEventAction(formData: FormData): Promise<void> {
  await verifyAdminSession();
  const id = formData.get("id") as string;
  if (!id) return;
  const env = getEnv();
  const db = createDb(env.DATABASE_URL);
  await db.delete(events).where(eq(events.id, id));
  revalidatePath("/admin/events");
  redirect("/admin/events");
}
