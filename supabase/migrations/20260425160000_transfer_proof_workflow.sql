-- Migration: 20260425160000_transfer_proof_workflow.sql
-- Description: Adds transfer proof fields to purchase_requests.

ALTER TABLE purchase_requests 
ADD COLUMN IF NOT EXISTS transfer_proof_url TEXT,
ADD COLUMN IF NOT EXISTS transfer_proof_name TEXT,
ADD COLUMN IF NOT EXISTS transfer_proof_uploaded_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS transfer_proof_status TEXT CHECK (transfer_proof_status IN ('pending', 'accepted', 'rejected')),
ADD COLUMN IF NOT EXISTS transfer_accepted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS transfer_accepted_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS transfer_rejection_reason TEXT;
