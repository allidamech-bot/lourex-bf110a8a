
-- Add missing columns to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock_capacity text DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS lead_time text DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS shipping_origin text DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS seller_id uuid;

-- Add verified_at to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verified_at timestamptz;

-- Update the public product visibility policy to only show approved products
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;
CREATE POLICY "Anyone can view active approved products"
ON public.products FOR SELECT
TO public
USING (is_active = true AND status = 'approved');

-- Allow verified sellers/manufacturers/factory owners to create products
CREATE POLICY "Verified sellers can create products"
ON public.products FOR INSERT
TO authenticated
WITH CHECK (
  seller_id = auth.uid()
  AND is_verified_user()
  AND (
    has_role(auth.uid(), 'seller'::app_role)
    OR has_role(auth.uid(), 'manufacturer'::app_role)
    OR has_role(auth.uid(), 'factory'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Allow sellers to manage their own products
CREATE POLICY "Sellers can update own products"
ON public.products FOR UPDATE
TO authenticated
USING (seller_id = auth.uid())
WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Sellers can delete own products"
ON public.products FOR DELETE
TO authenticated
USING (seller_id = auth.uid());

CREATE POLICY "Sellers can view own products"
ON public.products FOR SELECT
TO authenticated
USING (seller_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_products_seller_id ON public.products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
