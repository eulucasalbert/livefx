
CREATE TABLE public.bundles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  effects TEXT NOT NULL DEFAULT '',
  original_price NUMERIC NOT NULL DEFAULT 0,
  price NUMERIC NOT NULL DEFAULT 0,
  discount INTEGER NOT NULL DEFAULT 0,
  color_theme TEXT NOT NULL DEFAULT 'cyan',
  popular BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bundles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bundles are publicly readable"
  ON public.bundles FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert bundles"
  ON public.bundles FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update bundles"
  ON public.bundles FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete bundles"
  ON public.bundles FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed initial data
INSERT INTO public.bundles (name, effects, original_price, price, discount, color_theme, popular, sort_order) VALUES
  ('Starter Pack', '3 efeitos TAP', 12.97, 9.99, 23, 'cyan', false, 1),
  ('Pro Bundle', '5 efeitos + 1 Glove', 32.95, 24.99, 24, 'pink', true, 2),
  ('Ultimate Pack', 'Todos os efeitos', 69.90, 49.99, 28, 'purple', false, 3);
