-- P0: activate the real LOUREX catalog. No legacy RFQ/quotes/orders tables are changed.
-- New catalog products begin as drafts and are visible only after staff approval.
CREATE TABLE IF NOT EXISTS public.product_catalog_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name_ar text NOT NULL DEFAULT '',
  name_en text NOT NULL DEFAULT '',
  short_description_ar text NOT NULL DEFAULT '',
  short_description_en text NOT NULL DEFAULT '',
  description_ar text NOT NULL DEFAULT '',
  description_en text NOT NULL DEFAULT '',
  category_id text NOT NULL DEFAULT 'food-fmcg',
  origin_country text NOT NULL DEFAULT '',
  brand text NOT NULL DEFAULT '',
  moq text NOT NULL DEFAULT '',
  unit text NOT NULL DEFAULT '',
  packaging text NOT NULL DEFAULT '',
  weight text NOT NULL DEFAULT '',
  dimensions text NOT NULL DEFAULT '',
  material text NOT NULL DEFAULT '',
  technical_specs text NOT NULL DEFAULT '',
  price_note_ar text NOT NULL DEFAULT '',
  price_note_en text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft',
  is_featured boolean NOT NULL DEFAULT false,
  image_url text NOT NULL DEFAULT '',
  image_alt_ar text NOT NULL DEFAULT '',
  image_alt_en text NOT NULL DEFAULT '',
  tags_ar text[] NOT NULL DEFAULT '{}'::text[],
  tags_en text[] NOT NULL DEFAULT '{}'::text[],
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_catalog_products_status_check CHECK (status IN ('draft','active','archived'))
);

CREATE INDEX IF NOT EXISTS product_catalog_products_status_idx ON public.product_catalog_products(status);
CREATE INDEX IF NOT EXISTS product_catalog_products_category_idx ON public.product_catalog_products(category_id);
CREATE INDEX IF NOT EXISTS product_catalog_products_featured_idx ON public.product_catalog_products(is_featured DESC,updated_at DESC);

-- Non-privileged trigger; no publicly callable SECURITY DEFINER helper.
CREATE OR REPLACE FUNCTION public.touch_product_catalog_product()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
BEGIN
  NEW.updated_at=now();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.touch_product_catalog_product() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS product_catalog_products_touch_updated_at ON public.product_catalog_products;
CREATE TRIGGER product_catalog_products_touch_updated_at BEFORE UPDATE ON public.product_catalog_products
  FOR EACH ROW EXECUTE FUNCTION public.touch_product_catalog_product();

ALTER TABLE public.product_catalog_products ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.product_catalog_products FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.product_catalog_products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_catalog_products TO authenticated;

-- Anon & customers can see ONLY published items. Internal owners and ops may review drafts.
DROP POLICY IF EXISTS "Public can view active catalog products" ON public.product_catalog_products;
DROP POLICY IF EXISTS "Internal users can manage catalog products" ON public.product_catalog_products;
CREATE POLICY "Published catalog is public" ON public.product_catalog_products
  FOR SELECT TO anon,authenticated USING (status='active');
CREATE POLICY "Owner and operations review catalog" ON public.product_catalog_products
  FOR SELECT TO authenticated USING (
    (select public.is_lourex_role((select auth.uid()), ARRAY['owner','operations_employee']::text[]))
  );
CREATE POLICY "Owner and operations create products" ON public.product_catalog_products
  FOR INSERT TO authenticated WITH CHECK (
    (select public.is_lourex_role((select auth.uid()), ARRAY['owner','operations_employee']::text[]))
  );
CREATE POLICY "Owner and operations update products" ON public.product_catalog_products
  FOR UPDATE TO authenticated
  USING ((select public.is_lourex_role((select auth.uid()), ARRAY['owner','operations_employee']::text[])))
  WITH CHECK ((select public.is_lourex_role((select auth.uid()), ARRAY['owner','operations_employee']::text[])));
CREATE POLICY "Owner and operations remove products" ON public.product_catalog_products
  FOR DELETE TO authenticated USING (
    (select public.is_lourex_role((select auth.uid()), ARRAY['owner','operations_employee']::text[]))
  );
