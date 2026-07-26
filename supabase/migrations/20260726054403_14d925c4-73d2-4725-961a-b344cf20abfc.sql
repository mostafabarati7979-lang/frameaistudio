
CREATE TABLE public.audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  order_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_created_idx ON public.audit_log(created_at DESC);
CREATE INDEX audit_log_entity_idx ON public.audit_log(entity_type, entity_id);
CREATE INDEX audit_log_order_idx ON public.audit_log(order_id);

GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Admin-only read; no insert/update/delete policies exist so
-- only SECURITY DEFINER triggers and service_role can write.
CREATE POLICY "audit_log admin read"
  ON public.audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ---------- Trigger fn: quotes ----------
CREATE OR REPLACE FUNCTION public.audit_quotes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE act text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    act := 'quote.created';
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    act := 'quote.' || NEW.status::text;
  ELSE
    RETURN NEW;
  END IF;
  INSERT INTO public.audit_log(actor_id, action, entity_type, entity_id, order_id, metadata)
  VALUES (
    auth.uid(),
    act,
    'quote',
    NEW.id,
    NEW.order_id,
    jsonb_build_object('version', NEW.version, 'total_toman', NEW.total_toman, 'status', NEW.status)
  );
  RETURN NEW;
END $$;
CREATE TRIGGER trg_audit_quotes
  AFTER INSERT OR UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.audit_quotes();

-- ---------- Trigger fn: contracts ----------
CREATE OR REPLACE FUNCTION public.audit_contracts()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE act text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    act := 'contract.created';
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    act := 'contract.' || NEW.status::text;
  ELSE
    RETURN NEW;
  END IF;
  INSERT INTO public.audit_log(actor_id, action, entity_type, entity_id, order_id, metadata)
  VALUES (
    auth.uid(),
    act,
    'contract',
    NEW.id,
    NEW.order_id,
    jsonb_build_object('version', NEW.version, 'status', NEW.status)
  );
  RETURN NEW;
END $$;
CREATE TRIGGER trg_audit_contracts
  AFTER INSERT OR UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.audit_contracts();

-- ---------- Trigger fn: payments ----------
CREATE OR REPLACE FUNCTION public.audit_payments()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE act text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    act := 'payment.submitted';
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    act := 'payment.' || NEW.status::text;
  ELSE
    RETURN NEW;
  END IF;
  INSERT INTO public.audit_log(actor_id, action, entity_type, entity_id, order_id, metadata)
  VALUES (
    auth.uid(),
    act,
    'payment',
    NEW.id,
    NEW.order_id,
    jsonb_build_object('kind', NEW.kind, 'amount_toman', NEW.amount_toman, 'status', NEW.status)
  );
  RETURN NEW;
END $$;
CREATE TRIGGER trg_audit_payments
  AFTER INSERT OR UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.audit_payments();

-- ---------- Trigger fn: user_roles ----------
CREATE OR REPLACE FUNCTION public.audit_user_roles()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log(actor_id, action, entity_type, entity_id, metadata)
    VALUES (auth.uid(), 'role.granted', 'user_role', NEW.user_id,
            jsonb_build_object('role', NEW.role, 'target_user_id', NEW.user_id));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log(actor_id, action, entity_type, entity_id, metadata)
    VALUES (auth.uid(), 'role.revoked', 'user_role', OLD.user_id,
            jsonb_build_object('role', OLD.role, 'target_user_id', OLD.user_id));
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_audit_user_roles_ins
  AFTER INSERT ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.audit_user_roles();
CREATE TRIGGER trg_audit_user_roles_del
  AFTER DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.audit_user_roles();
