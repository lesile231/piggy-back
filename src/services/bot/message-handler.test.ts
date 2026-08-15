import { describe, it, expect, vi, beforeEach } from "vitest";
import { MessageHandler } from "./message-handler";
import type { BotAdapter } from "./adapter";
import type { SessionRepository, SessionRecord } from "./session.repository";
import type { MenuService } from "./menu.service";
import type { FlowEngine } from "./flow/flow-engine";
import type { ChatService } from "@/services/ai/chat.service";
import type { LanguageService } from "@/services/ai/language.service";
import type { IncomingMessage, OutgoingMessage } from "./types";
import type { ActionRegistry } from "./action-registry";

function createMockAdapter(): BotAdapter {
  return {
    platform: "whatsapp",
    verifyWebhook: vi.fn(),
    parseIncoming: vi.fn(),
    sendMessage: vi.fn().mockResolvedValue(undefined),
    sendTypingIndicator: vi.fn().mockResolvedValue(undefined),
    getConstraints: vi.fn().mockReturnValue({
      maxTextLength: 4096, maxButtons: 3,
      supportsCarousel: false, supportsQuickReply: true,
    }),
  } as unknown as BotAdapter;
}

function createMockSessionRepo(session: SessionRecord | null = null): SessionRepository {
  return {
    findOrCreateUser: vi.fn().mockResolvedValue({ id: "user-1", language: "en" }),
    getActiveSession: vi.fn().mockResolvedValue(session),
    createSession: vi.fn().mockResolvedValue({
      id: "session-1", userId: "user-1", mode: "menu",
      activeFlowId: null, currentStepId: null, flowContext: {}, isActive: true,
    }),
    updateSessionMode: vi.fn().mockResolvedValue(undefined),
    resetSessionToMenu: vi.fn().mockResolvedValue(undefined),
    updateUserLanguage: vi.fn().mockResolvedValue(undefined),
  } as unknown as SessionRepository;
}

function createMockMenuService(): MenuService {
  return {
    getMainMenu: vi.fn().mockResolvedValue({
      type: "buttons", text: "Welcome!",
      buttons: [{ id: "flow:f1", label: "Transit" }, { id: "__free_chat__", label: "Free Chat" }],
    }),
  } as unknown as MenuService;
}

function createMockFlowEngine(): FlowEngine {
  return {
    startFlow: vi.fn().mockResolvedValue({
      messages: [{ type: "text", text: "Where are you?" }],
      nextStepId: "step-1", flowContext: {}, completed: false,
    }),
    handleInput: vi.fn().mockResolvedValue({
      messages: [{ type: "text", text: "Where to?" }],
      nextStepId: "step-2", flowContext: { step_1: "Busan Station" }, completed: false,
    }),
  } as unknown as FlowEngine;
}

function createMockChatService(): ChatService {
  return {
    generateResponse: vi.fn().mockResolvedValue({
      messages: [{ type: "text", text: "Haeundae is a famous beach!" }],
      tokensUsed: 100,
    }),
    setIntentRouter: vi.fn(),
  } as unknown as ChatService;
}

function createMockLanguageService(): LanguageService {
  return {
    detect: vi.fn().mockReturnValue({ language: "en", confidence: 0.9 }),
    resolveLanguage: vi.fn().mockReturnValue("en"),
  } as unknown as LanguageService;
}

function createMockActionRegistry(): ActionRegistry {
  return {
    has: vi.fn().mockReturnValue(true),
    execute: vi.fn().mockResolvedValue([
      { type: "text", text: "Route found: Bus 1003 → Metro Line 1" },
    ]),
    register: vi.fn(),
  } as unknown as ActionRegistry;
}

function createIncomingText(text: string): IncomingMessage {
  return {
    platform: "whatsapp", platformMessageId: "msg-1",
    chatId: "chat-1", userId: "wa-user-1",
    type: "text", text,
    timestamp: new Date(), raw: {},
  };
}

