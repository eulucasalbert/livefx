
-- Junction table linking bundles to products
CREATE TABLE public.bundle_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bundle_id UUID NOT NULL REFERENCES public.bundles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(bundle_id, product_id)
);

-- Enable RLS
ALTER TABLE public.bundle_products ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Bundle products are publicly readable"
  ON public.bundle_products FOR SELECT
  USING (true);

-- Admin manage
CREATE POLICY "Admins can insert bundle products"
  ON public.bundle_products FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete bundle products"
  ON public.bundle_products FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));
