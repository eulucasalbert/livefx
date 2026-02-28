import { useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Sparkles, LogIn, LogOut, Settings, Plus, Loader2, Download, CheckCircle, Volume2, Monitor, Tv, ShoppingCart, User as UserIcon } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import CartSheet from "@/components/CartSheet";
import CategoryTabs from "@/components/CategoryTabs";
import ProductCard from "@/components/ProductCard";
import HeroSection from "@/components/HeroSection";
import CategoryCardsSection from "@/components/CategoryCardsSection";
import MostUsedSection from "@/components/MostUsedSection";
import BundlesSection from "@/components/BundlesSection";
import SocialProofSection from "@/components/SocialProofSection";
import { useProducts, usePurchases } from "@/hooks/useProducts";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Category } from "@/types/category";

const CATEGORIES = ["TAP", "X2", "X3", "GLOVE", "HEART-ME", "OUTROS"];

interface ProductForm {
  name: string;
  price: string;
  category: string;
  description: string;
  preview_video_url: string;
  download_file_url: string;
  google_drive_file_id: string;
  google_drive_file_id_mp4: string;
  stock: string;
  cover_time: string;
}

const emptyForm: ProductForm = {
  name: "",
  price: "",
  category: "",
  description: "",
  preview_video_url: "",
  download_file_url: "#",
  google_drive_file_id: "",
  google_drive_file_id_mp4: "",
  stock: "-1",
  cover_time: "0",
};

