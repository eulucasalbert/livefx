-- Add MP4 preview URL column for mobile/Safari fallback
ALTER TABLE public.products ADD COLUMN preview_video_url_mp4 TEXT NOT NULL DEFAULT '';