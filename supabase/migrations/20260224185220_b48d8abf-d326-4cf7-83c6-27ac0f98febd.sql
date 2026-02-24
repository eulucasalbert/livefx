
-- Products table (public read)
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  preview_video_url TEXT NOT NULL,
  download_file_url TEXT NOT NULL DEFAULT '#',
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Products are publicly readable"
ON public.products FOR SELECT
USING (true);

-- Purchases table (user-scoped)
CREATE TABLE public.purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id),
  stripe_session_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own purchases"
ON public.purchases FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own purchases"
ON public.purchases FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can update purchases"
ON public.purchases FOR UPDATE
USING (true);

-- Seed products from static data
INSERT INTO public.products (name, price, preview_video_url, download_file_url, description, category) VALUES
('Neon Burst Tap', 4.99, 'https://cdn.pixabay.com/video/2021/02/25/66348-517637498_large.mp4', '#', 'Explosive neon particle tap effect', 'TAP'),
('Holo Ripple', 3.99, 'https://cdn.pixabay.com/video/2020/07/30/45766-446090508_large.mp4', '#', 'Holographic ripple on every tap', 'TAP'),
('Double Flash X2', 6.99, 'https://cdn.pixabay.com/video/2024/03/29/206145_large.mp4', '#', 'Double flash multiplier effect', 'X2'),
('Cyber Split X2', 5.99, 'https://cdn.pixabay.com/video/2021/11/01/94062-641716506_large.mp4', '#', 'Cyberpunk split screen doubler', 'X2'),
('Triple Storm X3', 9.99, 'https://cdn.pixabay.com/video/2022/03/14/110766-689949818_large.mp4', '#', 'Triple effect storm multiplier', 'X3'),
('Prism Chain X3', 8.99, 'https://cdn.pixabay.com/video/2020/02/07/32079-390556706_large.mp4', '#', 'Prismatic chain reaction triple', 'X3'),
('Laser Glove FX', 7.99, 'https://cdn.pixabay.com/video/2020/05/25/39832-424930080_large.mp4', '#', 'Laser beam glove hand tracker', 'GLOVE'),
('Flame Glove', 6.99, 'https://cdn.pixabay.com/video/2024/08/09/225851_large.mp4', '#', 'Fire trail glove effect', 'GLOVE'),
('Heart Rain', 4.99, 'https://cdn.pixabay.com/video/2020/09/05/49637-458480218_large.mp4', '#', 'Raining hearts overlay', 'HEART-ME'),
('Love Burst', 5.99, 'https://cdn.pixabay.com/video/2021/04/14/71553-539594584_large.mp4', '#', 'Exploding love burst effect', 'HEART-ME'),
('Pixel Tap', 3.49, 'https://cdn.pixabay.com/video/2023/07/28/173543-849767416_large.mp4', '#', 'Retro pixel tap reaction', 'TAP'),
('Glitch X2', 7.49, 'https://cdn.pixabay.com/video/2022/12/23/143994-783601528_large.mp4', '#', 'Glitch doubler effect', 'X2');
