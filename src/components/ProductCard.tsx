import { useRef, useState } from "react";
import LiveOverlay from "./LiveOverlay";
import { Download, ShoppingCart, Loader2, Pencil, Trash2, Play, Pause } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

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
    cover_image_url?: string;
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
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, formatPrice } = useLanguage();

  const isSoldOut = product.stock !== undefined && product.stock !== -1 && product.stock <= 0;
  const hasCoverImage = !!product.cover_image_url;

  const toPlayableUrl = (url?: string) => {
    if (!url) return "";
    const trimmed = url.trim();
    if (!trimmed) return "";
    if (trimmed.includes("uc?export=download")) return trimmed;
    const driveMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch) return `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
    const openMatch = trimmed.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
    if (openMatch) return `https://drive.google.com/uc?export=download&id=${openMatch[1]}`;
    return trimmed;
  };

  const videoSrc = toPlayableUrl(product.preview_video_url);
  const hasVideo = !!videoSrc;

  const handlePlayToggle = () => {
    if (!hasVideo) return;
    if (playing) {
      const video = videoRef.current;
      if (video) { video.pause(); video.muted = true; }
      setPlaying(false);
    } else {
      setPlaying(true);
    }
  };

  const handleVideoEnded = () => setPlaying(false);

  const handleDownload = async () => {
    toast({ title: t("toast.download_prep"), description: t("toast.download_prep_desc") });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/secure-download?productId=${product.id}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || "Download failed"); }
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
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
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
      <div
        className="relative aspect-[9/16] w-full overflow-hidden rounded-2xl cursor-pointer"
        style={{ background: 'transparent' }}
        onClick={handlePlayToggle}
      >
        {playing && hasVideo ? (
          <>
            <video
              ref={videoRef}
              src={videoSrc}
              autoPlay loop playsInline
              // @ts-ignore
              webkit-playsinline=""
              controls={false} preload="auto"
              onEnded={handleVideoEnded}
              className="block w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '16px', display: 'block', background: 'transparent' }}
            />
            <LiveOverlay />
            <div className="absolute inset-0 z-10 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <div className="w-12 h-12 rounded-full bg-primary/80 backdrop-blur-md flex items-center justify-center shadow-lg shadow-primary/30">
                <Pause className="w-5 h-5 text-primary-foreground" />
              </div>
            </div>
          </>
        ) : hasCoverImage ? (
          <>
            <img
              src={product.cover_image_url}
              alt={product.name}
              className="block w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '16px', display: 'block' }}
            />
            <LiveOverlay />
            {hasVideo && (
              <div className="absolute inset-0 z-10 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-primary/80 backdrop-blur-md flex items-center justify-center shadow-lg shadow-primary/30">
                  <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-primary/20 via-black to-secondary/20">
            <div className="w-16 h-16 rounded-full bg-primary/30 backdrop-blur-sm flex items-center justify-center mb-3 border border-primary/40">
              <Play className="w-7 h-7 text-primary-foreground ml-0.5" />
            </div>
            <span className="text-[10px] text-muted-foreground font-display uppercase tracking-wider">{t("card.preview")}</span>
          </div>
        )}

        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[10px] font-display font-bold uppercase tracking-widest bg-primary/80 text-primary-foreground backdrop-blur-md z-20">
          {product.category}
        </span>

        {isAdmin && (
          <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
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

        {isSoldOut && (
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center rounded-xl z-20">
            <span className="font-display font-black text-lg text-destructive uppercase tracking-widest">{t("card.sold_out")}</span>
          </div>
        )}
      </div>

      <div className="p-4 space-y-3">
        <h3 className="font-display font-bold text-foreground text-sm truncate">
          {product.name}
        </h3>
        <div className="flex items-center justify-between">
          <span className="text-neon-cyan font-display font-extrabold text-lg neon-text-cyan">
            {formatPrice(product.price)}
          </span>
          {purchased ? (
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-secondary text-secondary-foreground font-display font-bold text-xs uppercase tracking-wider neon-glow-cyan hover:brightness-110 transition-all duration-200"
            >
              <Download className="w-3.5 h-3.5" />
              {t("card.download")}
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
              {isSoldOut ? t("card.sold_out") : loading ? "..." : t("card.buy")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
