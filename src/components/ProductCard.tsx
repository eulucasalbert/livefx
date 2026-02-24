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

      // Open Mercado Pago outside iframe when possible
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
      className="group relative rounded-xl overflow-hidden bg-card border border-border card-hover"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="relative aspect-[9/16] max-h-[280px] overflow-hidden bg-background">
        <video
          ref={videoRef}
          src={product.preview_video_url}
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
        />
        <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-display font-bold uppercase tracking-widest bg-primary/80 text-primary-foreground backdrop-blur-sm">
          {product.category}
        </span>
      </div>

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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground font-display font-bold text-xs uppercase tracking-wider neon-glow-cyan hover:brightness-110 transition-all duration-200"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </button>
          ) : (
            <button
              onClick={handleBuy}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-display font-bold text-xs uppercase tracking-wider neon-glow-pink hover:brightness-110 transition-all duration-200 disabled:opacity-50"
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
