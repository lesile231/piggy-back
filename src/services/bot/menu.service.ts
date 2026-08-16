import type { FlowRepository } from "./flow/flow.repository";
import type { OutgoingMessage } from "./types";
import { localize } from "@/types/common";

const WELCOME_TEXT: Record<string, string> = {
  en: "Welcome to Via Busan! How can I help you today?",
  ja: "Via Busanへようこそ！何かお手伝いできますか？",
  zh: "欢迎使用Via Busan！我能为您做什么？",
  ko: "Via Busan에 오신 것을 환영합니다! 무엇을 도와드릴까요?",
};

const FREE_CHAT_LABEL: Record<string, string> = {
  en: "💬 Free Chat",
  ja: "💬 自由チャット",
  zh: "💬 自由聊天",
  ko: "💬 자유 대화",
};

export class MenuService {
  constructor(private flowRepo: FlowRepository) {}

  async getMainMenu(language: string): Promise<OutgoingMessage> {
    const activeFlows = await this.flowRepo.getActiveFlows();

    const buttons = activeFlows.map((flow) => ({
      id: `flow:${flow.id}`,
      label: `${flow.icon ?? ""} ${localize(flow.displayNames as Record<string, string>, language)}`.trim(),
    }));

    buttons.push({
      id: "__free_chat__",
      label: localize(FREE_CHAT_LABEL, language),
    });

    return {
      type: "buttons",
      text: localize(WELCOME_TEXT, language),
      buttons,
    };
  }
}
