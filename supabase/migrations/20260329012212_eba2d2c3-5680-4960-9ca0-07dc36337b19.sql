
-- Create inquiries table
CREATE TABLE public.inquiries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  company TEXT DEFAULT '',
  message TEXT DEFAULT '',
  inquiry_type TEXT NOT NULL DEFAULT 'general',
  factory_name TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

-- Anyone can submit an inquiry (public insert)
CREATE POLICY "Anyone can submit inquiries"
  ON public.inquiries FOR INSERT
  TO public
  WITH CHECK (true);

-- Only admins can read inquiries
CREATE POLICY "Admins can read inquiries"
  ON public.inquiries FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete inquiries
CREATE POLICY "Admins can delete inquiries"
  ON public.inquiries FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create site_settings table for dynamic stats
CREATE TABLE public.site_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read site settings
CREATE POLICY "Anyone can read site settings"
  ON public.site_settings FOR SELECT
  TO public
  USING (true);

-- Only admins can update site settings
CREATE POLICY "Admins can update site settings"
  ON public.site_settings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert site settings"
  ON public.site_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed default stats
INSERT INTO public.site_settings (key, value) VALUES
  ('stat_factories', '50+'),
  ('stat_pallets', '12K+'),
  ('stat_countries', '35+');

-- Add user_id to shipments for client-specific filtering
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