describe("MessageHandler", () => {
  let handler: MessageHandler;
  let adapter: BotAdapter;
  let sessionRepo: SessionRepository;
  let menuService: MenuService;
  let flowEngine: FlowEngine;
  let chatService: ChatService;
  let langService: LanguageService;

  beforeEach(() => {
    adapter = createMockAdapter();
    sessionRepo = createMockSessionRepo();
    menuService = createMockMenuService();
    flowEngine = createMockFlowEngine();
    chatService = createMockChatService();
    langService = createMockLanguageService();
    handler = new MessageHandler(sessionRepo, menuService, flowEngine, chatService, langService);
  });

  it("sends main menu for new user (no active session)", async () => {
    await handler.handle(adapter, createIncomingText("hello"));

    expect(sessionRepo.findOrCreateUser).toHaveBeenCalledWith("whatsapp", "wa-user-1");
    expect(sessionRepo.createSession).toHaveBeenCalled();
    expect(adapter.sendMessage).toHaveBeenCalled();
    const sentMsg = (adapter.sendMessage as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as OutgoingMessage;
    expect(sentMsg.type).toBe("buttons");
  });

  it("starts flow when user selects flow button", async () => {
    const session: SessionRecord = {
      id: "s1", userId: "user-1", mode: "menu",
      activeFlowId: null, currentStepId: null, flowContext: {}, isActive: true,
    };
    sessionRepo = createMockSessionRepo(session);
    handler = new MessageHandler(sessionRepo, menuService, flowEngine, chatService, langService);

    const incoming = createIncomingText("flow:f1");
    incoming.type = "button_reply";
    incoming.buttonPayload = "flow:f1";

    await handler.handle(adapter, incoming);

    expect(flowEngine.startFlow).toHaveBeenCalledWith("f1", "en");
    expect(sessionRepo.updateSessionMode).toHaveBeenCalled();
  });

  it("switches to free_chat mode when user selects free chat", async () => {
    const session: SessionRecord = {
      id: "s1", userId: "user-1", mode: "menu",
      activeFlowId: null, currentStepId: null, flowContext: {}, isActive: true,
    };
    sessionRepo = createMockSessionRepo(session);
    handler = new MessageHandler(sessionRepo, menuService, flowEngine, chatService, langService);

    const incoming = createIncomingText("__free_chat__");
    incoming.type = "button_reply";
    incoming.buttonPayload = "__free_chat__";

    await handler.handle(adapter, incoming);

    expect(sessionRepo.updateSessionMode).toHaveBeenCalledWith("s1", "free_chat", undefined);
  });

  it("delegates to chat service in free_chat mode", async () => {
    const session: SessionRecord = {
      id: "s1", userId: "user-1", mode: "free_chat",
      activeFlowId: null, currentStepId: null, flowContext: {}, isActive: true,
    };
    sessionRepo = createMockSessionRepo(session);
    handler = new MessageHandler(sessionRepo, menuService, flowEngine, chatService, langService);

    await handler.handle(adapter, createIncomingText("Best beach in Busan?"));

    expect(chatService.generateResponse).toHaveBeenCalled();
    expect(adapter.sendMessage).toHaveBeenCalled();
  });

  it("delegates to flow engine in flow mode", async () => {
    const session: SessionRecord = {
      id: "s1", userId: "user-1", mode: "flow",
      activeFlowId: "f1", currentStepId: "step-1", flowContext: {}, isActive: true,
    };
    sessionRepo = createMockSessionRepo(session);
    handler = new MessageHandler(sessionRepo, menuService, flowEngine, chatService, langService);

    await handler.handle(adapter, createIncomingText("Busan Station"));

    expect(flowEngine.handleInput).toHaveBeenCalledWith("step-1", "Busan Station", "en", {});
  });

  it("returns to menu when user sends 'menu' command in any mode", async () => {
    const session: SessionRecord = {
      id: "s1", userId: "user-1", mode: "free_chat",
      activeFlowId: null, currentStepId: null, flowContext: {}, isActive: true,
    };
    sessionRepo = createMockSessionRepo(session);
    handler = new MessageHandler(sessionRepo, menuService, flowEngine, chatService, langService);

    await handler.handle(adapter, createIncomingText("menu"));

    expect(sessionRepo.resetSessionToMenu).toHaveBeenCalledWith("s1");
    expect(menuService.getMainMenu).toHaveBeenCalled();
  });

  it("dispatches apiAction through ActionRegistry instead of placeholder", async () => {
    const session: SessionRecord = {
      id: "s1", userId: "user-1", mode: "flow",
      activeFlowId: "f1", currentStepId: "step-1", flowContext: { step_1: "Haeundae" }, isActive: true,
    };
    sessionRepo = createMockSessionRepo(session);

    const apiFlowEngine = {
      startFlow: vi.fn(),
      handleInput: vi.fn().mockResolvedValue({
        messages: [],
        nextStepId: "step-3",
        flowContext: { step_1: "Haeundae", step_2: "Gamcheon" },
        completed: false,
        apiAction: "search_transit_route",
      }),
    } as unknown as FlowEngine;

    const actionRegistry = createMockActionRegistry();
    handler = new MessageHandler(sessionRepo, menuService, apiFlowEngine, chatService, langService, actionRegistry);

    await handler.handle(adapter, createIncomingText("Gamcheon"));

    expect(actionRegistry.execute).toHaveBeenCalledWith(
      "search_transit_route",
      expect.objectContaining({ step_1: "Haeundae", step_2: "Gamcheon" }),
      "en",
    );
    const sentMsg = (adapter.sendMessage as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as OutgoingMessage;
    expect(sentMsg.text).toContain("Route found");
  });
});
