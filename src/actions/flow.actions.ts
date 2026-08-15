"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { createDb } from "@/lib/db/client";
import { getEnv } from "@/lib/env";
import { flows, flowSteps, flowOptions } from "@/lib/db/schema";
import { verifyAdminSession } from "@/lib/auth/admin-auth";
import { extractLocalized } from "@/lib/form-utils";

export async function updateFlowAction(formData: FormData): Promise<void> {
  await verifyAdminSession();

  try {
    const id = formData.get("id") as string;
    const name = formData.get("name") as string;
    const icon = formData.get("icon") as string;
    const isActive = formData.get("isActive") === "true";
    const displayNames = extractLocalized(formData, "displayNames");

    const env = getEnv();
    const db = createDb(env.DATABASE_URL);
    await db.update(flows).set({ name, icon, displayNames, isActive, updatedAt: new Date() }).where(eq(flows.id, id));
    revalidatePath(`/admin/flows/${id}/edit`);
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : "플로우 업데이트에 실패했습니다.");
  }
}

export async function createStepAction(formData: FormData): Promise<void> {
  await verifyAdminSession();

  try {
    const flowId = formData.get("flowId") as string;
    const stepOrder = parseInt(formData.get("stepOrder") as string);
    const type = formData.get("type") as string;
    const messages = extractLocalized(formData, "messages");
    const apiAction = (formData.get("apiAction") as string) || null;

    const env = getEnv();
    const db = createDb(env.DATABASE_URL);
    await db.insert(flowSteps).values({ flowId, stepOrder, type, messages, apiAction });
    revalidatePath(`/admin/flows/${flowId}/edit`);
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : "스텝 생성에 실패했습니다.");
  }
}

export async function updateStepAction(formData: FormData): Promise<void> {
  await verifyAdminSession();

  try {
    const id = formData.get("id") as string;
    const flowId = formData.get("flowId") as string;
    const type = formData.get("type") as string;
    const messages = extractLocalized(formData, "messages");
    const apiAction = (formData.get("apiAction") as string) || null;

    const env = getEnv();
    const db = createDb(env.DATABASE_URL);
    await db.update(flowSteps).set({ type, messages, apiAction }).where(eq(flowSteps.id, id));
    revalidatePath(`/admin/flows/${flowId}/edit`);
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : "스텝 업데이트에 실패했습니다.");
  }
}

export async function deleteStepAction(formData: FormData): Promise<void> {
  await verifyAdminSession();

  try {
    const id = formData.get("id") as string;
    const flowId = formData.get("flowId") as string;

    const env = getEnv();
    const db = createDb(env.DATABASE_URL);
    await db.delete(flowSteps).where(eq(flowSteps.id, id));
    revalidatePath(`/admin/flows/${flowId}/edit`);
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : "스텝 삭제에 실패했습니다.");
  }
}

export async function createOptionAction(formData: FormData): Promise<void> {
  await verifyAdminSession();

  try {
    const stepId = formData.get("stepId") as string;
    const flowId = formData.get("flowId") as string;
    const value = formData.get("value") as string;
    const sortOrder = parseInt(formData.get("sortOrder") as string) || 0;
    const labels = extractLocalized(formData, "labels");

    const env = getEnv();
    const db = createDb(env.DATABASE_URL);
    await db.insert(flowOptions).values({ stepId, labels, value, sortOrder });
    revalidatePath(`/admin/flows/${flowId}/edit`);
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : "옵션 생성에 실패했습니다.");
  }
}

export async function deleteOptionAction(formData: FormData): Promise<void> {
  await verifyAdminSession();

  try {
    const id = formData.get("id") as string;
    const flowId = formData.get("flowId") as string;

    const env = getEnv();
    const db = createDb(env.DATABASE_URL);
    await db.delete(flowOptions).where(eq(flowOptions.id, id));
    revalidatePath(`/admin/flows/${flowId}/edit`);
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : "옵션 삭제에 실패했습니다.");
  }
}
