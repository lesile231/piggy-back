"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { createDb } from "@/lib/db/client";
import { getEnv } from "@/lib/env";
import { adminUsers } from "@/lib/db/schema";
import {
  createSession,
  destroySession,
  verifyPassword,
} from "@/lib/auth/admin-auth";

export async function loginAction(
  _prevState: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const email = formData.get("email") as string | null;
  const password = formData.get("password") as string | null;

  if (!email || !password) {
    return { error: "이메일과 비밀번호를 입력해주세요." };
  }

  const env = getEnv();
  const db = createDb(env.DATABASE_URL);

  const rows = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, email))
    .limit(1);

  const admin = rows[0];
  if (!admin || !admin.isActive) {
    return { error: "이메일 또는 비밀번호가 올바르지 않습니다." };
  }

  const valid = await verifyPassword(password, admin.passwordHash);
  if (!valid) {
    return { error: "이메일 또는 비밀번호가 올바르지 않습니다." };
  }

  await createSession({
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
  });

  redirect("/admin/dashboard");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/admin/login");
}
