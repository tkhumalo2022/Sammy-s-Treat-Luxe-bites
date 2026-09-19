-- Sensitive Luxe Bites RPCs are called only from trusted Next.js server routes.
-- Public menu/settings RPCs intentionally remain public read-only helpers.

revoke execute on function public.activate_luxe_bites_manager(text, text)
  from public, anon, authenticated;
grant execute on function public.activate_luxe_bites_manager(text, text)
  to service_role;

revoke execute on function public.get_luxe_bites_dashboard(text)
  from public, anon, authenticated;
grant execute on function public.get_luxe_bites_dashboard(text)
  to service_role;

revoke execute on function public.login_luxe_bites_manager(text, text)
  from public, anon, authenticated;
grant execute on function public.login_luxe_bites_manager(text, text)
  to service_role;

revoke execute on function public.logout_luxe_bites_manager(text)
  from public, anon, authenticated;
grant execute on function public.logout_luxe_bites_manager(text)
  to service_role;

revoke execute on function public.submit_luxe_bites_order(
  text, text, text, text, text, text, text, date, text, text
) from public, anon, authenticated;
grant execute on function public.submit_luxe_bites_order(
  text, text, text, text, text, text, text, date, text, text
) to service_role;

revoke execute on function public.submit_luxe_bites_order(
  text, text, text, text, text, text, text, date, text, text,
  jsonb, integer, numeric, numeric, numeric
) from public, anon, authenticated;
grant execute on function public.submit_luxe_bites_order(
  text, text, text, text, text, text, text, date, text, text,
  jsonb, integer, numeric, numeric, numeric
) to service_role;

revoke execute on function public.update_luxe_bites_order_management(
  text, uuid, text, text, numeric, boolean, text
) from public, anon, authenticated;
grant execute on function public.update_luxe_bites_order_management(
  text, uuid, text, text, numeric, boolean, text
) to service_role;

revoke execute on function public.update_luxe_bites_order_status(text, uuid, text)
  from public, anon, authenticated;
grant execute on function public.update_luxe_bites_order_status(text, uuid, text)
  to service_role;

revoke execute on function public.update_luxe_bites_product(
  text, uuid, text, text, numeric, boolean, boolean, integer
) from public, anon, authenticated;
grant execute on function public.update_luxe_bites_product(
  text, uuid, text, text, numeric, boolean, boolean, integer
) to service_role;

revoke execute on function public.update_luxe_bites_settings(
  text, text, text, text, integer, integer, numeric, boolean
) from public, anon, authenticated;
grant execute on function public.update_luxe_bites_settings(
  text, text, text, text, integer, integer, numeric, boolean
) to service_role;
