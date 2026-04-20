-- Create shipments table
CREATE TABLE public.shipments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tracking_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'factory' CHECK (status IN ('factory', 'warehouse', 'shipping', 'customs', 'delivered')),
  weight NUMERIC NOT NULL DEFAULT 0,
  pallets INTEGER NOT NULL DEFAULT 0,
  destination TEXT NOT NULL DEFAULT '',
  client_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

-- Allow public read access for tracking lookups
CREATE POLICY "Anyone can look up shipments by tracking_id"
  ON public.shipments
  FOR SELECT
  USING (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_shipments_updated_at
  BEFORE UPDATE ON public.shipments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed demo data
INSERT INTO public.shipments (tracking_id, status, weight, pallets, destination, client_name) VALUES
  ('LRX-2024-001', 'shipping', 4800, 12, 'Riyadh, SA', 'Al-Rashid Trading'),
  ('LRX-2024-002', 'customs', 3200, 8, 'Jeddah, SA', 'Gulf Imports Co.'),
  ('LRX-2024-003', 'delivered', 8000, 20, 'Dubai, UAE', 'Noor Retail');