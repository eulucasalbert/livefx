
-- Add google_drive_file_id column to products
ALTER TABLE public.products ADD COLUMN google_drive_file_id text NOT NULL DEFAULT '';

-- Create stock decrement function for purchase webhook
CREATE OR REPLACE FUNCTION public.decrement_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status <> 'completed' THEN
    UPDATE public.products
    SET stock = stock - 1
    WHERE id = NEW.product_id
      AND stock > 0;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_decrement_stock
AFTER UPDATE ON public.purchases
FOR EACH ROW
EXECUTE FUNCTION public.decrement_stock();

-- Also allow authenticated users to read their own role (needed for client-side admin check)
CREATE POLICY "Users can read own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
