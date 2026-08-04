import type { FlowRepository, FlowStepRecord, FlowOptionRecord } from "./flow.repository";
import type { OutgoingMessage } from "../types";
import { localize } from "@/types/common";

export interface FlowEngineResult {
  messages: OutgoingMessage[];
  nextStepId: string | null;
  flowContext: Record<string, unknown>;
  completed: boolean;
  apiAction?: string;
}

export class FlowEngine {
  constructor(private repo: FlowRepository) {}

  async startFlow(flowId: string, language: string): Promise<FlowEngineResult> {
    const step = await this.repo.getFirstStep(flowId);
    if (!step) {
      return {
        messages: [{ type: "text", text: localize({ en: "This flow is not available yet.", ja: "このフローはまだ利用できません。", zh: "此流程尚不可用。" }, language) }],
        nextStepId: null,
        flowContext: {},
        completed: true,
      };
    }
    return this.buildStepResponse(step, language, {});
  }

  async handleInput(
    currentStepId: string,
    input: string,
    language: string,
    flowContext: Record<string, unknown>,
  ): Promise<FlowEngineResult> {
    const currentStep = await this.repo.getStep(currentStepId);
    if (!currentStep) {
      return {
        messages: [{ type: "text", text: localize({ en: "Something went wrong. Let's start over.", ja: "エラーが発生しました。最初からやり直してください。", zh: "出现错误,请重新开始。" }, language) }],
        nextStepId: null,
        flowContext: {},
        completed: true,
      };
    }

    // Store input in context
    const updatedContext = {
      ...flowContext,
      [`step_${currentStep.stepOrder}`]: input,
    };

    // Check if input matches an option with nextStepId
    const options = await this.repo.getStepOptions(currentStepId);
    const matched = options.find(
      (o) => o.value === input || o.value === input.toLowerCase(),
    );

    let nextStep: FlowStepRecord | null = null;

    if (matched?.nextStepId) {
      nextStep = await this.repo.getStep(matched.nextStepId);
    } else {
      // No option match — advance to next sequential step
      nextStep = await this.repo.getNextStep(currentStep.flowId, currentStep.stepOrder);
    }

    if (!nextStep) {
      return {
        messages: [{ type: "text", text: localize({ en: "Flow completed. Returning to menu.", ja: "フロー完了。メニューに戻ります。", zh: "流程完成。返回菜单。" }, language) }],
        nextStepId: null,
        flowContext: updatedContext,
        completed: true,
      };
    }

    return this.buildStepResponse(nextStep, language, updatedContext);
  }

  private async buildStepResponse(
    step: FlowStepRecord,
    language: string,
    flowContext: Record<string, unknown>,
  ): Promise<FlowEngineResult> {
    // If this step is an api_call, signal it
    if (step.type === "api_call") {
      return {
        messages: [],
        nextStepId: step.id,
        flowContext,
        completed: false,
        apiAction: step.apiAction ?? undefined,
      };
    }

    const options = await this.repo.getStepOptions(step.id);
    const text = localize(step.messages as Record<string, string>, language);

    const message: OutgoingMessage = { type: "text", text };

    if (options.length > 0) {
      message.type = "buttons";
      message.buttons = options.map((o) => ({
        id: o.value,
        label: localize(o.labels as Record<string, string>, language),
      }));
    }

    return {
      messages: [message],
      nextStepId: step.id,
      flowContext,
      completed: false,
    };
  }
}
