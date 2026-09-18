"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { createDb } from "@/lib/db/client";
import { getEnv } from "@/lib/env";
import { deals } from "@/lib/db/schema";
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

function extractDealData(formData: FormData) {
  const nameKo = formData.get("nameKo") as string;
  if (!nameKo) throw new Error("한국어 이름은 필수입니다.");

  const providerName = formData.get("providerName") as string;
  if (!providerName) throw new Error("제공처는 필수입니다.");

  const validFrom = formData.get("validFrom") as string;
  const validUntil = formData.get("validUntil") as string;

  return {
    nameKo,
    names: extractLocalized(formData, "names"),
    description: extractLocalized(formData, "description"),
    discount: extractLocalized(formData, "discount"),
    providerName,
    locationName: extractLocalized(formData, "locationName"),
    addressKo: (formData.get("addressKo") as string) || null,
    imageUrl: (formData.get("imageUrl") as string) || null,
    linkUrl: (formData.get("linkUrl") as string) || null,
    category: (formData.get("category") as string) || "general",
    validFrom: validFrom ? new Date(validFrom) : null,
    validUntil: validUntil ? new Date(validUntil) : null,
    sortOrder: Number(formData.get("sortOrder")) || 0,
    isActive: formData.get("isActive") === "true",
    source: "curated" as const,
  };
}

export async function createDealAction(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  await verifyAdminSession();
  try {
    const data = extractDealData(formData);
    const env = getEnv();
    const db = createDb(env.DATABASE_URL);
    const rows = await db.insert(deals).values(data).returning({ id: deals.id });
    const inserted = rows[0];

    if (inserted) {
      try {
        const translator = new Translator(createLLMRouter(env));
        const translated = await translator.translateFields(
          {
            names: data.names as Record<string, string>,
            description: data.description as Record<string, string>,
            discount: data.discount as Record<string, string>,
            locationName: data.locationName as Record<string, string>,
          },
          [...ALL_LOCALES],
        );
        await db.update(deals).set({
          names: translated.names,
          description: translated.description,
          discount: translated.discount,
          locationName: translated.locationName,
        }).where(eq(deals.id, inserted.id));
      } catch {
        // Non-critical: translation failure should not block deal creation
      }
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "저장에 실패했습니다." };
  }
  revalidatePath("/admin/deals");
  redirect("/admin/deals");
}

export async function updateDealAction(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  await verifyAdminSession();
  const id = formData.get("id") as string;
  if (!id) return { error: "ID가 없습니다." };
  try {
    const data = extractDealData(formData);
    const env = getEnv();
    const db = createDb(env.DATABASE_URL);
    await db.update(deals).set({ ...data, updatedAt: new Date() }).where(eq(deals.id, id));

    try {
      const translator = new Translator(createLLMRouter(env));
      const translated = await translator.translateFields(
        {
          names: data.names as Record<string, string>,
          description: data.description as Record<string, string>,
          discount: data.discount as Record<string, string>,
          locationName: data.locationName as Record<string, string>,
        },
        [...ALL_LOCALES],
      );
      await db.update(deals).set({
        names: translated.names,
        description: translated.description,
        discount: translated.discount,
        locationName: translated.locationName,
      }).where(eq(deals.id, id));
    } catch {
      // Non-critical: translation failure should not block deal update
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "저장에 실패했습니다." };
  }
  revalidatePath("/admin/deals");
  redirect("/admin/deals");
}

export async function deleteDealAction(formData: FormData): Promise<void> {
  await verifyAdminSession();
  const id = formData.get("id") as string;
  if (!id) return;
  const env = getEnv();
  const db = createDb(env.DATABASE_URL);
  await db.delete(deals).where(eq(deals.id, id));
  revalidatePath("/admin/deals");
  redirect("/admin/deals");
}
