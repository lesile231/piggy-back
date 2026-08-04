import type { OutgoingMessage } from "./types";

export type ActionHandler = (
  params: Record<string, unknown>,
  language: string,
) => Promise<OutgoingMessage[]>;

export class ActionRegistry {
  private handlers = new Map<string, ActionHandler>();

  register(actionName: string, handler: ActionHandler): void {
    this.handlers.set(actionName, handler);
  }

  has(actionName: string): boolean {
    return this.handlers.has(actionName);
  }

  async execute(
    actionName: string,
    params: Record<string, unknown>,
    language: string,
  ): Promise<OutgoingMessage[]> {
    const handler = this.handlers.get(actionName);
    if (!handler) {
      throw new Error(`Unknown action: ${actionName}`);
    }
    return handler(params, language);
  }
}
