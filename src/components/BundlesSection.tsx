import { Package, Zap, ShoppingCart, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBundles } from "@/hooks/useBundles";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useState, useRef, useCallback } from "react";
import LiveOverlay from "@/components/LiveOverlay";

const colorMap: Record<string, { colorClass: string; textGlow: string; glowClass: string }> = {
  cyan: { colorClass: "text-neon-cyan", textGlow: "neon-text-cyan", glowClass: "neon-glow-cyan" },
  pink: { colorClass: "text-neon-pink", textGlow: "neon-text-pink", glowClass: "neon-glow-pink" },
  purple: { colorClass: "text-neon-purple", textGlow: "neon-text-purple", glowClass: "neon-glow-purple" },
};

interface EffectSliderProps {
  products: Array<{ product_id: string; products: { name: string; preview_video_url: string; preview_video_url_mp4?: string; price: number; category: string } | null }>;
}

const EffectSlider = ({ products }: EffectSliderProps) => {
  const [current, setCurrent] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const validProducts = products.filter((bp) => bp.products?.preview_video_url);

  const goTo = useCallback((index: number) => {
    setCurrent(index);
  }, []);

  const prev = () => goTo(current === 0 ? validProducts.length - 1 : current - 1);
  const next = () => goTo(current === validProducts.length - 1 ? 0 : current + 1);

  if (validProducts.length === 0) return null;

  const activeProduct = validProducts[current]?.products;

  return (
    <div className="w-full mb-5">
      <div className="relative aspect-[9/16] max-h-[220px] w-full rounded-2xl overflow-hidden bg-muted/20">
        <video
          ref={videoRef}
          key={activeProduct?.preview_video_url}
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover"
        >
          <source src={activeProduct?.preview_video_url} type="video/webm" />
          {activeProduct?.preview_video_url_mp4 && (
            <source src={activeProduct.preview_video_url_mp4} type="video/mp4" />
          )}
        </video>
        <LiveOverlay />

        {/* Navigation arrows */}
        {validProducts.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); prev(); }}
              className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-background/60 backdrop-blur-sm flex items-center justify-center hover:bg-background/80 transition-colors z-10"
            >
              <ChevronLeft className="w-4 h-4 text-foreground" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); next(); }}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-background/60 backdrop-blur-sm flex items-center justify-center hover:bg-background/80 transition-colors z-10"
            >
              <ChevronRight className="w-4 h-4 text-foreground" />
            </button>
          </>
        )}

        {/* Product name overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/80 to-transparent p-3 pt-8">
          <p className="text-xs font-display font-bold text-foreground truncate">{activeProduct?.name}</p>
        </div>
      </div>

      {/* Dots */}
      {validProducts.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-2.5">
          {validProducts.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                i === current ? "bg-primary w-4" : "bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const BundlesSection = () => {
  const { data: bundles, isLoading } = useBundles();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loadingBundle, setLoadingBundle] = useState<string | null>(null);

  const handleBuyBundle = async (bundleId: string) => {
    if (!user) { navigate("/auth"); return; }

    setLoadingBundle(bundleId);
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
          body: JSON.stringify({ bundleId }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout failed");

      window.location.href = data.init_point;
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoadingBundle(null);
    }
  };

  if (isLoading || !bundles?.length) return null;

  return (
    <section className="py-20 px-4 relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-neon-purple/4 blur-[200px] pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full glass-card-strong mb-5">
            <Package className="w-4 h-4 text-neon-cyan" />
            <span className="text-sm font-body text-muted-foreground tracking-wide">Economize com combos</span>
          </div>
          <h2 className="font-display font-black text-3xl sm:text-4xl neon-gradient-text-pink-cyan mb-4">
            Combos de Efeitos
          </h2>
          <p className="text-muted-foreground font-body text-lg">
            Combine efeitos e pague menos
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {bundles.map((bundle) => {
            const colors = colorMap[bundle.color_theme] || colorMap.cyan;
            const isBundleLoading = loadingBundle === bundle.id;
            return (
              <div
                key={bundle.id}
                className={`relative glass-card-strong rounded-3xl p-8 flex flex-col items-center text-center transition-all duration-300 hover:scale-[1.03] ${
                  bundle.popular ? "border-primary/40 animate-glow-pulse" : "gradient-border"
                }`}
              >
                {bundle.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-5 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-display font-bold uppercase tracking-widest neon-glow-pink">
                    Mais Popular
                  </div>
                )}

                {/* Effects slider */}
                {bundle.bundle_products && bundle.bundle_products.length > 0 && (
                  <EffectSlider products={bundle.bundle_products} />
                )}

                <h3 className="font-display font-bold text-xl text-foreground mb-2">
                  {bundle.name}
                </h3>
                <p className="text-sm text-muted-foreground font-body mb-3">
                  {bundle.effects}
                </p>

                {/* Show linked product names */}
                {bundle.bundle_products && bundle.bundle_products.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-1.5 mb-5">
                    {bundle.bundle_products.map((bp: any) => (
                      <Badge key={bp.product_id} variant="secondary" className="text-[10px] font-body">
                        {bp.products?.name || "Efeito"}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex items-baseline gap-2.5 mb-2">
                  <span className="text-sm text-muted-foreground line-through">
                    R${Number(bundle.original_price).toFixed(2)}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-neon-green/10 text-neon-green text-xs font-display font-bold">
                    -{bundle.discount}%
                  </span>
                </div>
                <span className={`font-display font-black text-4xl ${colors.colorClass} ${colors.textGlow} mb-7`}>
                  R${Number(bundle.price).toFixed(2)}
                </span>

                <Button
                  className={`w-full font-display font-bold uppercase tracking-widest rounded-xl py-6 gap-2 ${
                    bundle.popular ? "neon-glow-pink" : ""
                  }`}
                  variant={bundle.popular ? "default" : "outline"}
                  onClick={() => handleBuyBundle(bundle.id)}
                  disabled={isBundleLoading}
                >
                  {isBundleLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShoppingCart className="w-4 h-4" />
                  )}
                  {isBundleLoading ? "Processando..." : "Comprar Combo"}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default BundlesSection;
