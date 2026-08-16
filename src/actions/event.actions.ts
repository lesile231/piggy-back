"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { createDb } from "@/lib/db/client";
import { getEnv } from "@/lib/env";
import { events } from "@/lib/db/schema";
import { verifyAdminSession } from "@/lib/auth/admin-auth";
import { extractLocalized, ALL_LOCALES } from "@/lib/form-utils";
import { Translator } from "@/services/ai/translator";
import { LLMRouter } from "@/services/ai/llm-router";
import { GroqProvider } from "@/services/ai/providers/groq.provider";
import { TogetherProvider } from "@/services/ai/providers/together.provider";

function createLLMRouter(env: ReturnType<typeof getEnv>): LLMRouter {
  const primary = new GroqProvider(env.GROQ_API_KEY);
  const fallback = env.TOGETHER_API_KEY
    ? new TogetherProvider(env.TOGETHER_API_KEY)
    : primary;
  return new LLMRouter(primary, fallback, {
    lightModel: env.LLM_LIGHT_MODEL,
    chatModel: env.LLM_CHAT_MODEL,
  });
}

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
    const rows = await db.insert(events).values(data).returning({ id: events.id });
    const inserted = rows[0];

    if (inserted) {
      try {
        const translator = new Translator(createLLMRouter(env));
        const translated = await translator.translateFields(
          {
            names: data.names as Record<string, string>,
            description: data.description as Record<string, string>,
            venueName: data.venueName as Record<string, string>,
            priceInfo: data.priceInfo as Record<string, string>,
          },
          [...ALL_LOCALES],
        );
        await db.update(events).set({
          names: translated.names,
          description: translated.description,
          venueName: translated.venueName,
          priceInfo: translated.priceInfo,
        }).where(eq(events.id, inserted.id));
      } catch {
        // Non-critical: translation failure should not block event creation
      }
    }
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

    // Auto-translate missing languages
    try {
      const translator = new Translator(createLLMRouter(env));
      const translated = await translator.translateFields(
        {
          names: data.names as Record<string, string>,
          description: data.description as Record<string, string>,
          venueName: data.venueName as Record<string, string>,
          priceInfo: data.priceInfo as Record<string, string>,
        },
        [...ALL_LOCALES],
      );
      await db.update(events).set({
        names: translated.names,
        description: translated.description,
        venueName: translated.venueName,
        priceInfo: translated.priceInfo,
      }).where(eq(events.id, id));
    } catch {
      // Non-critical: translation failure should not block event update
    }
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
