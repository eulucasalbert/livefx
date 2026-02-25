
ALTER TABLE public.purchases
  DROP CONSTRAINT purchases_product_id_fkey,
  ADD CONSTRAINT purchases_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
