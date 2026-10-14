-- Run as a read-only verification AFTER deploying the catalog migration.
-- This script only checks schema configuration; it does not create products.
DO $$
DECLARE
  product_count bigint;
BEGIN
  IF to_regclass('public.product_catalog_products') IS NULL THEN
    RAISE EXCEPTION 'Catalog table missing';
  END IF;
  IF NOT (SELECT c.relrowsecurity FROM pg_class c WHERE c.oid='public.product_catalog_products'::regclass) THEN
    RAISE EXCEPTION 'Catalog RLS must be enabled';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='product_catalog_products'
      AND policyname='Published catalog is public' AND cmd='SELECT'
      AND qual LIKE '%status%active%'
  ) THEN
    RAISE EXCEPTION 'Published-only public catalog policy missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='product_catalog_products'
      AND policyname='Owner and operations create products' AND cmd='INSERT'
  ) THEN
    RAISE EXCEPTION 'Staff-only product insert policy missing';
  END IF;
  IF (SELECT column_default FROM information_schema.columns
      WHERE table_schema='public' AND table_name='product_catalog_products' AND column_name='status') NOT LIKE '%draft%' THEN
    RAISE EXCEPTION 'Catalog must default to drafts';
  END IF;
  IF has_table_privilege('anon','public.product_catalog_products','INSERT')
     OR has_table_privilege('anon','public.product_catalog_products','UPDATE')
     OR has_table_privilege('anon','public.product_catalog_products','DELETE') THEN
    RAISE EXCEPTION 'Anonymous users cannot mutate products';
  END IF;
  SELECT count(*) INTO product_count FROM public.product_catalog_products;
  RAISE NOTICE 'P0 catalog schema OK; %% products', product_count;
END $$;
