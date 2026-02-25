import { useRef, useState, useEffect } from "react";
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
  const { user } = useAuth();
  const navigate = useNavigate();

  const isSoldOut = product.stock !== undefined && product.stock !== -1 && product.stock <= 0;
  const videoSrc = product.preview_video_url;
  const coverTime = product.cover_time ?? 0;

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

    video.addEventListener("loadeddata", handleLoaded);
    video.addEventListener("seeked", handleSeeked);
    return () => {
      video.removeEventListener("loadeddata", handleLoaded);
      video.removeEventListener("seeked", handleSeeked);
    };
  }, [coverTime]);

  const handlePlayToggle = () => {
    const video = videoRef.current;
    if (!video) return;

    if (playing) {
      video.pause();
      video.currentTime = coverTime;
      setPlaying(false);
    } else {
      video.currentTime = 0;
      video.play();
      setPlaying(true);
    }
  };

  const handleVideoEnded = () => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = coverTime;
    }
    setPlaying(false);
  };

  const handleDownload = async () => {
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

    const checkoutWindow = window.open("", "_blank", "noopener,noreferrer");
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

      if (checkoutWindow && !checkoutWindow.closed) {
        checkoutWindow.location.href = data.init_point;
        checkoutWindow.focus();
      } else {
        window.location.href = data.init_point;
      }
    } catch (err: any) {
      if (checkoutWindow && !checkoutWindow.closed) checkoutWindow.close();
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="group relative rounded-2xl overflow-hidden glass-card card-hover">
      {/* Video preview */}
      <div
        className="relative aspect-[9/16] max-h-[280px] overflow-hidden bg-black cursor-pointer"
        onClick={handlePlayToggle}
      >
        <video
          ref={videoRef}
          src={videoSrc}
          loop={false}
          muted
          playsInline
          preload="auto"
          onEnded={handleVideoEnded}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />

        {/* Play button overlay (when not playing) */}
        {!playing && coverReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity duration-200">
            <div className="w-12 h-12 rounded-full bg-primary/80 backdrop-blur-md flex items-center justify-center shadow-lg shadow-primary/30">
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
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center">
            <span className="font-display font-black text-lg text-destructive uppercase tracking-widest">Esgotado</span>
          </div>
        )}
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F12] via-transparent to-transparent opacity-40 group-hover:opacity-60 transition-opacity duration-300 pointer-events-none" />
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
