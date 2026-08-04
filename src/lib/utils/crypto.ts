import { createHmac, timingSafeEqual } from "node:crypto";

export function computeHmacSignature(
  payload: string,
  secret: string,
  algorithm: "sha1" | "sha256",
): string {
  return createHmac(algorithm, secret).update(payload, "utf8").digest("hex");
}

export function verifyHmacSignature(
  payload: string,
  signature: string,
  secret: string,
  algorithm: "sha1" | "sha256",
): boolean {
  const expected = computeHmacSignature(payload, secret, algorithm);
  if (expected.length !== signature.length) return false;
  try {
    return timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(signature, "hex"),
    );
  } catch {
    return false;
  }
}