const Index = () => {
  const { t, formatPrice, setShowPicker, language } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<Category>("ALL");
  const { data: products = [], isLoading } = useProducts();
  const { data: purchasedIds = [] } = usePurchases();
  const { user, signOut } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const [searchParams, setSearchParams] = useSearchParams();
  const productsRef = useRef<HTMLDivElement>(null);
  const coverVideoRef = useRef<HTMLVideoElement>(null);
  const queryClient = useQueryClient();

  // CRUD state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showInstructionsDialog, setShowInstructionsDialog] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const { itemCount } = useCart();

  useEffect(() => {
    const purchaseStatus = searchParams.get("purchase");
    const paypalToken = searchParams.get("token");

    if (!purchaseStatus) return;

    // Clear search params first to prevent re-triggering on re-render
    // but use a ref to track that we already handled this
    const handlePurchaseReturn = async () => {
      // Remove params immediately to prevent double-execution
      setSearchParams({}, { replace: true });

      if (purchaseStatus === "success") {
        if (paypalToken) {
          // PayPal flow: capture the order
          try {
            const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
            console.log("Capturing PayPal order:", paypalToken);
            const res = await fetch(`https://${projectId}.supabase.co/functions/v1/paypal-webhook`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderId: paypalToken }),
            });
            const data = await res.json();
            console.log("PayPal capture result:", data);
            if (res.ok && (data.status === "completed" || data.status === "already_captured")) {
              toast({ title: t("toast.purchase_success"), description: t("toast.purchase_success_desc") });
              setShowInstructionsDialog(true);
            } else {
              toast({ title: t("toast.purchase_pending"), description: t("toast.purchase_pending_desc") });
            }
          } catch (err) {
            console.error("PayPal capture error:", err);
            toast({ title: t("toast.purchase_success"), description: t("toast.purchase_success_desc") });
            setShowInstructionsDialog(true);
          }
        } else {
          toast({ title: t("toast.purchase_success"), description: t("toast.purchase_success_desc") });
          setShowInstructionsDialog(true);
        }
        queryClient.invalidateQueries({ queryKey: ["purchases"] });
      } else if (purchaseStatus === "failure") {
        toast({ title: t("toast.purchase_fail"), description: t("toast.purchase_fail_desc"), variant: "destructive" });
      } else if (purchaseStatus === "pending") {
        toast({ title: t("toast.purchase_pending"), description: t("toast.purchase_pending_desc") });
      }
    };

    handlePurchaseReturn();
  }, []);

  const scrollToProducts = () => {
    productsRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleCategorySelect = (cat: Category) => {
    setActiveCategory(cat);
    scrollToProducts();
  };

  const filtered =
    activeCategory === "ALL"
      ? products
      : activeCategory === "DOWNLOADS"
        ? products.filter((p: any) => purchasedIds.includes(p.id))
        : products.filter((p: any) => p.category === activeCategory);

  // Admin CRUD handlers
  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (product: any) => {
    setEditingId(product.id);
    setForm({
      name: product.name,
      price: String(product.price),
      category: product.category,
      description: product.description || "",
      preview_video_url: product.preview_video_url,
      download_file_url: product.download_file_url || "#",
      google_drive_file_id: product.google_drive_file_id || "",
      google_drive_file_id_mp4: product.google_drive_file_id_mp4 || "",
      stock: String(product.stock ?? -1),
      cover_time: String(product.cover_time ?? 0),
    });
    setDialogOpen(true);
  };

  // Detect if a URL is a Google Drive link and extract the file ID
  const extractDriveId = (url: string): string | null => {
    const match = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
    const openMatch = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
    if (openMatch) return openMatch[1];
    return null;
  };

  // Capture the current frame from the cover video as a PNG blob
  const captureCoverFrame = (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const video = coverVideoRef.current;
      if (!video || video.readyState < 2) { resolve(null); return; }
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 360;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(null); return; }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => resolve(blob), "image/png");
    });
  };

  const handleSave = async () => {
    if (!form.name || !form.price || !form.category) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    if (!form.preview_video_url) {
      toast({ title: "Adicione a URL do vídeo de preview", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        price: parseFloat(form.price),
        category: form.category,
        description: form.description,
        preview_video_url: form.preview_video_url || "pending",
        download_file_url: form.download_file_url || "#",
        google_drive_file_id: form.google_drive_file_id || "",
        stock: parseInt(form.stock) || -1,
        cover_time: parseFloat(form.cover_time) || 0,
      };

      let productId = editingId;

      if (editingId) {
        const { error } = await supabase.from("products").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("products").insert(payload).select("id").single();
        if (error) throw error;
        productId = data.id;
      }

      // Capture and upload cover frame image
      const frameBlob = await captureCoverFrame();
      if (frameBlob && productId) {
        toast({ title: "⏳ Salvando capa..." });
        const filePath = `${productId}.png`;
        const { error: uploadError } = await supabase.storage
          .from("cover-images")
          .upload(filePath, frameBlob, { upsert: true, contentType: "image/png" });
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from("cover-images").getPublicUrl(filePath);
        const coverUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;
        await supabase.from("products").update({ cover_image_url: coverUrl }).eq("id", productId);
      }

      toast({ title: editingId ? "✅ Efeito atualizado!" : "✅ Efeito criado!" });
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["products"] });

      // Fire-and-forget: sync Drive videos in background (don't block save)
      const driveIdFromPreview = extractDriveId(form.preview_video_url);
      const syncMp4Id = form.google_drive_file_id_mp4;
      if ((driveIdFromPreview || syncMp4Id) && productId) {
        toast({ title: "⏳ Sincronizando vídeos do Drive em segundo plano..." });
        (async () => {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            const projId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
            const headers = {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session?.access_token}`,
            };
            const syncUrl = `https://${projId}.supabase.co/functions/v1/sync-preview-video`;

            if (driveIdFromPreview) {
              const res = await fetch(syncUrl, {
                method: "POST", headers,
                body: JSON.stringify({ googleDriveFileId: driveIdFromPreview, productId, format: "webm" }),
              });
              if (!res.ok) {
                let errMsg = "Falha ao sincronizar preview WebM";
                try { const d = await res.json(); errMsg = d.error || errMsg; } catch {}
                throw new Error(errMsg);
              }
            }

            if (syncMp4Id) {
              const res = await fetch(syncUrl, {
                method: "POST", headers,
                body: JSON.stringify({ googleDriveFileId: syncMp4Id, productId, format: "mp4" }),
              });
              if (!res.ok) {
                let errMsg = "Falha ao sincronizar vídeo MP4";
                try { const d = await res.json(); errMsg = d.error || errMsg; } catch {}
                throw new Error(errMsg);
              }
            }

            toast({ title: "✅ Vídeos sincronizados com sucesso!" });
            queryClient.invalidateQueries({ queryKey: ["products"] });
          } catch (err: any) {
            console.error("Background sync error:", err);
            toast({ title: "Erro na sincronização", description: err.message, variant: "destructive" });
          }
        })();
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from("products").delete().eq("id", deleteTarget.id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "🗑️ Efeito excluído" });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    }
    setDeleting(false);
    setDeleteTarget(null);
  };

  return (
    <div className="min-h-screen bg-[#0F0F12]">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/30 bg-[#0F0F12]/70 backdrop-blur-2xl">
        <div className="container max-w-6xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-6 h-6 text-primary neon-text-pink" />
              <h1 className="font-display font-black text-xl tracking-tight">
                <span className="text-foreground">LIVE</span>
                <span className="neon-gradient-text-pink-cyan">FX</span>
              </h1>
            </div>
            <div className="flex items-center gap-3">
              {/* Language switcher */}
              <button
                onClick={() => setShowPicker(true)}
                className="text-lg hover:scale-110 transition-transform"
                title="Change language"
              >
                {language === "pt" ? "🇧🇷" : language === "es" ? "🇪🇸" : "🇺🇸"}
              </button>
              {/* Cart button */}
              <button
                onClick={() => setCartOpen(true)}
                className="relative flex items-center justify-center w-9 h-9 rounded-xl hover:bg-muted/50 transition-all"
                title={t("cart.title")}
              >
                <ShoppingCart className="w-5 h-5 text-muted-foreground" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-display font-bold flex items-center justify-center neon-glow-pink">
                    {itemCount}
                  </span>
                )}
              </button>
              {user ? (
                <div className="flex items-center gap-2 sm:gap-3">
                  {/* User name/email */}
                  <div className="flex items-center gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-muted/30 border border-border/20">
                    <UserIcon className="w-3.5 h-3.5 text-neon-cyan shrink-0" />
                    <span className="text-xs sm:text-sm font-display font-semibold text-foreground truncate max-w-[80px] sm:max-w-[150px]">
                      {user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "User"}
                    </span>
                  </div>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      <span className="hidden sm:inline">Admin</span>
                    </Link>
                  )}
                  <button
                    onClick={signOut}
                    className="flex items-center gap-1 sm:gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">{t("header.exit")}</span>
                  </button>
                </div>
              ) : (
                <Link
                  to="/auth"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-display font-semibold text-foreground bg-muted/50 hover:bg-muted/80 transition-all"
                >
                  <LogIn className="w-4 h-4" />
                  {t("header.enter")}
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <HeroSection onExplore={scrollToProducts} />

      {/* Social Proof Stats */}
      <SocialProofSection />

      {/* Category Cards */}
      <CategoryCardsSection onSelect={handleCategorySelect} />

      {/* Most Used */}
      <MostUsedSection products={products} purchasedIds={purchasedIds} isAdmin={!!isAdmin} onEdit={openEdit} onDelete={(p) => setDeleteTarget({ id: p.id, name: p.name })} />

      {/* Bundles */}
      <BundlesSection />

      {/* All Products */}
      <section ref={productsRef} className="py-12 sm:py-20 px-3 sm:px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="font-display font-black text-3xl sm:text-4xl neon-gradient-text mb-4">
              {t("products.title")}
            </h2>
            <p className="text-muted-foreground font-body text-lg mb-4">
              {t("products.subtitle")}
            </p>
            <p className="text-sm text-muted-foreground/70 font-body flex items-center justify-center gap-2 mb-10">
              <Download className="w-4 h-4 text-neon-cyan shrink-0" />
              {t("products.download_info")}
            </p>
          </div>

          <div className="mb-10">
            <CategoryTabs active={activeCategory} onChange={setActiveCategory} showDownloads={!!user} />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              <p className="font-display font-semibold">{t("products.loading")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-5">
              {filtered.map((product: any) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  purchased={purchasedIds.includes(product.id)}
                  isAdmin={!!isAdmin}
                  onEdit={openEdit}
                  onDelete={(p) => setDeleteTarget({ id: p.id, name: p.name })}
                />
              ))}
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Sparkles className="w-10 h-10 mb-3 opacity-40" />
              <p className="font-display font-semibold">
                {activeCategory === "DOWNLOADS"
                  ? t("products.empty_downloads")
                  : t("products.empty")}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 py-10 px-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="font-display font-bold">
              <span className="text-foreground">LIVE</span>
              <span className="neon-gradient-text-pink-cyan">FX</span>
            </span>
          </div>
          <p className="text-sm text-muted-foreground font-body">
            {t("footer.rights")}
          </p>
        </div>
      </footer>

      {/* ── Floating "+ New Effect" button (admin only) ── */}
      {isAdmin && (
        <button
          onClick={openNew}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-110 hover:shadow-primary/50 transition-all duration-200 neon-glow-pink"
          title="Novo Efeito"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* ── Create/Edit Modal ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto glass-card-strong border-border/30">
          <DialogHeader>
            <DialogTitle className="font-display text-xl neon-gradient-text-pink-cyan">
              {editingId ? "Editar Efeito" : "Novo Efeito"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* Name */}
            <div className="space-y-1.5">
              <Label className="font-display text-xs uppercase tracking-wider text-muted-foreground">Nome *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Neon Glow Tap"
                className="bg-muted/30 border-border/30 rounded-xl"
              />
            </div>

            {/* Category + Price + Stock */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="font-display text-xs uppercase tracking-wider text-muted-foreground">Categoria *</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger className="bg-muted/30 border-border/30 rounded-xl">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="font-display text-xs uppercase tracking-wider text-muted-foreground">Preço (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="29.90"
                  className="bg-muted/30 border-border/30 rounded-xl"
                  disabled={form.price === "0" && form.stock !== ""}
                />
                <label className="flex items-center gap-2 cursor-pointer mt-1">
                  <input
                    type="checkbox"
                    checked={form.price === "0"}
                    onChange={(e) => setForm({ ...form, price: e.target.checked ? "0" : "" })}
                    className="w-4 h-4 rounded border-border/30 accent-green-500"
                  />
                  <span className="text-[11px] font-display font-bold text-green-400 uppercase tracking-wider">Grátis</span>
                </label>
              </div>
              <div className="space-y-1.5">
                <Label className="font-display text-xs uppercase tracking-wider text-muted-foreground">Estoque</Label>
                <Input
                  type="number"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  className="bg-muted/30 border-border/30 rounded-xl"
                  placeholder="-1 = ilimitado"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="font-display text-xs uppercase tracking-wider text-muted-foreground">Descrição</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Descrição do efeito..."
                className="bg-muted/30 border-border/30 rounded-xl resize-none"
                rows={2}
              />
            </div>

            {/* Google Drive File ID */}
            <div className="space-y-1.5">
              <Label className="font-display text-xs uppercase tracking-wider text-muted-foreground">Google Drive File ID *</Label>
              <Input
                value={form.google_drive_file_id}
                onChange={(e) => setForm({ ...form, google_drive_file_id: e.target.value })}
                placeholder="ID do arquivo de download (pós-pagamento)"
                className="bg-muted/30 border-border/30 rounded-xl"
              />
              <p className="text-[10px] text-muted-foreground">
                Este ID é do arquivo entregue ao cliente após pagamento confirmado.
              </p>
            </div>

            {/* Preview Video URL */}
            <div className="space-y-1.5">
              <Label className="font-display text-xs uppercase tracking-wider text-muted-foreground">Preview Video URL *</Label>
              <Input
                value={form.preview_video_url}
                onChange={(e) => setForm({ ...form, preview_video_url: e.target.value })}
                placeholder="Cole aqui o link do vídeo de preview"
                className="bg-muted/30 border-border/30 rounded-xl"
              />
            </div>

            {/* Cover Time Picker */}
            {form.preview_video_url && form.preview_video_url !== "pending" && (
              <div className="space-y-1.5">
                <Label className="font-display text-xs uppercase tracking-wider text-muted-foreground">
                  Capa do Vídeo (segundo: {Number(form.cover_time).toFixed(1)}s)
                </Label>
                <div className="rounded-xl overflow-hidden bg-black aspect-video max-h-[200px] relative">
                  <video
                    ref={coverVideoRef}
                    src={form.preview_video_url}
                    crossOrigin="anonymous"
                    muted
                    playsInline
                    preload="auto"
                    className="w-full h-full object-contain"
                    onLoadedData={() => {
                      if (coverVideoRef.current) {
                        coverVideoRef.current.currentTime = parseFloat(form.cover_time) || 0;
                      }
                    }}
                  />
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="0.1"
                  value={form.cover_time}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm((prev) => ({ ...prev, cover_time: val }));
                    if (coverVideoRef.current) {
                      coverVideoRef.current.currentTime = parseFloat(val);
                    }
                  }}
                  className="w-full accent-primary"
                />
                <p className="text-[10px] text-muted-foreground">
                  Arraste para escolher o frame de capa do vídeo
                </p>
              </div>
            )}

            {/* Save Button */}
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full gap-2 neon-glow-pink font-display font-bold uppercase tracking-wider rounded-xl mt-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {saving ? "Salvando..." : editingId ? "Salvar Alterações" : "Criar Efeito"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="glass-card-strong border-border/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Excluir efeito?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>"{deleteTarget?.name}"</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl gap-2"
            >
              {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Purchase Success Instructions Dialog ── */}
      <Dialog open={showInstructionsDialog} onOpenChange={setShowInstructionsDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto glass-card-strong border-border/30">
          <DialogHeader>
            <DialogTitle className="font-display text-xl neon-gradient-text-pink-cyan flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-400" />
              {t("dialog.purchase_title")}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              {t("dialog.purchase_subtitle")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 mt-2">
            {/* OBS Studio Instructions */}
            <div className="space-y-2">
              <h3 className="font-display font-bold text-sm flex items-center gap-2 text-foreground">
                <Monitor className="w-4 h-4 text-neon-cyan" />
                {t("dialog.obs_title")}
              </h3>
              <ol className="space-y-1.5 text-sm text-muted-foreground ml-6 list-decimal">
                <li>{t("dialog.obs_step1")}</li>
                <li>{t("dialog.obs_step2")}</li>
                <li>{t("dialog.obs_step3")}</li>
                <li>{t("dialog.obs_step4")}</li>
                <li>{t("dialog.obs_step5")}</li>
                <li>{t("dialog.obs_step6")}</li>
                <li>{t("dialog.obs_step7")}</li>
                <li>{t("dialog.obs_step8")}</li>
                <li>{t("dialog.obs_step9")}</li>
              </ol>
            </div>

            {/* Audio Configuration */}
            <div className="space-y-2">
              <h3 className="font-display font-bold text-sm flex items-center gap-2 text-foreground">
                <Volume2 className="w-4 h-4 text-neon-pink" />
                {t("dialog.audio_title")}
              </h3>
              <ol className="space-y-1.5 text-sm text-muted-foreground ml-6 list-decimal">
                <li>{t("dialog.audio_step1")}</li>
                <li>{t("dialog.audio_step2")}</li>
                <li>{t("dialog.audio_step3")}</li>
                <li>{t("dialog.audio_step4")}</li>
                <li>{t("dialog.audio_step5")}</li>
              </ol>
            </div>

            {/* TikTok Studio Instructions */}
            <div className="space-y-2">
              <h3 className="font-display font-bold text-sm flex items-center gap-2 text-foreground">
                <Tv className="w-4 h-4 text-neon-cyan" />
                {t("dialog.tiktok_title")}
              </h3>
              <ol className="space-y-1.5 text-sm text-muted-foreground ml-6 list-decimal">
                <li>{t("dialog.tiktok_step1")}</li>
                <li>{t("dialog.tiktok_step2")}</li>
                <li>{t("dialog.tiktok_step3")}</li>
                <li>{t("dialog.tiktok_step4")}</li>
                <li>{t("dialog.tiktok_step5")}</li>
                <li>{t("dialog.tiktok_step6")}</li>
              </ol>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                onClick={() => {
                  setShowInstructionsDialog(false);
                  setActiveCategory("DOWNLOADS");
                  scrollToProducts();
                }}
                className="flex-1 gap-2 neon-glow-cyan font-display font-bold uppercase tracking-wider rounded-xl"
              >
                <Download className="w-4 h-4" />
                {t("dialog.go_downloads")}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowInstructionsDialog(false)}
                className="flex-1 font-display font-bold uppercase tracking-wider rounded-xl border-border/30"
              >
                {t("dialog.close")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cart Sheet */}
      <CartSheet open={cartOpen} onOpenChange={setCartOpen} />
    </div>
  );
};

export default Index;
