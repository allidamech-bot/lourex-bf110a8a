
-- WebAuthn credentials storage
CREATE TABLE public.webauthn_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  credential_id text NOT NULL UNIQUE,
  public_key text NOT NULL,
  counter bigint NOT NULL DEFAULT 0,
  transports text[] DEFAULT '{}',
  device_name text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.webauthn_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own credentials" ON public.webauthn_credentials
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert own credentials" ON public.webauthn_credentials
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own credentials" ON public.webauthn_credentials
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Admins can view all credentials" ON public.webauthn_credentials
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Temporary challenge storage (accessed via service role only)
CREATE TABLE public.webauthn_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  challenge text NOT NULL,
  type text NOT NULL DEFAULT 'registration',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.webauthn_challenges ENABLE ROW LEVEL SECURITY;
-- No public RLS policies - only accessed via service role in edge functions

-- Auto-cleanup old challenges (older than 5 minutes)
CREATE OR REPLACE FUNCTION public.cleanup_webauthn_challenges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.webauthn_challenges WHERE created_at < now() - interval '5 minutes';
  RETURN NEW;
END;
$$;

CREATE TRIGGER cleanup_old_challenges
  AFTER INSERT ON public.webauthn_challenges
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.cleanup_webauthn_challenges();
