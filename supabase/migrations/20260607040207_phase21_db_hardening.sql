-- ==========================================
-- Phase 21: Database Hardening & RLS Enforcement
-- ==========================================

-- 1. Create Ledger Core Tables
-- To ensure Fintech-grade consistency, these tables store all monetary amounts as BIGINT in cents.

CREATE TYPE ledger_account_type AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');
CREATE TYPE ledger_direction AS ENUM ('DEBIT', 'CREDIT');

CREATE TABLE IF NOT EXISTS public.ledger_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type ledger_account_type NOT NULL,
    currency VARCHAR(3) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID REFERENCES public.deals(id) ON DELETE RESTRICT,
    event_type TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ledger_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id UUID NOT NULL REFERENCES public.ledger_entries(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.ledger_accounts(id) ON DELETE RESTRICT,
    amount BIGINT NOT NULL CHECK (amount >= 0),
    direction ledger_direction NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on ledger tables
ALTER TABLE public.ledger_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_lines ENABLE ROW LEVEL SECURITY;

-- 2. Immutability Trigger (Stage 11 Protection)
-- Prevents UPDATE or DELETE on closed shipments.

CREATE OR REPLACE FUNCTION check_shipment_immutability()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        -- If the old shipment was already closed, it's locked.
        IF OLD.stage = 'closed' OR OLD.status = 'closed' THEN
            RAISE EXCEPTION 'Immutability Violation: Cannot update a closed shipment (Stage 11)';
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.stage = 'closed' OR OLD.status = 'closed' THEN
            RAISE EXCEPTION 'Immutability Violation: Cannot delete a closed shipment (Stage 11)';
        END IF;
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_shipment_immutability ON public.shipments;

CREATE TRIGGER enforce_shipment_immutability
BEFORE UPDATE OR DELETE ON public.shipments
FOR EACH ROW
EXECUTE FUNCTION check_shipment_immutability();


-- 3. Row Level Security (RLS) Policies Enforcement

-- Client Role: Can only SELECT from deals and shipments matching their tenant/user ID.
-- Drop any existing conflicting policies if needed, or simply append.
-- (Assuming auth.uid() links to customer_id or user_id)

-- Deals Client Policy
DROP POLICY IF EXISTS "Clients can view own deals" ON public.deals;
CREATE POLICY "Clients can view own deals" 
ON public.deals FOR SELECT 
TO authenticated 
USING (
    customer_id = auth.uid() OR user_id = auth.uid()
);

-- Shipments Client Policy
DROP POLICY IF EXISTS "Clients can view own shipments" ON public.shipments;
CREATE POLICY "Clients can view own shipments" 
ON public.shipments FOR SELECT 
TO authenticated 
USING (
    customer_id = auth.uid() OR user_id = auth.uid()
);

-- Saudi Partner Role: Global SELECT on financial/ledger aggregates, zero write permissions.
-- We use a JWT claim or a users/profiles table role check. Assuming auth.jwt()->>'role' or similar, or querying a profiles table.
-- Using `has_role(auth.uid(), 'saudi_partner')` if that helper exists, or just a direct check against profiles table.
-- Assuming a helper function `get_user_role(auth.uid())` or checking the profile table. Here we use an existence check in profiles.

CREATE POLICY "Saudi Partners can view ledger accounts" 
ON public.ledger_accounts FOR SELECT 
TO authenticated 
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'saudi_partner')
);

CREATE POLICY "Saudi Partners can view ledger entries" 
ON public.ledger_entries FOR SELECT 
TO authenticated 
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'saudi_partner')
);

CREATE POLICY "Saudi Partners can view ledger lines" 
ON public.ledger_lines FOR SELECT 
TO authenticated 
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'saudi_partner')
);


-- Turkish Partner (Broker): Full logistics permissions (INSERT, UPDATE, SELECT)
CREATE POLICY "Turkish Brokers have full logistics SELECT"
ON public.shipments FOR SELECT
TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'turkish_partner')
);

CREATE POLICY "Turkish Brokers have full logistics INSERT"
ON public.shipments FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'turkish_partner')
);

CREATE POLICY "Turkish Brokers have full logistics UPDATE"
ON public.shipments FOR UPDATE
TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'turkish_partner')
);

-- Admin & Internal Operations roles should be granted access as well to the ledger tables
CREATE POLICY "Admins full access ledger accounts" ON public.ledger_accounts FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'operations_employee')));
CREATE POLICY "Admins full access ledger entries" ON public.ledger_entries FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'operations_employee')));
CREATE POLICY "Admins full access ledger lines" ON public.ledger_lines FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'operations_employee')));

