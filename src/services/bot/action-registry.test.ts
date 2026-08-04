import { describe, it, expect, vi } from "vitest";
import { ActionRegistry } from "./action-registry";

describe("ActionRegistry", () => {
  it("registers and executes a handler", async () => {
    const registry = new ActionRegistry();
    const handler = vi.fn().mockResolvedValue([{ type: "text", text: "result" }]);

    registry.register("test_action", handler);

    expect(registry.has("test_action")).toBe(true);
    const result = await registry.execute("test_action", { key: "value" }, "en");

    expect(handler).toHaveBeenCalledWith({ key: "value" }, "en");
    expect(result).toEqual([{ type: "text", text: "result" }]);
  });

  it("has() returns false for unregistered action", () => {
    const registry = new ActionRegistry();
    expect(registry.has("nonexistent")).toBe(false);
  });

  it("execute() throws for unregistered action", async () => {
    const registry = new ActionRegistry();
    await expect(
      registry.execute("nonexistent", {}, "en"),
    ).rejects.toThrow("Unknown action: nonexistent");
  });

  it("supports multiple registered actions", async () => {
    const registry = new ActionRegistry();
    const handler1 = vi.fn().mockResolvedValue([{ type: "text", text: "one" }]);
    const handler2 = vi.fn().mockResolvedValue([{ type: "text", text: "two" }]);

    registry.register("action_one", handler1);
    registry.register("action_two", handler2);

    const r1 = await registry.execute("action_one", {}, "en");
    const r2 = await registry.execute("action_two", {}, "en");

    expect(r1[0]!.text).toBe("one");
    expect(r2[0]!.text).toBe("two");
  });
});
