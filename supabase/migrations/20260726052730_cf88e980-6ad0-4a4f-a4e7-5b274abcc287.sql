
CREATE TYPE public.payment_kind AS ENUM ('deposit','final');
CREATE TYPE public.payment_status AS ENUM ('pending','approved','rejected','cancelled');

CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL,
  kind public.payment_kind NOT NULL,
  status public.payment_status NOT NULL DEFAULT 'pending',
  amount_toman bigint NOT NULL CHECK (amount_toman > 0),
  reference_no text,
  paid_at timestamptz,
  note text,
  admin_notes text,
  receipt_path text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX payments_one_approved_per_kind
  ON public.payments(order_id, kind)
  WHERE status = 'approved';

CREATE INDEX payments_order_idx ON public.payments(order_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments admins all"
  ON public.payments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "payments read own"
  ON public.payments FOR SELECT TO authenticated
  USING (auth.uid() = customer_id);

CREATE POLICY "payments insert own after contract"
  ON public.payments FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = customer_id
    AND status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = payments.order_id
        AND o.customer_id = auth.uid()
        AND o.status IN ('contract_approved','payment_pending','in_production','initial_delivered','revisions','final_delivered')
    )
    AND EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.order_id = payments.order_id AND c.status = 'approved'
    )
  );

CREATE POLICY "payments cancel own pending"
  ON public.payments FOR UPDATE TO authenticated
  USING (auth.uid() = customer_id AND status = 'pending')
  WITH CHECK (auth.uid() = customer_id AND status IN ('pending','cancelled'));

CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
