
CREATE OR REPLACE FUNCTION public.next_quote_version(_order_id uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(MAX(version), 0) + 1 FROM public.quotes WHERE order_id = _order_id
$function$;

CREATE OR REPLACE FUNCTION public.next_contract_version(_order_id uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(MAX(version),0) + 1 FROM public.contracts WHERE order_id = _order_id
$function$;
