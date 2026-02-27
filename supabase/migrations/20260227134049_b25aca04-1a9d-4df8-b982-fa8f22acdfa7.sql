-- Allow admins to read all purchases
CREATE POLICY "Admins can read all purchases"
ON public.purchases
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));