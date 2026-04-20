-- Company profiles table linked to factories
CREATE TABLE public.company_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id uuid NOT NULL UNIQUE REFERENCES public.factories(id) ON DELETE CASCADE,
  business_type text NOT NULL DEFAULT '',
  categories text[] NOT NULL DEFAULT ARRAY[]::text[],
  description text NOT NULL DEFAULT '',
  logo_url text NOT NULL DEFAULT '',
  cover_url text NOT NULL DEFAULT '',
  certifications jsonb NOT NULL DEFAULT '[]'::jsonb,
  website text NOT NULL DEFAULT '',
  year_established integer,
  employee_count text NOT NULL DEFAULT '',
  onboarding_step integer NOT NULL DEFAULT 1,
  onboarding_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_company_profiles_factory_id ON public.company_profiles(factory_id);

ALTER TABLE public.company_profiles ENABLE ROW LEVEL SECURITY;

-- Owners (factory owners) can manage their profile
CREATE POLICY "Factory owners can view own company profile"
ON public.company_profiles FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.factories f WHERE f.id = company_profiles.factory_id AND f.owner_user_id = auth.uid()));

CREATE POLICY "Factory owners can insert own company profile"
ON public.company_profiles FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.factories f WHERE f.id = company_profiles.factory_id AND f.owner_user_id = auth.uid()));

CREATE POLICY "Factory owners can update own company profile"
ON public.company_profiles FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.factories f WHERE f.id = company_profiles.factory_id AND f.owner_user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.factories f WHERE f.id = company_profiles.factory_id AND f.owner_user_id = auth.uid()));

-- Admins full access
CREATE POLICY "Admins can manage all company profiles"
ON public.company_profiles FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Public can view profiles of verified factories (for marketplace/supplier pages)
CREATE POLICY "Public can view verified factory profiles"
ON public.company_profiles FOR SELECT TO anon, authenticated
USING (EXISTS (SELECT 1 FROM public.factories f WHERE f.id = company_profiles.factory_id AND f.is_verified = true));

-- Auto-update updated_at
CREATE TRIGGER update_company_profiles_updated_at
BEFORE UPDATE ON public.company_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for company branding assets (logos, covers, certifications)
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-assets', 'company-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: anyone can read, factory owners can upload to their folder
CREATE POLICY "Public can view company assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-assets');

CREATE POLICY "Authenticated users can upload company assets to own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'company-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Authenticated users can update own company assets"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'company-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Authenticated users can delete own company assets"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'company-assets' AND auth.uid()::text = (storage.foldername(name))[1]);