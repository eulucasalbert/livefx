
-- Add stock column to products
ALTER TABLE public.products ADD COLUMN stock integer NOT NULL DEFAULT -1;
-- -1 means unlimited stock

-- Create storage bucket for preview videos
INSERT INTO storage.buckets (id, name, public) VALUES ('preview-videos', 'preview-videos', true);

-- Allow anyone to read preview videos (they're public)
CREATE POLICY "Preview videos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'preview-videos');

-- Only admins can upload/update/delete preview videos
CREATE POLICY "Admins can upload preview videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'preview-videos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update preview videos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'preview-videos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete preview videos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'preview-videos' AND public.has_role(auth.uid(), 'admin'));
