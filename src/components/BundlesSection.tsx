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
import { useLanguage } from "@/contexts/LanguageContext";

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

  const goTo = useCallback((index: number) => { setCurrent(index); }, []);
  const prev = () => goTo(current === 0 ? validProducts.length - 1 : current - 1);
  const next = () => goTo(current === validProducts.length - 1 ? 0 : current + 1);

  // Force play on mobile
  const handleCanPlay = useCallback(() => {
    const v = videoRef.current;
    if (v) {
      v.play().catch(() => {});
    }
  }, []);

  if (validProducts.length === 0) return null;
  const activeProduct = validProducts[current]?.products;

  return (
    <div className="w-full mb-3">
      <div className="relative aspect-[9/16] max-h-[400px] sm:max-h-[350px] w-full rounded-2xl overflow-hidden bg-card">
        <video
          ref={videoRef}
          key={activeProduct?.preview_video_url}
          autoPlay
          loop
          muted
          playsInline
          onCanPlay={handleCanPlay}
          className="w-full h-full object-cover"
        >
          <source src={activeProduct?.preview_video_url} type="video/webm" />
          {activeProduct?.preview_video_url_mp4 && <source src={activeProduct.preview_video_url_mp4} type="video/mp4" />}
        </video>
        <LiveOverlay />
        {validProducts.length > 1 && (
          <>
            <button onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-background/60 backdrop-blur-sm flex items-center justify-center hover:bg-background/80 transition-colors z-10">
              <ChevronLeft className="w-4 h-4 text-foreground" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-background/60 backdrop-blur-sm flex items-center justify-center hover:bg-background/80 transition-colors z-10">
              <ChevronRight className="w-4 h-4 text-foreground" />
            </button>
          </>
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/80 to-transparent p-3 pt-8">
          <p className="text-xs font-display font-bold text-foreground truncate">{activeProduct?.name}</p>
        </div>
      </div>
      {validProducts.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-2.5">
          {validProducts.map((_, i) => (
            <button key={i} onClick={() => goTo(i)} className={`w-1.5 h-1.5 rounded-full transition-all ${i === current ? "bg-primary w-4" : "bg-muted-foreground/30"}`} />
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
  const { t, formatPrice, language } = useLanguage();
  const usePayPal = language === "en" || language === "es";

  const handleBuyBundle = async (bundleId: string) => {
    if (!user) { navigate("/auth"); return; }
    setLoadingBundle(bundleId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const endpoint = usePayPal ? "create-checkout-paypal" : "create-checkout";
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ bundleId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout failed");
      window.location.href = usePayPal ? data.approve_url : data.init_point;
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
            <span className="text-sm font-body text-muted-foreground tracking-wide">{t("bundles.badge")}</span>
          </div>
          <h2 className="font-display font-black text-3xl sm:text-4xl neon-gradient-text-pink-cyan mb-4">
            {t("bundles.title")}
          </h2>
          <p className="text-muted-foreground font-body text-lg">{t("bundles.subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {bundles.map((bundle) => {
            const colors = colorMap[bundle.color_theme] || colorMap.cyan;
            const isBundleLoading = loadingBundle === bundle.id;
            return (
              <div
                key={bundle.id}
                className={`relative glass-card-strong rounded-3xl p-8 flex flex-col items-center text-center transition-all duration-300 hover:scale-[1.03] ${bundle.popular ? "border-primary/40 animate-glow-pulse" : "gradient-border"}`}
              >
                {bundle.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-5 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-display font-bold uppercase tracking-widest neon-glow-pink">
                    {t("bundles.popular")}
                  </div>
                )}
                {bundle.bundle_products && bundle.bundle_products.length > 0 && <EffectSlider products={bundle.bundle_products} />}
                <h3 className="font-display font-bold text-base text-foreground mb-1">{bundle.name}</h3>
                <p className="text-xs text-muted-foreground font-body mb-2">{bundle.effects}</p>
                {bundle.bundle_products && bundle.bundle_products.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-1 mb-3">
                    {bundle.bundle_products.map((bp: any) => (
                      <Badge key={bp.product_id} variant="secondary" className="text-[10px] font-body">
                        {bp.products?.name || "Efeito"}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-xs text-muted-foreground line-through">
                    {formatPrice(bundle.original_price)}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-neon-green/10 text-neon-green text-[10px] font-display font-bold">
                    -{bundle.discount}%
                  </span>
                </div>
                <span className={`font-display font-black text-3xl ${colors.colorClass} ${colors.textGlow} mb-5`}>
                  {formatPrice(bundle.price)}
                </span>
                <Button
                  className={`w-full font-display font-bold uppercase tracking-widest rounded-xl py-6 gap-2 ${bundle.popular ? "neon-glow-pink" : ""}`}
                  variant={bundle.popular ? "default" : "outline"}
                  onClick={() => handleBuyBundle(bundle.id)}
                  disabled={isBundleLoading}
                >
                  {isBundleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
                  {isBundleLoading ? t("bundles.processing") : t("bundles.buy")}
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
