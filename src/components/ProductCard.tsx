import { useRef, useState, useEffect } from "react";
import LiveOverlay from "./LiveOverlay";
import { Download, ShoppingCart, Loader2, Pencil, Trash2, Play } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    price: number;
    preview_video_url: string;
    download_file_url: string;
    category: string;
    stock?: number;
    description?: string;
    google_drive_file_id?: string;
    cover_time?: number;
    preview_video_url_mp4?: string;
    google_drive_file_id_mp4?: string;
  };
  purchased?: boolean;
  isAdmin?: boolean;
  onEdit?: (product: any) => void;
  onDelete?: (product: any) => void;
}

const ProductCard = ({ product, purchased, isAdmin, onEdit, onDelete }: ProductCardProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [coverReady, setCoverReady] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const isSoldOut = product.stock !== undefined && product.stock !== -1 && product.stock <= 0;
  const coverTime = product.cover_time ?? 0;

  // Convert any Google Drive URL format to a direct playable URL
  const toPlayableUrl = (url?: string) => {
    if (!url) return "";
    const trimmed = url.trim();
    if (!trimmed) return "";
    // Already a direct download link
    if (trimmed.includes("uc?export=download")) return trimmed;
    // Google Drive sharing link: https://drive.google.com/file/d/FILE_ID/view?usp=sharing
    const driveMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch) return `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
    // Google Drive open link: https://drive.google.com/open?id=FILE_ID
    const openMatch = trimmed.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
    if (openMatch) return `https://drive.google.com/uc?export=download&id=${openMatch[1]}`;
    // Not a Drive link, return as-is (Supabase Storage URL, etc.)
    return trimmed;
  };

  const videoSrc = toPlayableUrl(product.preview_video_url);
  const hasVideo = !!videoSrc;

  // Set video to cover_time frame when loaded
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoaded = () => {
      video.currentTime = coverTime;
    };

    const handleSeeked = () => {
      setCoverReady(true);
    };

    // Fallback: if seeked never fires (Firefox), show after timeout
    const fallbackTimer = setTimeout(() => {
      if (!coverReady) setCoverReady(true);
    }, 2000);

    video.addEventListener("loadedmetadata", handleLoaded);
    video.addEventListener("loadeddata", handleLoaded);
    video.addEventListener("seeked", handleSeeked);
    return () => {
      clearTimeout(fallbackTimer);
      video.removeEventListener("loadedmetadata", handleLoaded);
      video.removeEventListener("loadeddata", handleLoaded);
      video.removeEventListener("seeked", handleSeeked);
    };
  }, [coverTime, coverReady]);

  const handlePlayToggle = () => {
    const video = videoRef.current;
    if (!video || videoError || !hasVideo) return;

    if (playing) {
      video.muted = true;
      setPlaying(false);
    } else {
      video.muted = false;
      setPlaying(true);
    }
  };

  const handleVideoEnded = () => {
    // With loop+autoplay this shouldn't fire, but just in case
    setPlaying(false);
  };

  const handleDownload = async () => {
    toast({ title: "Preparando download", description: "Seu download inicia em alguns segundos..." });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/secure-download?productId=${product.id}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Download failed");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const contentDisposition = res.headers.get("Content-Disposition") || "";
      const fileNameMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
      a.download = fileNameMatch?.[1] || product.name;

      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      if (product.download_file_url && product.download_file_url !== "#") {
        window.open(product.download_file_url, "_blank");
      } else {
        toast({ title: "Erro no download", description: err.message, variant: "destructive" });
      }
    }
  };

  const handleBuy = async () => {
    if (!user) { navigate("/auth"); return; }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/create-checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ productId: product.id }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout failed");

      window.location.href = data.init_point;
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="group relative rounded-2xl overflow-hidden glass-card card-hover p-2.5 pb-0">
      {/* Video preview */}
      <div
        className="relative aspect-[9/16] w-full overflow-hidden rounded-2xl cursor-pointer"
        style={{ position: 'relative', overflow: 'hidden', borderRadius: '16px', background: 'transparent' }}
        onClick={handlePlayToggle}
      >
        {videoError || !hasVideo ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-primary/20 via-black to-secondary/20">
            <div className="w-16 h-16 rounded-full bg-primary/30 backdrop-blur-sm flex items-center justify-center mb-3 border border-primary/40">
              <Play className="w-7 h-7 text-primary-foreground ml-0.5" />
            </div>
            <span className="text-[10px] text-muted-foreground font-display uppercase tracking-wider">Preview indisponível</span>
          </div>
        ) : (
          <video
            ref={videoRef}
            src={videoSrc}
            autoPlay
            loop
            muted
            playsInline
            // @ts-ignore
            webkit-playsinline=""
            controls={false}
            preload="auto"
            onEnded={handleVideoEnded}
            onError={() => setVideoError(true)}
            className="block w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '16px', display: 'block', background: 'transparent' }}
          />
        )}

        {coverReady && <LiveOverlay />}

        {/* Play button overlay (when not playing) */}
        {!playing && coverReady && (
          <div className="absolute inset-0 z-10">
            <div
              className="absolute w-12 h-12 rounded-full bg-primary/80 backdrop-blur-md flex items-center justify-center shadow-lg shadow-primary/30"
              style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', position: 'absolute', zIndex: 10 }}
            >
              <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
            </div>
          </div>
        )}

        {/* Category badge */}
        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[10px] font-display font-bold uppercase tracking-widest bg-primary/80 text-primary-foreground backdrop-blur-md">
          {product.category}
        </span>

        {/* Admin action buttons */}
        {isAdmin && (
          <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit?.(product); }}
              className="w-8 h-8 rounded-lg bg-background/80 backdrop-blur-md border border-border/30 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 transition-all"
              title="Editar"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete?.(product); }}
              className="w-8 h-8 rounded-lg bg-background/80 backdrop-blur-md border border-border/30 flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-all"
              title="Excluir"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Sold out overlay */}
        {isSoldOut && (
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center rounded-xl">
            <span className="font-display font-black text-lg text-destructive uppercase tracking-widest">Esgotado</span>
          </div>
        )}
        {/* Overlay gradient - only at bottom for text readability */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-background/60 to-transparent opacity-40 group-hover:opacity-60 transition-opacity duration-300 pointer-events-none rounded-b-xl" />
      </div>

      {/* Info */}
      <div className="p-4 space-y-3">
        <h3 className="font-display font-bold text-foreground text-sm truncate">
          {product.name}
        </h3>
        <div className="flex items-center justify-between">
          <span className="text-neon-cyan font-display font-extrabold text-lg neon-text-cyan">
            R${Number(product.price).toFixed(2)}
          </span>
          {purchased ? (
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-secondary text-secondary-foreground font-display font-bold text-xs uppercase tracking-wider neon-glow-cyan hover:brightness-110 transition-all duration-200"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </button>
          ) : (
            <button
              onClick={handleBuy}
              disabled={loading || isSoldOut}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground font-display font-bold text-xs uppercase tracking-wider neon-glow-pink hover:brightness-110 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ShoppingCart className="w-3.5 h-3.5" />
              )}
              {isSoldOut ? "Esgotado" : loading ? "..." : "Comprar"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
