
CREATE TABLE public.factory_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text DEFAULT '',
  cr_number text NOT NULL,
  tax_id text NOT NULL,
  location text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.factory_applications ENABLE ROW LEVEL SECURITY;

-- Anyone (anon) can submit applications
CREATE POLICY "Anyone can submit factory applications"
  ON public.factory_applications
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Admins can view all applications
CREATE POLICY "Admins can view factory applications"
  ON public.factory_applications
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update applications (approve/reject)
CREATE POLICY "Admins can update factory applications"
  ON public.factory_applications
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can delete applications
CREATE POLICY "Admins can delete factory applications"
  ON public.factory_applications
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
