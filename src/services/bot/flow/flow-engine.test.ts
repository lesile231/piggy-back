import { describe, it, expect, vi } from "vitest";
import { FlowEngine } from "./flow-engine";
import type { FlowRepository } from "./flow.repository";

function createMockRepo(overrides: Partial<FlowRepository> = {}): FlowRepository {
  return {
    getActiveFlows: vi.fn().mockResolvedValue([]),
    getFirstStep: vi.fn().mockResolvedValue(null),
    getStep: vi.fn().mockResolvedValue(null),
    getNextStep: vi.fn().mockResolvedValue(null),
    getStepOptions: vi.fn().mockResolvedValue([]),
    ...overrides,
  } as unknown as FlowRepository;
}

describe("FlowEngine", () => {
  it("startFlow returns first step message with options as buttons", async () => {
    const repo = createMockRepo({
      getFirstStep: vi.fn().mockResolvedValue({
        id: "step-1",
        flowId: "flow-1",
        stepOrder: 1,
        type: "text_input",
        messages: { en: "Where are you now?", ja: "今どこにいますか？" },
        apiAction: null,
        config: {},
      }),
      getStepOptions: vi.fn().mockResolvedValue([
        { id: "opt-1", labels: { en: "Busan Station", ja: "釜山駅" }, value: "busan_station", nextStepId: "step-2", sortOrder: 1 },
        { id: "opt-2", labels: { en: "Haeundae", ja: "海雲台" }, value: "haeundae", nextStepId: "step-2", sortOrder: 2 },
      ]),
    });
    const engine = new FlowEngine(repo);

    const result = await engine.startFlow("flow-1", "en");
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]!.text).toBe("Where are you now?");
    expect(result.messages[0]!.buttons).toHaveLength(2);
    expect(result.messages[0]!.buttons![0]!.label).toBe("Busan Station");
    expect(result.nextStepId).toBe("step-1");
    expect(result.completed).toBe(false);
  });

  it("startFlow returns completed when flow has no steps", async () => {
    const repo = createMockRepo({
      getFirstStep: vi.fn().mockResolvedValue(null),
    });
    const engine = new FlowEngine(repo);

    const result = await engine.startFlow("flow-1", "en");
    expect(result.completed).toBe(true);
    expect(result.messages).toHaveLength(1);
  });

  it("handleInput advances to next step via option match", async () => {
    const getStepMock = vi.fn()
      // First call: get current step
      .mockResolvedValueOnce({
        id: "step-1",
        flowId: "flow-1",
        stepOrder: 1,
        type: "text_input",
        messages: { en: "Where are you?" },
        apiAction: null,
        config: {},
      })
      // Second call: get next step via option's nextStepId
      .mockResolvedValueOnce({
        id: "step-2",
        flowId: "flow-1",
        stepOrder: 2,
        type: "text_input",
        messages: { en: "Where do you want to go?" },
        apiAction: null,
        config: {},
      });

    const repo = createMockRepo({
      getStep: getStepMock,
      getStepOptions: vi.fn()
        .mockResolvedValueOnce([
          { id: "opt-1", labels: { en: "Busan Station" }, value: "busan_station", nextStepId: "step-2", sortOrder: 1 },
        ])
        .mockResolvedValueOnce([]),
    });

    const engine = new FlowEngine(repo);
    const result = await engine.handleInput("step-1", "busan_station", "en", {});

    expect(result.completed).toBe(false);
    expect(result.messages[0]!.text).toBe("Where do you want to go?");
    expect(result.nextStepId).toBe("step-2");
    expect(result.flowContext).toEqual({ step_1: "busan_station" });
  });

  it("handleInput returns apiAction when step type is api_call", async () => {
    const getStepMock = vi.fn()
      // First call: get current step
      .mockResolvedValueOnce({
        id: "step-1",
        flowId: "flow-1",
        stepOrder: 1,
        type: "text_input",
        messages: { en: "Where?" },
        apiAction: null,
        config: {},
      })
      // Second call: get next step via option's nextStepId
      .mockResolvedValueOnce({
        id: "step-api",
        flowId: "flow-1",
        stepOrder: 3,
        type: "api_call",
        messages: {},
        apiAction: "search_transit_route",
        config: {},
      });

    const repo = createMockRepo({
      getStep: getStepMock,
      getStepOptions: vi.fn()
        .mockResolvedValueOnce([
          { id: "opt-1", labels: { en: "Haeundae" }, value: "haeundae", nextStepId: "step-api", sortOrder: 1 },
        ])
        .mockResolvedValueOnce([]),
    });

    const engine = new FlowEngine(repo);
    const result = await engine.handleInput("step-1", "haeundae", "en", {});

    expect(result.apiAction).toBe("search_transit_route");
  });

  it("handleInput stores free text input in flowContext", async () => {
    const repo = createMockRepo({
      getStep: vi.fn()
        .mockResolvedValueOnce({
          id: "step-1",
          flowId: "flow-1",
          stepOrder: 1,
          type: "text_input",
          messages: { en: "Where?" },
          apiAction: null,
          config: {},
        }),
      getStepOptions: vi.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]),
      getNextStep: vi.fn()
        .mockResolvedValueOnce({
          id: "step-2",
          flowId: "flow-1",
          stepOrder: 2,
          type: "text_input",
          messages: { en: "Where to?" },
          apiAction: null,
          config: {},
        }),
    });

    const engine = new FlowEngine(repo);
    const result = await engine.handleInput("step-1", "Busan Station", "en", {});

    expect(result.flowContext).toEqual({ step_1: "Busan Station" });
  });
});
