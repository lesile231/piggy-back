import type { Platform } from "@/types/common";

export interface IncomingMessage {
  platform: Platform;
  platformMessageId: string;
  chatId: string;
  userId: string;
  type: "text" | "location" | "button_reply" | "image" | "sticker" | "unsupported";
  text?: string;
  location?: { latitude: number; longitude: number };
  buttonPayload?: string;
  imageUrl?: string;
  timestamp: Date;
  raw: unknown;
}

export interface MessageButton {
  id: string;
  label: string;
}

export interface QuickReply {
  label: string;
  payload: string;
}

export interface CarouselItem {
  title: string;
  description?: string;
  imageUrl?: string;
  buttons?: MessageButton[];
}

export interface OutgoingMessage {
  type: "text" | "buttons" | "carousel" | "location" | "image";
  text?: string;
  buttons?: MessageButton[];
  carousel?: CarouselItem[];
  location?: { latitude: number; longitude: number; label: string };
  imageUrl?: string;
  quickReplies?: QuickReply[];
}

export interface PlatformConstraints {
  maxTextLength: number;
  maxButtons: number;
  supportsCarousel: boolean;
  supportsQuickReply: boolean;
}

export type SessionMode = "menu" | "flow" | "free_chat";
