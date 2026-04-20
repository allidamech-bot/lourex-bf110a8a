CREATE TABLE public.legal_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  consent_type text NOT NULL DEFAULT 'terms_of_service',
  ip_address text,
  device_info text,
  accepted_at timestamp with time zone NOT NULL DEFAULT now(),
  version text NOT NULL DEFAULT '1.0',
  UNIQUE(user_id, consent_type, version)
);

ALTER TABLE public.legal_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own consents"
ON public.legal_consents FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own consents"
ON public.legal_consents FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all consents"
ON public.legal_consents FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));