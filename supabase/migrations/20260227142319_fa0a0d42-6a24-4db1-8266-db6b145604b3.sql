
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Create function to expire old pending purchases
CREATE OR REPLACE FUNCTION public.expire_old_pending_purchases()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE public.purchases
  SET status = 'failed'
  WHERE status = 'pending'
    AND created_at < now() - interval '30 minutes';
$$;

-- Schedule cron job to run every 5 minutes
SELECT cron.schedule(
  'expire-pending-purchases',
  '*/5 * * * *',
  $$SELECT public.expire_old_pending_purchases();$$
);
