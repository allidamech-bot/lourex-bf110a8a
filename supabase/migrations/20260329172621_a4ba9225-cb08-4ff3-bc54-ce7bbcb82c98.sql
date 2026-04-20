
-- Messages table for live chat linked to orders
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Buyers can see messages on their orders
CREATE POLICY "Buyers can view order messages" ON public.messages
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.orders WHERE orders.id = messages.order_id AND orders.buyer_id = auth.uid()
  ));

-- Factory owners can see messages on their orders
CREATE POLICY "Factory owners can view order messages" ON public.messages
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.orders o JOIN public.factories f ON o.factory_id = f.id
    WHERE o.id = messages.order_id AND f.owner_user_id = auth.uid()
  ));

-- Admins full access
CREATE POLICY "Admins full access messages" ON public.messages
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Authenticated users can send messages on their orders
CREATE POLICY "Users can send messages" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid());

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Inspection media table
CREATE TABLE public.inspection_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL,
  file_url text NOT NULL DEFAULT '',
  file_name text NOT NULL DEFAULT '',
  media_type text NOT NULL DEFAULT 'image',
  caption text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inspection_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Factory owners can upload inspection media" ON public.inspection_media
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.orders o JOIN public.factories f ON o.factory_id = f.id
    WHERE o.id = inspection_media.order_id AND f.owner_user_id = auth.uid()
  ));

CREATE POLICY "Buyers can view inspection media" ON public.inspection_media
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.orders WHERE orders.id = inspection_media.order_id AND orders.buyer_id = auth.uid()
  ));

CREATE POLICY "Factory owners can view inspection media" ON public.inspection_media
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.orders o JOIN public.factories f ON o.factory_id = f.id
    WHERE o.id = inspection_media.order_id AND f.owner_user_id = auth.uid()
  ));

CREATE POLICY "Admins full access inspection media" ON public.inspection_media
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add certificate columns to products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS cert_sfda boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cert_saber boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cert_halal boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cert_iso boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS units_per_carton integer DEFAULT 0;

-- Storage buckets for KYC documents and inspection media
INSERT INTO storage.buckets (id, name, public) VALUES ('kyc-documents', 'kyc-documents', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('inspection-media', 'inspection-media', false);

-- KYC bucket: users can upload their own docs, admins can read all
CREATE POLICY "Users upload own KYC docs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users read own KYC docs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Admins read all KYC docs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'kyc-documents' AND public.has_role(auth.uid(), 'admin'));

-- Inspection media bucket: factory owners upload, buyers and admins can view
CREATE POLICY "Factory owners upload inspection media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'inspection-media');

CREATE POLICY "Authenticated read inspection media" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'inspection-media');
