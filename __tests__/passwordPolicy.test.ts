import { describe, it, expect } from "vitest";
import { validateNewPassword } from "@/lib/passwordPolicy";

describe("passwordPolicy — validateNewPassword", () => {
  it("accepts 4~20 char alphanumeric/special passwords", () => {
    expect(validateNewPassword("ab12")).toBeNull();
    expect(validateNewPassword("Passw0rd!")).toBeNull();
    expect(validateNewPassword("a".repeat(20))).toBeNull();
    expect(validateNewPassword("!@#$%^&*")).toBeNull();
    expect(validateNewPassword("1234")).toBeNull(); // 숫자 전용도 허용 (0000 만 금지)
  });

  it("rejects too short / too long", () => {
    expect(validateNewPassword("abc")).toMatch(/4~20/);
    expect(validateNewPassword("a".repeat(21))).toMatch(/4~20/);
  });

  it("rejects spaces and non-ASCII", () => {
    expect(validateNewPassword("ab 12")).toMatch(/영문/);
    expect(validateNewPassword("비밀번호")).toMatch(/영문/);
  });

  it("rejects the default password 0000", () => {
    expect(validateNewPassword("0000")).toMatch(/기본 비밀번호/);
  });
});
