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
  origin_country text NOT NULL DEFAULT 'Turkey',
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
  status text NOT NULL DEFAULT 'active',
  is_featured boolean NOT NULL DEFAULT false,
  image_url text NOT NULL DEFAULT '',
  image_alt_ar text NOT NULL DEFAULT '',
  image_alt_en text NOT NULL DEFAULT '',
  tags_ar text[] NOT NULL DEFAULT '{}'::text[],
  tags_en text[] NOT NULL DEFAULT '{}'::text[],
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'product_catalog_products_status_check'
  ) THEN
    ALTER TABLE public.product_catalog_products
      ADD CONSTRAINT product_catalog_products_status_check
      CHECK (status IN ('active', 'draft', 'archived'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS product_catalog_products_status_idx
  ON public.product_catalog_products(status);

CREATE INDEX IF NOT EXISTS product_catalog_products_category_idx
  ON public.product_catalog_products(category_id);

CREATE INDEX IF NOT EXISTS product_catalog_products_featured_idx
  ON public.product_catalog_products(is_featured DESC, updated_at DESC);

CREATE OR REPLACE FUNCTION public.touch_product_catalog_product()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS product_catalog_products_touch_updated_at ON public.product_catalog_products;
CREATE TRIGGER product_catalog_products_touch_updated_at
  BEFORE UPDATE ON public.product_catalog_products
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_product_catalog_product();

ALTER TABLE public.product_catalog_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active catalog products" ON public.product_catalog_products;
CREATE POLICY "Public can view active catalog products"
  ON public.product_catalog_products
  FOR SELECT
  TO anon, authenticated
  USING (
    status = 'active'
    OR public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee', 'turkish_partner', 'saudi_partner'])
  );

DROP POLICY IF EXISTS "Internal users can manage catalog products" ON public.product_catalog_products;
CREATE POLICY "Internal users can manage catalog products"
  ON public.product_catalog_products
  FOR ALL
  TO authenticated
  USING (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']))
  WITH CHECK (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']));
