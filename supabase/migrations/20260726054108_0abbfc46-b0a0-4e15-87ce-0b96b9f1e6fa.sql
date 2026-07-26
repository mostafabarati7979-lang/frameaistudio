
CREATE TYPE public.content_kind AS ENUM ('service','package','portfolio','blog','faq','page');

CREATE TABLE public.content_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kind public.content_kind NOT NULL,
  slug text,
  title text NOT NULL,
  summary text,
  body jsonb NOT NULL DEFAULT '{}'::jsonb,
  cover_url text,
  sort_order int NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX content_items_slug_idx ON public.content_items(kind, slug) WHERE slug IS NOT NULL;
CREATE INDEX content_items_kind_pub_idx ON public.content_items(kind, is_published, sort_order);

GRANT SELECT ON public.content_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_items TO authenticated;
GRANT ALL ON public.content_items TO service_role;

ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_items public read published"
  ON public.content_items FOR SELECT TO anon, authenticated
  USING (is_published = true);

CREATE POLICY "content_items admins all"
  ON public.content_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_content_items_updated_at
  BEFORE UPDATE ON public.content_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
