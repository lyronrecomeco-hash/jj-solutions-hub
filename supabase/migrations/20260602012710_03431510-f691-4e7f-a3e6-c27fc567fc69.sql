REVOKE ALL ON FUNCTION public.notification_enabled(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notification_enabled(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.notification_enabled(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.notification_enabled(uuid, text) TO service_role;

REVOKE ALL ON FUNCTION public.notify_new_signup() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_new_signup() FROM anon;
REVOKE ALL ON FUNCTION public.notify_ticket_changes() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_ticket_changes() FROM anon;
REVOKE ALL ON FUNCTION public.notify_new_message() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_new_message() FROM anon;

GRANT EXECUTE ON FUNCTION public.notify_new_signup() TO service_role;
GRANT EXECUTE ON FUNCTION public.notify_ticket_changes() TO service_role;
GRANT EXECUTE ON FUNCTION public.notify_new_message() TO service_role;