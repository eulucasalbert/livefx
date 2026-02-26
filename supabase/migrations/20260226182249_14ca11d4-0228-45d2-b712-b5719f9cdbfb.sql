-- Create storage bucket for cover images
INSERT INTO storage.buckets (id, name, public) VALUES ('cover-images', 'cover-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access
CREATE POLICY "Cover images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'cover-images');

-- Admin upload
CREATE POLICY "Admins can upload cover images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'cover-images' AND public.has_role(auth.uid(), 'admin'));

-- Admin update
CREATE POLICY "Admins can update cover images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'cover-images' AND public.has_role(auth.uid(), 'admin'));

-- Admin delete
CREATE POLICY "Admins can delete cover images"
ON storage.objects FOR DELETE
USING (bucket_id = 'cover-images' AND public.has_role(auth.uid(), 'admin'));