
CREATE TYPE public.contract_status AS ENUM ('draft','sent','approved','rejected','superseded');

CREATE TABLE public.contracts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  quote_id uuid REFERENCES public.quotes(id) ON DELETE SET NULL,
  version integer NOT NULL,
  status public.contract_status NOT NULL DEFAULT 'draft',
  created_by uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  admin_notes text,
  customer_response_note text,
  sent_at timestamptz,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(order_id, version)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contracts TO authenticated;
GRANT ALL ON public.contracts TO service_role;

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contracts admins all"
  ON public.contracts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "contracts customer read sent"
  ON public.contracts FOR SELECT TO authenticated
  USING (
    status <> 'draft'
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = contracts.order_id AND o.customer_id = auth.uid()
    )
  );

CREATE TRIGGER trg_contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE FUNCTION public.next_contract_version(_order_id uuid)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(MAX(version),0) + 1 FROM public.contracts WHERE order_id = _order_id
$$;
