import { describe, it, expect } from "vitest";
import {
  orderDraftSchema,
  registerFileSchema,
  ALLOWED_MIME,
  MAX_FILE_BYTES,
} from "@/lib/orders-schema";

describe("orderDraftSchema", () => {
  it("accepts a minimal valid draft", () => {
    const parsed = orderDraftSchema.parse({
      service_type: "wedding-film",
      project_title: "عروسی نمونه",
    });
    expect(parsed.service_type).toBe("wedding-film");
  });

  it("rejects empty project title", () => {
    expect(() =>
      orderDraftSchema.parse({ service_type: "wedding-film", project_title: "" }),
    ).toThrow();
  });
});

describe("registerFileSchema + allowlist", () => {
  it("only permits declared MIME types", () => {
    const knownTypes = Object.keys(ALLOWED_MIME);
    expect(knownTypes.length).toBeGreaterThan(0);
    for (const mime of knownTypes) {
      expect(ALLOWED_MIME[mime]).toBeTruthy();
    }
    expect(ALLOWED_MIME["application/x-msdownload"]).toBeUndefined();
    expect(ALLOWED_MIME["application/x-sh"]).toBeUndefined();
  });

  it("rejects oversized files at schema level", () => {
    const oversize = MAX_FILE_BYTES + 1;
    const result = registerFileSchema.safeParse({
      order_id: "00000000-0000-0000-0000-000000000000",
      storage_path: "u/o/name.jpg",
      file_name: "name.jpg",
      content_type: "image/jpeg",
      size_bytes: oversize,
    });
    expect(result.success).toBe(false);
  });

  it("accepts a well-formed file registration", () => {
    const result = registerFileSchema.safeParse({
      order_id: "00000000-0000-0000-0000-000000000000",
      storage_path: "u/o/name.jpg",
      file_name: "name.jpg",
      content_type: "image/jpeg",
      size_bytes: 1024,
      kind: "image",
    });
    expect(result.success).toBe(true);
  });
});
