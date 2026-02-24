
-- Fix: drop overly permissive update policy, purchases will only be updated by service role (edge functions bypass RLS)
DROP POLICY "Service role can update purchases" ON public.purchases;
