import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/components/hashUtils";

describe("hashUtils", () => {
  it("hashPassword produces deterministic SHA-256 hex", async () => {
    const a = await hashPassword("0000");
    const b = await hashPassword("0000");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("hashPassword produces different hashes for different inputs", async () => {
    const a = await hashPassword("password1");
    const b = await hashPassword("password2");
    expect(a).not.toBe(b);
  });

  it("verifyPassword returns true for matching password", async () => {
    const hash = await hashPassword("secret123");
    expect(await verifyPassword("secret123", hash)).toBe(true);
  });

  it("verifyPassword returns false for wrong password", async () => {
    const hash = await hashPassword("secret123");
    expect(await verifyPassword("wrong", hash)).toBe(false);
    expect(await verifyPassword("", hash)).toBe(false);
  });
});
