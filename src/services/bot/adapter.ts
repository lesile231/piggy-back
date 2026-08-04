import type { Platform } from "@/types/common";
import type { IncomingMessage, OutgoingMessage, PlatformConstraints } from "./types";

export interface BotAdapter {
  readonly platform: Platform;
  verifyWebhook(req: Request): Promise<boolean>;
  handleChallenge?(req: Request): Response | null;
  parseIncoming(body: unknown): IncomingMessage[];
  sendMessage(chatId: string, message: OutgoingMessage): Promise<void>;
  sendTypingIndicator(chatId: string): Promise<void>;
  getConstraints(): PlatformConstraints;
}
