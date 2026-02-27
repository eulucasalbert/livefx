import { useRef, useState } from "react";
import LiveOverlay from "./LiveOverlay";
import { Download, ShoppingCart, Loader2, Pencil, Trash2, Play, Pause, Tag, X } from "lucide-react";
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
  const [couponInput, setCouponInput] = useState("");
  const [showCoupon, setShowCoupon] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, formatPrice, language: _lang } = useLanguage();

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

  const downloadInstructions = () => {
    const instructions = `═══════════════════════════════════════════
   COMO USAR O EFEITO - LIVEFX
═══════════════════════════════════════════

▶ OBS STUDIO
───────────────────────────────────────────
1. Abra o OBS Studio
2. Na cena desejada, clique em "+" em Fontes
3. Selecione "Fonte de Mídia"
4. Clique em "Criar nova" e dê um nome
5. Em "Arquivo local", selecione o arquivo baixado
6. Marque "Loop" para repetir o efeito
7. Ajuste a resolução para 1080x1920 (vertical):
   - Clique com botão direito na fonte
   - Vá em Transformar > Editar Transformação
   - Defina Tamanho: 1080 x 1920
8. O arquivo já vem compactado para rodar sem travar!

▶ TIKTOK STUDIO (StreamLabs)
───────────────────────────────────────────
1. Abra o TikTok Studio / StreamLabs
2. Adicione uma nova fonte de "Vídeo"
3. Selecione o arquivo baixado
4. Personalize a resolução para 1080x1920 (vertical):
   - Vá em Configurações de Vídeo
   - Resolução Base: 1080x1920
   - Resolução de Saída: 1080x1920
5. Posicione o efeito sobre sua câmera
6. Ative "Loop" para manter o efeito ativo

═══════════════════════════════════════════
  Dúvidas? Entre em contato pelo site!
═══════════════════════════════════════════
`;
    const blob = new Blob([instructions], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Como Usar - ${product.name}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
      setTimeout(() => downloadInstructions(), 1000);
    } catch (err: any) {
      if (product.download_file_url && product.download_file_url !== "#") {
        window.open(product.download_file_url, "_blank");
      } else {
        toast({ title: "Erro no download", description: err.message, variant: "destructive" });
      }
    }
  };

  const { language } = useLanguage();
  const usePayPal = language === "en" || language === "es";

  const handleBuy = async () => {
    if (!user) { navigate("/auth"); return; }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const endpoint = usePayPal ? "create-checkout-paypal" : "create-checkout";
      const bodyPayload: any = { productId: product.id };
      if (couponInput.trim()) bodyPayload.couponCode = couponInput.trim();
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/${endpoint}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify(bodyPayload),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout failed");
      window.location.href = usePayPal ? data.approve_url : data.init_point;
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="group relative rounded-2xl overflow-hidden glass-card card-hover p-2 sm:p-2.5 pb-0">
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
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/80 backdrop-blur-md flex items-center justify-center shadow-lg shadow-primary/30">
                <Pause className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
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
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/80 backdrop-blur-md flex items-center justify-center shadow-lg shadow-primary/30">
                  <Play className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground ml-0.5" />
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-primary/20 via-black to-secondary/20">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary/30 backdrop-blur-sm flex items-center justify-center mb-3 border border-primary/40">
              <Play className="w-6 h-6 sm:w-7 sm:h-7 text-primary-foreground ml-0.5" />
            </div>
            <span className="text-[10px] text-muted-foreground font-display uppercase tracking-wider">{t("card.preview")}</span>
          </div>
        )}

        <span className="absolute top-10 left-2 sm:top-12 sm:left-3 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[9px] sm:text-[10px] font-display font-bold uppercase tracking-widest bg-primary/80 text-primary-foreground backdrop-blur-md z-20">
          {product.category}
        </span>

        {isAdmin && (
          <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit?.(product); }}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-background/80 backdrop-blur-md border border-border/30 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 transition-all"
              title="Editar"
            >
              <Pencil className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete?.(product); }}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-background/80 backdrop-blur-md border border-border/30 flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-all"
              title="Excluir"
            >
              <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </button>
          </div>
        )}

        {isSoldOut && (
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center rounded-xl z-20">
            <span className="font-display font-black text-base sm:text-lg text-destructive uppercase tracking-widest">{t("card.sold_out")}</span>
          </div>
        )}
      </div>

      <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
        <h3 className="font-display font-bold text-foreground text-xs sm:text-sm truncate">
          {product.name}
        </h3>
        <div className="flex items-center justify-between gap-2">
          <span className="text-neon-cyan font-display font-extrabold text-base sm:text-lg neon-text-cyan">
            {formatPrice(product.price)}
          </span>
          {purchased ? (
            <button
              onClick={handleDownload}
              className="flex items-center gap-1 sm:gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-secondary text-secondary-foreground font-display font-bold text-[10px] sm:text-xs uppercase tracking-wider neon-glow-cyan hover:brightness-110 transition-all duration-200"
            >
              <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              {t("card.download")}
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowCoupon(!showCoupon)}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                title="Cupom"
              >
                <Tag className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </button>
              <button
                onClick={handleBuy}
                disabled={loading || isSoldOut}
                className="flex items-center gap-1 px-2 py-1 sm:px-3.5 sm:py-2 rounded-xl bg-primary text-primary-foreground font-display font-bold text-[9px] sm:text-xs uppercase tracking-wider neon-glow-pink hover:brightness-110 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {loading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <ShoppingCart className="w-3 h-3" />
                )}
                <span className="hidden xs:inline">{isSoldOut ? t("card.sold_out") : loading ? "..." : t("card.buy")}</span>
                <span className="xs:hidden">{isSoldOut ? t("card.sold_out") : loading ? "..." : t("card.buy")}</span>
              </button>
            </div>
          )}
        </div>
        {showCoupon && !purchased && (
          <div className="flex items-center gap-2 mt-2">
            <input
              type="text"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
              placeholder="CUPOM"
              className="flex-1 h-7 sm:h-8 px-2 sm:px-2.5 rounded-lg bg-background/50 border border-border/30 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
              maxLength={30}
            />
            {couponInput && (
              <button onClick={() => setCouponInput("")} className="text-muted-foreground hover:text-foreground">
                <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductCard;
