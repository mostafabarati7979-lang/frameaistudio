-- 1) Customer must be able to respond to a sent contract (code does this as the user).
DROP POLICY IF EXISTS "contracts customer respond sent" ON public.contracts;
CREATE POLICY "contracts customer respond sent"
ON public.contracts FOR UPDATE TO authenticated
USING (
  status = 'sent'::contract_status
  AND EXISTS (SELECT 1 FROM public.orders o WHERE o.id = contracts.order_id AND o.customer_id = auth.uid())
)
WITH CHECK (
  status IN ('approved'::contract_status, 'rejected'::contract_status)
  AND EXISTS (SELECT 1 FROM public.orders o WHERE o.id = contracts.order_id AND o.customer_id = auth.uid())
);

-- 2) Order status transition after the customer decides on the contract.
DROP POLICY IF EXISTS "orders update own after contract" ON public.orders;
CREATE POLICY "orders update own after contract"
ON public.orders FOR UPDATE TO authenticated
USING (auth.uid() = customer_id AND status = 'contract_pending'::order_status)
WITH CHECK (
  auth.uid() = customer_id
  AND status IN ('contract_approved'::order_status, 'quoted'::order_status, 'contract_pending'::order_status)
);

-- 3) Grant hygiene: match privileges to the policies that exist.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- Public (guest) read surface only.
GRANT SELECT ON public.content_items TO anon;
GRANT SELECT ON public.reviews TO anon;

-- Signed-in app surface (RLS still scopes every row).
GRANT SELECT ON public.content_items TO authenticated;
GRANT SELECT ON public.audit_log TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.order_files TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.order_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contracts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_milestones TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_deliverables TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.content_items TO authenticated;

-- otp_codes, rate_limits, login_attempts stay server-only (service_role).
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- 4) Internal helper does not need client EXECUTE.
REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM PUBLIC, anon, authenticated;