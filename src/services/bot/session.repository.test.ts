import { describe, it, expect, vi } from "vitest";
import { SessionRepository } from "./session.repository";
import type { Database } from "@/lib/db/client";

function createMockDb(options: {
  userRows?: unknown[];
  sessionRows?: unknown[];
  insertReturn?: unknown;
} = {}): Database {
  const { userRows = [], sessionRows = [], insertReturn = { id: "new-id" } } = options;
  return {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(() => ({
          limit: vi.fn().mockResolvedValue(userRows.length > 0 ? userRows : sessionRows),
        })),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([insertReturn]),
        onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  } as unknown as Database;
}

describe("SessionRepository", () => {
  it("findOrCreateUser returns existing user", async () => {
    const db = createMockDb({
      userRows: [{ id: "user-1", language: "ja" }],
    });
    const repo = new SessionRepository(db);

    const user = await repo.findOrCreateUser("whatsapp", "821001234");
    expect(user.id).toBe("user-1");
    expect(user.language).toBe("ja");
  });

  it("findOrCreateUser creates new user when not found", async () => {
    const selectMock = vi.fn()
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
    const insertMock = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "new-user", language: null }]),
      }),
    });
    const db = { select: selectMock, insert: insertMock } as unknown as Database;
    const repo = new SessionRepository(db);

    const user = await repo.findOrCreateUser("line", "U999");
    expect(user.id).toBe("new-user");
    expect(insertMock).toHaveBeenCalled();
  });

  it("createSession returns new session with menu mode", async () => {
    const db = createMockDb({
      insertReturn: { id: "session-1", mode: "menu", isActive: true },
    });
    const repo = new SessionRepository(db);

    const session = await repo.createSession("user-1");
    expect(session.id).toBe("session-1");
    expect(session.mode).toBe("menu");
  });
});
