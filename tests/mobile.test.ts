import { describe, it, expect } from "vitest";
import { normalizeIranianMobile, toEnglishDigits } from "@/lib/mobile";

describe("Iranian mobile normalization", () => {
  it("normalizes common Iranian formats to +989XXXXXXXXX", () => {
    const cases = [
      "09121234567",
      "+989121234567",
      "989121234567",
      "00989121234567",
      "0912 123 4567",
      "0912-123-4567",
      "(0912) 123 4567",
    ];
    for (const raw of cases) {
      expect(normalizeIranianMobile(raw)).toBe("+989121234567");
    }
  });

  it("converts Persian and Arabic digits", () => {
    expect(toEnglishDigits("۰۹۱۲۱۲۳۴۵۶۷")).toBe("09121234567");
    expect(toEnglishDigits("٠٩١٢١٢٣٤٥٦٧")).toBe("09121234567");
    expect(normalizeIranianMobile("۰۹۱۲۱۲۳۴۵۶۷")).toBe("+989121234567");
  });

  it("rejects invalid inputs", () => {
    const bad = [
      "",
      "1234",
      "08121234567", // not 9-prefixed after leading 0
      "091212345", // too short
      "09121234567890", // too long
      "abcdefghijk",
      "+1 415 555 1212",
    ];
    for (const raw of bad) {
      expect(normalizeIranianMobile(raw)).toBeNull();
    }
  });
});
