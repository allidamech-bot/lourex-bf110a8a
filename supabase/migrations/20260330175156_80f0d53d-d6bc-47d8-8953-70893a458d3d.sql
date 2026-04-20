
-- Global settings already exists (site_settings), insert default trade config data
-- We'll use site_settings for FX rates, port fees, customs duties

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_site_settings_key ON public.site_settings(key);
