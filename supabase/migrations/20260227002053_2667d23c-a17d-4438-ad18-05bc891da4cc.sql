
-- Create coupons table
CREATE TABLE public.coupons (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  discount_percent integer NOT NULL DEFAULT 0,
  used boolean NOT NULL DEFAULT false,
  used_by uuid REFERENCES auth.users(id),
  used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Admins can manage coupons
CREATE POLICY "Admins can read coupons" ON public.coupons FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert coupons" ON public.coupons FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update coupons" ON public.coupons FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete coupons" ON public.coupons FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Authenticated users can validate coupons (read unused ones by code)
CREATE POLICY "Users can read unused coupons by code" ON public.coupons FOR SELECT USING (auth.uid() IS NOT NULL AND used = false);
