// Pure quote math extracted for testability.
// Amounts are whole-number Toman (integers only, no floats).

export type QuoteItemInput = {
  quantity: number;
  unit_price_toman: number;
};

export type QuoteMathInput = {
  items: QuoteItemInput[];
  discount_toman: number;
  tax_toman: number;
  deposit_toman: number;
};

export function computeQuoteTotals(input: QuoteMathInput) {
  const subtotal = input.items.reduce(
    (sum, it) => sum + Math.trunc(it.unit_price_toman) * Math.trunc(it.quantity),
    0,
  );
  const total = Math.max(
    0,
    subtotal - Math.trunc(input.discount_toman) + Math.trunc(input.tax_toman),
  );
  if (input.deposit_toman > total) {
    throw new Error("مبلغ پیش‌پرداخت نمی‌تواند از مبلغ کل بیشتر باشد.");
  }
  return { subtotal, total };
}
