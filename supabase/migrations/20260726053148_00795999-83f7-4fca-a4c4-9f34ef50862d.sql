
CREATE TYPE public.milestone_key AS ENUM (
  'kickoff','initial_cut','revision_1','revision_2','final_output','settlement'
);
CREATE TYPE public.milestone_status AS ENUM (
  'pending','in_progress','delivered','accepted','revision_requested','skipped'
);

CREATE TABLE public.project_milestones (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  key public.milestone_key NOT NULL,
  title text NOT NULL,
  description text,
  status public.milestone_status NOT NULL DEFAULT 'pending',
  sort_order int NOT NULL DEFAULT 0,
  admin_notes text,
  customer_notes text,
  delivered_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, key)
);

CREATE INDEX project_milestones_order_idx ON public.project_milestones(order_id, sort_order);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_milestones TO authenticated;
GRANT ALL ON public.project_milestones TO service_role;

ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "milestones admins all"
  ON public.project_milestones FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "milestones read own"
  ON public.project_milestones FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = project_milestones.order_id AND o.customer_id = auth.uid()
  ));

-- Customers can only update accept/revision fields on their own delivered milestones.
CREATE POLICY "milestones customer respond"
  ON public.project_milestones FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = project_milestones.order_id AND o.customer_id = auth.uid()
    )
    AND status IN ('delivered','revision_requested')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = project_milestones.order_id AND o.customer_id = auth.uid()
    )
    AND status IN ('accepted','revision_requested')
  );

CREATE TRIGGER trg_project_milestones_updated_at
  BEFORE UPDATE ON public.project_milestones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


CREATE TABLE public.project_deliverables (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  milestone_id uuid NOT NULL REFERENCES public.project_milestones(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  content_type text NOT NULL,
  size_bytes bigint NOT NULL,
  is_final_output boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX project_deliverables_milestone_idx ON public.project_deliverables(milestone_id);
CREATE INDEX project_deliverables_order_idx ON public.project_deliverables(order_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_deliverables TO authenticated;
GRANT ALL ON public.project_deliverables TO service_role;

ALTER TABLE public.project_deliverables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deliverables admins all"
  ON public.project_deliverables FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "deliverables read own"
  ON public.project_deliverables FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = project_deliverables.order_id AND o.customer_id = auth.uid()
  ));

-- Helper to bootstrap default milestones for an order.
CREATE OR REPLACE FUNCTION public.bootstrap_project_milestones(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.project_milestones (order_id, key, title, description, sort_order, status)
  VALUES
    (_order_id, 'kickoff',       'شروع پروژه و برنامه‌ریزی',      'هماهنگی نهایی، جدول زمانی و تحویل موارد مورد نیاز.', 1, 'in_progress'),
    (_order_id, 'initial_cut',   'برش اولیه (Initial Cut)',        'ارائه نسخه اولیه ویدیو برای بازخورد.',                2, 'pending'),
    (_order_id, 'revision_1',    'اصلاحیه نوبت اول',                'اعمال یک دور اصلاحات پس از بازخورد مشتری.',           3, 'pending'),
    (_order_id, 'revision_2',    'اصلاحیه نوبت دوم',                'در صورت نیاز، دور دوم اصلاحات.',                       4, 'pending'),
    (_order_id, 'final_output',  'خروجی نهایی',                     'خروجی نهایی با کیفیت کامل.',                            5, 'pending'),
    (_order_id, 'settlement',    'تسویه و تحویل خروجی نهایی',       'پس از پرداخت نهایی، لینک دانلود خروجی فعال می‌شود.',   6, 'pending')
  ON CONFLICT (order_id, key) DO NOTHING;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.bootstrap_project_milestones(uuid) FROM public, anon, authenticated;
