
CREATE TYPE public.quote_status AS ENUM (
  'draft','sent','approved','rejected','revision_requested','superseded','expired'
);

CREATE TABLE public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  version int NOT NULL,
  status public.quote_status NOT NULL DEFAULT 'draft',
  created_by uuid NOT NULL REFERENCES auth.users(id),
  admin_notes text,
  customer_response_note text,
  subtotal_toman bigint NOT NULL DEFAULT 0 CHECK (subtotal_toman >= 0),
  discount_toman bigint NOT NULL DEFAULT 0 CHECK (discount_toman >= 0),
  tax_toman bigint NOT NULL DEFAULT 0 CHECK (tax_toman >= 0),
  total_toman bigint NOT NULL DEFAULT 0 CHECK (total_toman >= 0),
  deposit_toman bigint NOT NULL DEFAULT 0 CHECK (deposit_toman >= 0),
  expires_at timestamptz,
  sent_at timestamptz,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, version)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotes TO authenticated;
GRANT ALL ON public.quotes TO service_role;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

CREATE INDEX quotes_order_idx ON public.quotes (order_id, version DESC);
CREATE INDEX quotes_status_idx ON public.quotes (status);

CREATE POLICY "quotes admins all" ON public.quotes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "quotes customer read sent" ON public.quotes
  FOR SELECT TO authenticated
  USING (
    status <> 'draft'
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = quotes.order_id AND o.customer_id = auth.uid()
    )
  );

CREATE TRIGGER quotes_updated
BEFORE UPDATE ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE FUNCTION public.next_quote_version(_order_id uuid)
RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(MAX(version), 0) + 1 FROM public.quotes WHERE order_id = _order_id
$$;

CREATE TABLE public.quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  quantity int NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price_toman bigint NOT NULL CHECK (unit_price_toman >= 0),
  amount_toman bigint NOT NULL CHECK (amount_toman >= 0),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_items TO authenticated;
GRANT ALL ON public.quote_items TO service_role;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;

CREATE INDEX quote_items_quote_idx ON public.quote_items (quote_id, sort_order);

CREATE POLICY "quote_items admins all" ON public.quote_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "quote_items customer read sent" ON public.quote_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quotes q
      JOIN public.orders o ON o.id = q.order_id
      WHERE q.id = quote_items.quote_id
        AND q.status <> 'draft'
        AND o.customer_id = auth.uid()
    )
  );
