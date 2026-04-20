-- Allow users to delete their own consent records (GDPR compliance)
CREATE POLICY "Users can delete own consents"
ON public.legal_consents
FOR DELETE
TO authenticated
USING (user_id = auth.uid());