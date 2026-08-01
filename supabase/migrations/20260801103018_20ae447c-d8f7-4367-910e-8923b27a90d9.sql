-- Restore Data API grants (all were revoked, breaking every read/write)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_files TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contracts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_milestones TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_deliverables TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_items TO authenticated;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.audit_log TO authenticated;

GRANT SELECT ON public.content_items TO anon;
GRANT SELECT ON public.reviews TO anon;

GRANT ALL ON public.orders TO service_role;
GRANT ALL ON public.order_files TO service_role;
GRANT ALL ON public.order_messages TO service_role;
GRANT ALL ON public.quotes TO service_role;
GRANT ALL ON public.quote_items TO service_role;
GRANT ALL ON public.contracts TO service_role;
GRANT ALL ON public.payments TO service_role;
GRANT ALL ON public.project_milestones TO service_role;
GRANT ALL ON public.project_deliverables TO service_role;
GRANT ALL ON public.notifications TO service_role;
GRANT ALL ON public.reviews TO service_role;
GRANT ALL ON public.content_items TO service_role;
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.user_roles TO service_role;
GRANT ALL ON public.audit_log TO service_role;
GRANT ALL ON public.otp_codes TO service_role;
GRANT ALL ON public.rate_limits TO service_role;
GRANT ALL ON public.login_attempts TO service_role;