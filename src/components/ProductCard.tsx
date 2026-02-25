import { useRef, useState } from "react";
import { Download, ShoppingCart, Loader2 } from "lucide-react";
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
  };
  purchased?: boolean;
}

const ProductCard = ({ product, purchased }: ProductCardProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hovering, setHovering] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleMouseEnter = () => {
    setHovering(true);
    videoRef.current?.play();
  };

  const handleMouseLeave = () => {
    setHovering(false);
    videoRef.current?.pause();
    if (videoRef.current) videoRef.current.currentTime = 0;
  };

  const handleDownload = () => {
    if (product.download_file_url && product.download_file_url !== "#") {
      window.open(product.download_file_url, "_blank");
    } else {
      toast({ title: "Em breve", description: "Download disponível em breve." });
    }
  };

  const handleBuy = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

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
    <div
      className="group relative rounded-2xl overflow-hidden glass-card card-hover"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Video preview */}
      <div className="relative aspect-[9/16] max-h-[280px] overflow-hidden bg-background/50">
        <video
          ref={videoRef}
          src={product.preview_video_url}
          loop
          muted
          playsInline
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {/* Category badge */}
        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[10px] font-display font-bold uppercase tracking-widest bg-primary/80 text-primary-foreground backdrop-blur-md">
          {product.category}
        </span>
        {/* Overlay gradient on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F12] via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300" />
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
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground font-display font-bold text-xs uppercase tracking-wider neon-glow-pink hover:brightness-110 transition-all duration-200 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ShoppingCart className="w-3.5 h-3.5" />
              )}
              {loading ? "..." : "Comprar"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
