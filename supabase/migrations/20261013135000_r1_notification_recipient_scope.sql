-- R1: stop partners from writing arbitrarily addressed notifications.
-- Existing UI emits notifications for self/other partner users involved in
-- assigned deals; owner/operations may notify any active company profile.

CREATE OR REPLACE FUNCTION public.lourex_r1_can_notify(p_recipient_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    auth.uid() IS NOT NULL
    AND p_recipient_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles actor
      WHERE actor.id = auth.uid()
        AND actor.status = 'active'
        AND (
          actor.role IN ('owner', 'operations_employee')
          OR (
            actor.role IN ('turkish_partner', 'saudi_partner')
            AND EXISTS (
              SELECT 1 FROM public.profiles recipient
              WHERE recipient.id = p_recipient_id
                AND recipient.status = 'active'
                AND (
                  recipient.id = actor.id
                  OR recipient.role IN ('owner', 'operations_employee')
                  OR EXISTS (
                    SELECT 1 FROM public.deals d
                    WHERE public.lourex_r1_is_assigned_deal(d.id)
                      AND p_recipient_id IN (
                        d.assigned_turkish_partner_id,
                        d.assigned_saudi_partner_id
                      )
                  )
                )
            )
          )
        )
    ),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.lourex_r1_can_notify(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lourex_r1_can_notify(uuid) TO authenticated;

DROP POLICY IF EXISTS "Internal Lourex users can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Lourex R1 scoped notification recipients" ON public.notifications;
CREATE POLICY "Lourex R1 scoped notification recipients"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (public.lourex_r1_can_notify(user_id));

-- This does not replace notification idempotency/anti-spam or audit; those
-- require a rate-limited server-side domain workflow in a future batch.
