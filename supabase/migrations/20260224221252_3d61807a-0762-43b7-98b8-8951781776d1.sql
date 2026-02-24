
-- Allow service role to update purchase status (webhook uses service role key)
-- Add policy for updates on purchases table
CREATE POLICY "Service role can update purchases"
ON public.purchases
FOR UPDATE
USING (true)
WITH CHECK (true);
