
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_amount_toman bigint,
  ADD COLUMN IF NOT EXISTS payment_bank_info text,
  ADD COLUMN IF NOT EXISTS payment_link text,
  ADD COLUMN IF NOT EXISTS payment_instructions_note text;
