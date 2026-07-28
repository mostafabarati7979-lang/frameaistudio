
CREATE POLICY "quotes customer respond sent" ON public.quotes
FOR UPDATE TO authenticated
USING (
  status = 'sent'::quote_status
  AND EXISTS (SELECT 1 FROM public.orders o WHERE o.id = quotes.order_id AND o.customer_id = auth.uid())
)
WITH CHECK (
  status IN ('approved'::quote_status, 'rejected'::quote_status, 'revision_requested'::quote_status, 'expired'::quote_status)
  AND EXISTS (SELECT 1 FROM public.orders o WHERE o.id = quotes.order_id AND o.customer_id = auth.uid())
);

CREATE POLICY "orders update own after quote" ON public.orders
FOR UPDATE TO authenticated
USING (
  auth.uid() = customer_id
  AND status = 'quoted'::order_status
)
WITH CHECK (
  auth.uid() = customer_id
  AND status IN ('contract_pending'::order_status, 'submitted'::order_status, 'quoted'::order_status)
);
