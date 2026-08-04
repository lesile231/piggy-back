import { describe, it, expect } from "vitest";
import { verifyHmacSignature, computeHmacSignature } from "./crypto";

describe("crypto", () => {
  const secret = "test-secret";
  const payload = '{"test":"data"}';

  it("computeHmacSignature produces hex string", () => {
    const sig = computeHmacSignature(payload, secret, "sha256");
    expect(sig).toMatch(/^[a-f0-9]{64}$/);
  });

  it("verifyHmacSignature returns true for valid signature", () => {
    const sig = computeHmacSignature(payload, secret, "sha256");
    expect(verifyHmacSignature(payload, sig, secret, "sha256")).toBe(true);
  });

  it("verifyHmacSignature returns false for invalid signature", () => {
    expect(verifyHmacSignature(payload, "invalid", secret, "sha256")).toBe(false);
  });

  it("verifyHmacSignature returns false for tampered payload", () => {
    const sig = computeHmacSignature(payload, secret, "sha256");
    expect(verifyHmacSignature('{"tampered":true}', sig, secret, "sha256")).toBe(false);
  });
});
