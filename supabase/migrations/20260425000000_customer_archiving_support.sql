-- Migration to add customer archiving support to purchase_requests
-- This allows customers to "remove" requests from their list without hard-deleting operational data.

ALTER TABLE public.purchase_requests 
ADD COLUMN IF NOT EXISTS customer_hidden_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.purchase_requests.customer_hidden_at IS 'Timestamp when the customer chose to hide this request from their portal view.';

-- Update the load_purchase_requests logic if it's an RPC, 
-- but usually we filter in the application layer or via RLS.
-- For this project, we'll handle the filtering in the application layer 
-- to ensure backward compatibility with existing internal dashboards.
