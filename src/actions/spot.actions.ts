"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { createDb } from "@/lib/db/client";
import { getEnv } from "@/lib/env";
import { locationAliases, tourismSpots } from "@/lib/db/schema";
import { verifyAdminSession } from "@/lib/auth/admin-auth";
import { extractLocalized } from "@/lib/form-utils";
import { AliasGenerator } from "@/services/ai/alias-generator";
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
    const rows = await db.insert(tourismSpots).values(data).returning({ id: tourismSpots.id });
    const inserted = rows[0];

    if (inserted) try {
      const generator = new AliasGenerator(db, createLLMRouter(env));
      await generator.generateAndSave({
        id: inserted.id,
        nameKo: data.nameKo,
        names: data.names as Record<string, string>,
        addressKo: data.addressKo,
      });
    } catch {
      // Non-critical: alias generation failure should not block spot creation
    }
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

    const [existing] = await db
      .select({ nameKo: tourismSpots.nameKo, names: tourismSpots.names })
      .from(tourismSpots)
      .where(eq(tourismSpots.id, id))
      .limit(1);

    await db.update(tourismSpots).set({ ...data, updatedAt: new Date() }).where(eq(tourismSpots.id, id));

    const nameChanged = !existing ||
      existing.nameKo !== data.nameKo ||
      JSON.stringify(existing.names) !== JSON.stringify(data.names);

    if (nameChanged) {
      try {
        await db
          .delete(locationAliases)
          .where(
            and(
              eq(locationAliases.spotId, id),
              eq(locationAliases.source, "ai_generated"),
            ),
          );
        const generator = new AliasGenerator(db, createLLMRouter(env));
        await generator.generateAndSave({
          id,
          nameKo: data.nameKo,
          names: data.names as Record<string, string>,
          addressKo: data.addressKo,
        });
      } catch {
        // Non-critical: alias regeneration failure should not block spot update
      }
    }
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
