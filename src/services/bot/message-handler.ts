import type { BotAdapter } from "./adapter";
import type { IncomingMessage, OutgoingMessage } from "./types";
import type { SessionRepository } from "./session.repository";
import type { MenuService } from "./menu.service";
import type { FlowEngine } from "./flow/flow-engine";
import type { ChatService } from "@/services/ai/chat.service";
import type { LanguageService } from "@/services/ai/language.service";

const MENU_COMMANDS = new Set(["menu", "/menu", "/start", "메뉴"]);

export class MessageHandler {
  constructor(
    private sessionRepo: SessionRepository,
    private menuService: MenuService,
    private flowEngine: FlowEngine,
    private chatService: ChatService,
    private languageService: LanguageService,
  ) {}

  async handle(adapter: BotAdapter, incoming: IncomingMessage): Promise<void> {
    // 1. Find or create user
    const user = await this.sessionRepo.findOrCreateUser(
      incoming.platform,
      incoming.userId,
    );

    // 2. Detect language
    const textForDetection = incoming.text ?? "";
    const language = this.languageService.resolveLanguage(
      textForDetection,
      user.language ?? undefined,
    );

    // Update user language if detected with high confidence
    const detection = this.languageService.detect(textForDetection);
    if (detection.confidence >= 0.5 && detection.language !== user.language) {
      await this.sessionRepo.updateUserLanguage(user.id, detection.language);
    }

    // 3. Get or create session
    let session = await this.sessionRepo.getActiveSession(user.id);
    if (!session) {
      session = await this.sessionRepo.createSession(user.id);
    }

    // 4. Check for menu command (global escape)
    const inputText = incoming.text?.trim().toLowerCase() ?? "";
    if (MENU_COMMANDS.has(inputText)) {
      await this.sessionRepo.resetSessionToMenu(session.id);
      const menu = await this.menuService.getMainMenu(language);
      await this.sendMessages(adapter, incoming.chatId, [menu]);
      return;
    }

    // 5. Route by session mode
    switch (session.mode) {
      case "menu":
        await this.handleMenuMode(adapter, incoming, session.id, language);
        break;
      case "flow":
        await this.handleFlowMode(adapter, incoming, session, language);
        break;
      case "free_chat":
        await this.handleFreeChatMode(adapter, incoming, language);
        break;
      default:
        // Unknown mode — reset to menu
        await this.sessionRepo.resetSessionToMenu(session.id);
        const menu = await this.menuService.getMainMenu(language);
        await this.sendMessages(adapter, incoming.chatId, [menu]);
    }
  }

  private async handleMenuMode(
    adapter: BotAdapter,
    incoming: IncomingMessage,
    sessionId: string,
    language: string,
  ): Promise<void> {
    const payload = incoming.buttonPayload ?? incoming.text ?? "";

    // Check if user selected a flow
    if (payload.startsWith("flow:")) {
      const flowId = payload.replace("flow:", "");
      const result = await this.flowEngine.startFlow(flowId, language);

      await this.sessionRepo.updateSessionMode(sessionId, "flow", {
        activeFlowId: flowId,
        currentStepId: result.nextStepId ?? undefined,
        flowContext: result.flowContext,
      });

      await this.sendMessages(adapter, incoming.chatId, result.messages);
      return;
    }

    // Check if user selected free chat
    if (payload === "__free_chat__") {
      await this.sessionRepo.updateSessionMode(sessionId, "free_chat", undefined);
      const response = await this.chatService.generateResponse(
        incoming.text ?? "Hello",
        language,
      );
      await this.sendMessages(adapter, incoming.chatId, [
        { type: "text", text: response.response },
      ]);
      return;
    }

    // Default: show main menu
    const menu = await this.menuService.getMainMenu(language);
    await this.sendMessages(adapter, incoming.chatId, [menu]);
  }

  private async handleFlowMode(
    adapter: BotAdapter,
    incoming: IncomingMessage,
    session: { id: string; currentStepId: string | null; flowContext: unknown },
    language: string,
  ): Promise<void> {
    if (!session.currentStepId) {
      // No step — reset to menu
      await this.sessionRepo.resetSessionToMenu(session.id);
      const menu = await this.menuService.getMainMenu(language);
      await this.sendMessages(adapter, incoming.chatId, [menu]);
      return;
    }

    const input = incoming.buttonPayload ?? incoming.text ?? "";
    const result = await this.flowEngine.handleInput(
      session.currentStepId,
      input,
      language,
      (session.flowContext ?? {}) as Record<string, unknown>,
    );

    if (result.completed) {
      await this.sessionRepo.resetSessionToMenu(session.id);
      const completionMessages = result.messages.length > 0
        ? result.messages
        : [{ type: "text" as const, text: "Done!" }];
      const menu = await this.menuService.getMainMenu(language);
      await this.sendMessages(adapter, incoming.chatId, [...completionMessages, menu]);
      return;
    }

    // TODO[MVP]: Handle apiAction by dispatching to service action registry (SP3)
    if (result.apiAction) {
      await this.sessionRepo.updateSessionMode(session.id, "flow", {
        currentStepId: result.nextStepId ?? undefined,
        flowContext: result.flowContext,
      });
      // For now, send a placeholder message
      await this.sendMessages(adapter, incoming.chatId, [{
        type: "text",
        text: `[API Action: ${result.apiAction}] — This feature will be available in a future update.`,
      }]);
      return;
    }

    // Update session state and send messages
    await this.sessionRepo.updateSessionMode(session.id, "flow", {
      currentStepId: result.nextStepId ?? undefined,
      flowContext: result.flowContext,
    });
    await this.sendMessages(adapter, incoming.chatId, result.messages);
  }

  private async handleFreeChatMode(
    adapter: BotAdapter,
    incoming: IncomingMessage,
    language: string,
  ): Promise<void> {
    await adapter.sendTypingIndicator(incoming.chatId);

    const response = await this.chatService.generateResponse(
      incoming.text ?? "",
      language,
    );

    await this.sendMessages(adapter, incoming.chatId, [
      { type: "text", text: response.response },
    ]);
  }

  private async sendMessages(
    adapter: BotAdapter,
    chatId: string,
    messages: OutgoingMessage[],
  ): Promise<void> {
    for (const msg of messages) {
      await adapter.sendMessage(chatId, msg);
    }
  }
}
