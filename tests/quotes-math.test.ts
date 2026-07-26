import { describe, it, expect } from "vitest";
import { computeQuoteTotals } from "@/lib/quotes-math";

describe("computeQuoteTotals", () => {
  it("sums line items using integer Toman math", () => {
    const { subtotal, total } = computeQuoteTotals({
      items: [
        { quantity: 2, unit_price_toman: 1_500_000 },
        { quantity: 1, unit_price_toman: 750_000 },
      ],
      discount_toman: 0,
      tax_toman: 0,
      deposit_toman: 0,
    });
    expect(subtotal).toBe(3_750_000);
    expect(total).toBe(3_750_000);
  });

  it("applies discount and tax", () => {
    const { total } = computeQuoteTotals({
      items: [{ quantity: 1, unit_price_toman: 10_000_000 }],
      discount_toman: 1_000_000,
      tax_toman: 900_000,
      deposit_toman: 0,
    });
    expect(total).toBe(9_900_000);
  });

  it("floors totals at zero when discount exceeds subtotal + tax", () => {
    const { total } = computeQuoteTotals({
      items: [{ quantity: 1, unit_price_toman: 100 }],
      discount_toman: 10_000,
      tax_toman: 0,
      deposit_toman: 0,
    });
    expect(total).toBe(0);
  });

  it("rejects deposit greater than total", () => {
    expect(() =>
      computeQuoteTotals({
        items: [{ quantity: 1, unit_price_toman: 1_000_000 }],
        discount_toman: 0,
        tax_toman: 0,
        deposit_toman: 2_000_000,
      }),
    ).toThrow();
  });

  it("truncates floats to keep amounts integer", () => {
    const { subtotal } = computeQuoteTotals({
      items: [{ quantity: 3, unit_price_toman: 1_000_000.9 }],
      discount_toman: 0,
      tax_toman: 0,
      deposit_toman: 0,
    });
    expect(subtotal).toBe(3_000_000);
  });
});
