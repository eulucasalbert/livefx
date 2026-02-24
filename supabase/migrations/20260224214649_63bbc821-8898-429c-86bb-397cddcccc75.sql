
-- Add unique constraint for upsert on purchases
ALTER TABLE public.purchases ADD CONSTRAINT purchases_user_product_unique UNIQUE (user_id, product_id);
