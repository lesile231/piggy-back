import { eq, and } from "drizzle-orm";
import type { Database } from "@/lib/db/client";
import { users, chatSessions } from "@/lib/db/schema";
import type { Platform } from "@/types/common";
import type { SessionMode } from "./types";

export interface UserRecord {
  id: string;
  language: string | null;
}

export interface SessionRecord {
  id: string;
  userId: string;
  mode: string;
  activeFlowId: string | null;
  currentStepId: string | null;
  flowContext: unknown;
  isActive: boolean;
}

export class SessionRepository {
  constructor(private db: Database) {}

  async findOrCreateUser(
    platform: Platform,
    platformUid: string,
  ): Promise<UserRecord> {
    const existing = await this.db
      .select({ id: users.id, language: users.language })
      .from(users)
      .where(and(eq(users.platform, platform), eq(users.platformUid, platformUid)))
      .limit(1);

    if (existing.length > 0 && existing[0]) {
      // Update last active
      await this.db
        .update(users)
        .set({ lastActiveAt: new Date() })
        .where(eq(users.id, existing[0].id));
      return existing[0];
    }

    const [newUser] = await this.db
      .insert(users)
      .values({ platform, platformUid })
      .returning({ id: users.id, language: users.language });

    if (!newUser) throw new Error("Failed to create user");
    return newUser;
  }

  async getActiveSession(userId: string): Promise<SessionRecord | null> {
    const results = await this.db
      .select({
        id: chatSessions.id,
        userId: chatSessions.userId,
        mode: chatSessions.mode,
        activeFlowId: chatSessions.activeFlowId,
        currentStepId: chatSessions.currentStepId,
        flowContext: chatSessions.flowContext,
        isActive: chatSessions.isActive,
      })
      .from(chatSessions)
      .where(and(eq(chatSessions.userId, userId), eq(chatSessions.isActive, true)))
      .limit(1);

    return (results[0] as SessionRecord | undefined) ?? null;
  }

  async createSession(userId: string): Promise<SessionRecord> {
    const [session] = await this.db
      .insert(chatSessions)
      .values({ userId, mode: "menu" })
      .returning({
        id: chatSessions.id,
        userId: chatSessions.userId,
        mode: chatSessions.mode,
        activeFlowId: chatSessions.activeFlowId,
        currentStepId: chatSessions.currentStepId,
        flowContext: chatSessions.flowContext,
        isActive: chatSessions.isActive,
      });

    if (!session) throw new Error("Failed to create session");
    return session as SessionRecord;
  }

  async updateSessionMode(
    sessionId: string,
    mode: SessionMode,
    flowData?: { activeFlowId?: string; currentStepId?: string; flowContext?: unknown },
  ): Promise<void> {
    await this.db
      .update(chatSessions)
      .set({
        mode,
        activeFlowId: flowData?.activeFlowId ?? null,
        currentStepId: flowData?.currentStepId ?? null,
        flowContext: flowData?.flowContext ?? {},
      })
      .where(eq(chatSessions.id, sessionId));
  }

  async resetSessionToMenu(sessionId: string): Promise<void> {
    await this.updateSessionMode(sessionId, "menu");
  }

  async updateUserLanguage(userId: string, language: string): Promise<void> {
    await this.db
      .update(users)
      .set({ language })
      .where(eq(users.id, userId));
  }
}
