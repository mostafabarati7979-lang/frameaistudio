
-- =================== ENUM ===================
CREATE TYPE public.order_status AS ENUM (
  'draft','submitted','quoted','contract_pending','contract_approved',
  'payment_pending','in_production','initial_delivered','revisions',
  'final_delivered','completed','cancelled'
);

-- =================== ORDER CODE GENERATOR ===================
CREATE OR REPLACE FUNCTION public.generate_order_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  i int;
BEGIN
  LOOP
    code := 'FA-';
    FOR i IN 1..6 LOOP
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.orders WHERE order_code = code);
  END LOOP;
  RETURN code;
END;
$$;

-- =================== ORDERS ===================
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_code text NOT NULL UNIQUE,
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.order_status NOT NULL DEFAULT 'submitted',

  -- Step 1/2: service selection
  service_type text NOT NULL,
  package_key text,

  -- Step 3: project info
  project_title text NOT NULL,
  event_date date,
  city text,
  address text,
  team_hours int,
  shooting_days int,
  description text,

  -- Step 4: technical details
  cameras_count int,
  quality text CHECK (quality IN ('fhd','4k') OR quality IS NULL),
  orientation text CHECK (orientation IN ('horizontal','vertical','both') OR orientation IS NULL),
  duration_min int,
  clips_count int,
  reels_count int,
  needs_lighting boolean NOT NULL DEFAULT false,
  needs_audio boolean NOT NULL DEFAULT false,
  aerial boolean NOT NULL DEFAULT false,
  voiceover boolean NOT NULL DEFAULT false,
  subtitles boolean NOT NULL DEFAULT false,
  scriptwriting boolean NOT NULL DEFAULT false,
  rush boolean NOT NULL DEFAULT false,

  -- Step 5: style
  style text,

  -- Step 7: additional info
  customer_notes text,
  expectations text,
  budget_note text,
  preferred_contact text CHECK (preferred_contact IN ('phone','sms','messenger','email') OR preferred_contact IS NULL),
  best_call_time text,

  -- Step 8: consents
  consent_terms boolean NOT NULL DEFAULT false,
  consent_file_ownership boolean NOT NULL DEFAULT false,
  consent_ai_use boolean NOT NULL DEFAULT false,
  consent_publish_portfolio boolean NOT NULL DEFAULT false,
  consent_face_voice_simulation boolean NOT NULL DEFAULT false,

  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE INDEX orders_customer_idx ON public.orders (customer_id, created_at DESC);
CREATE INDEX orders_status_idx ON public.orders (status, created_at DESC);

CREATE POLICY "orders read own" ON public.orders
  FOR SELECT TO authenticated USING (auth.uid() = customer_id);
CREATE POLICY "orders admins read all" ON public.orders
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "orders insert own" ON public.orders
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = customer_id);
-- Customers may edit only while their order hasn't been priced yet.
CREATE POLICY "orders update own before pricing" ON public.orders
  FOR UPDATE TO authenticated
  USING (auth.uid() = customer_id AND status IN ('draft','submitted'))
  WITH CHECK (auth.uid() = customer_id AND status IN ('draft','submitted'));
CREATE POLICY "orders admins update all" ON public.orders
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "orders delete own draft" ON public.orders
  FOR DELETE TO authenticated USING (auth.uid() = customer_id AND status IN ('draft','submitted'));

CREATE TRIGGER orders_updated
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =================== ORDER FILES ===================
CREATE TABLE public.order_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  uploaded_by_role public.app_role NOT NULL DEFAULT 'customer',
  storage_path text NOT NULL,
  file_name text NOT NULL,
  content_type text NOT NULL,
  size_bytes bigint NOT NULL,
  kind text NOT NULL CHECK (kind IN ('image','video','audio','logo','pdf','sample','other')),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.order_files TO authenticated;
GRANT ALL ON public.order_files TO service_role;
ALTER TABLE public.order_files ENABLE ROW LEVEL SECURITY;

CREATE INDEX order_files_order_idx ON public.order_files (order_id);

CREATE POLICY "order_files read own" ON public.order_files
  FOR SELECT TO authenticated USING (
    auth.uid() = owner_id OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_files.order_id AND o.customer_id = auth.uid()
    )
  );
CREATE POLICY "order_files admins read all" ON public.order_files
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "order_files insert own" ON public.order_files
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = owner_id AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_files.order_id
        AND o.customer_id = auth.uid()
        AND o.status IN ('draft','submitted','revisions')
    )
  );
CREATE POLICY "order_files delete own" ON public.order_files
  FOR DELETE TO authenticated USING (
    auth.uid() = owner_id AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_files.order_id AND o.status IN ('draft','submitted')
    )
  );

-- =================== STORAGE RLS on order-files bucket ===================
-- Path convention: {user_id}/{order_id}/{filename}
CREATE POLICY "order-files owner read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'order-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "order-files admin read all"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'order-files' AND public.has_role(auth.uid(),'admin')
  );

CREATE POLICY "order-files owner insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'order-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "order-files owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'order-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "order-files admin write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'order-files' AND public.has_role(auth.uid(),'admin')
  );

CREATE POLICY "order-files admin delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'order-files' AND public.has_role(auth.uid(),'admin')
  );
