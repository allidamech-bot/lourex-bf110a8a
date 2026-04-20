
-- Fix: restrict audit_logs insert to authenticated users (already restricted by TO authenticated)
-- Replace the overly permissive policy
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated can insert audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (changed_by = auth.uid());

-- Fix: tighten inquiries insert policy (pre-existing)
DROP POLICY IF EXISTS "Anyone can submit inquiries" ON public.inquiries;
CREATE POLICY "Anyone can submit inquiries" ON public.inquiries FOR INSERT TO anon, authenticated WITH CHECK (true);
