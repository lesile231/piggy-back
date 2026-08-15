import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./admin-auth";

describe("admin-auth", () => {
  describe("password hashing", () => {
    it("hashPassword returns a bcrypt hash", async () => {
      const hash = await hashPassword("test-password");
      expect(hash).toMatch(/^\$2[aby]?\$/);
      expect(hash.length).toBeGreaterThan(50);
    });

    it("verifyPassword returns true for matching password", async () => {
      const hash = await hashPassword("my-secure-pw");
      const result = await verifyPassword("my-secure-pw", hash);
      expect(result).toBe(true);
    });

    it("verifyPassword returns false for wrong password", async () => {
      const hash = await hashPassword("correct-pw");
      const result = await verifyPassword("wrong-pw", hash);
      expect(result).toBe(false);
    });
  });
});
