
-- Revoke default public EXECUTE on SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.audit_payments() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_quotes() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_contracts() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_user_roles() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bootstrap_project_milestones(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_order_code() FROM PUBLIC, anon, authenticated;

-- has_role is used inside RLS policies; keep executable by authenticated (RLS evaluation) but drop anon.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- Version helpers are called by admins via authenticated context.
REVOKE EXECUTE ON FUNCTION public.next_quote_version(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.next_contract_version(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.next_quote_version(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_contract_version(uuid) TO authenticated;

-- Admin-only read policies for sensitive fail-closed tables
CREATE POLICY "Admins can view login attempts"
  ON public.login_attempts FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view otp codes"
  ON public.otp_codes FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view rate limits"
  ON public.rate_limits FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
