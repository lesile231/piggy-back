import type { Platform } from "@/types/common";
import type { BotAdapter } from "./adapter";

export class AdapterRegistry {
  private adapters = new Map<Platform, BotAdapter>();

  register(adapter: BotAdapter): void {
    this.adapters.set(adapter.platform, adapter);
  }

  get(platform: Platform): BotAdapter | undefined {
    return this.adapters.get(platform);
  }

  getAll(): BotAdapter[] {
    return Array.from(this.adapters.values());
  }
}
