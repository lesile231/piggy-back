// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { FlapSlot } from "./FlapSlot";

describe("FlapSlot", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders target char when phase is locked", () => {
    render(<FlapSlot phase="locked" targetChar="해" />);
    const slot = screen.getByTestId("flap-slot");
    expect(slot.textContent).toContain("해");
  });

  it("applies locked class with signal color when phase is locked", () => {
    render(<FlapSlot phase="locked" targetChar="해" />);
    const slot = screen.getByTestId("flap-slot");
    expect(slot.className).toContain("locked");
  });

  it("shows a space when phase is waiting", () => {
    render(<FlapSlot phase="waiting" targetChar="해" />);
    const charEl = screen.getByTestId("flap-char");
    // Non-breaking space or empty
    expect(charEl.textContent?.trim()).toBe("");
  });

  it("cycles through characters when phase is cycling", async () => {
    render(<FlapSlot phase="cycling" targetChar="해" />);
    const charEl = screen.getByTestId("flap-char");
    const initial = charEl.textContent;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60);
    });

    // Character should have changed
    expect(charEl.textContent).not.toBe(initial);
  });

  it("calls onLocked when transitioning to locked phase", () => {
    const onLocked = vi.fn();
    const { rerender } = render(
      <FlapSlot phase="cycling" targetChar="해" onLocked={onLocked} />,
    );

    rerender(
      <FlapSlot phase="locked" targetChar="해" onLocked={onLocked} />,
    );

    expect(onLocked).toHaveBeenCalledTimes(1);
  });
});
