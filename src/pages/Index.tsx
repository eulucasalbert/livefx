import { useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Sparkles, LogIn, LogOut, Settings, Plus, Loader2 } from "lucide-react";
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
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Category } from "@/data/products";

const CATEGORIES = ["TAP", "X2", "X3", "GLOVE", "HEART-ME"];

interface ProductForm {
  name: string;
  price: string;
  category: string;
  description: string;
  preview_video_url: string;
  download_file_url: string;
  google_drive_file_id: string;
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
  stock: "-1",
  cover_time: "0",
};

const Index = () => {
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

  useEffect(() => {
    const purchaseStatus = searchParams.get("purchase");
    if (purchaseStatus) {
      if (purchaseStatus === "success") {
        toast({ title: "Compra realizada!", description: "Seu efeito estará disponível em instantes." });
      } else if (purchaseStatus === "failure") {
        toast({ title: "Pagamento não aprovado", description: "Tente novamente.", variant: "destructive" });
      } else if (purchaseStatus === "pending") {
        toast({ title: "Pagamento pendente", description: "Aguardando confirmação do pagamento." });
      }
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

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
      stock: String(product.stock ?? -1),
      cover_time: String(product.cover_time ?? 0),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.price || !form.category) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    if (!form.google_drive_file_id && !form.preview_video_url) {
      toast({ title: "Adicione um Google Drive File ID ou URL de vídeo preview", variant: "destructive" });
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

      // If google_drive_file_id is set, sync the preview video from Drive to Storage
      if (form.google_drive_file_id && productId) {
        toast({ title: "⏳ Sincronizando vídeo do Drive..." });
        const { data: { session } } = await supabase.auth.getSession();
        const projId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const syncRes = await fetch(
          `https://${projId}.supabase.co/functions/v1/sync-preview-video`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session?.access_token}`,
            },
            body: JSON.stringify({ googleDriveFileId: form.google_drive_file_id, productId }),
          }
        );
        const syncData = await syncRes.json();
        if (!syncRes.ok) throw new Error(syncData.error || "Falha ao sincronizar vídeo");
      }

      toast({ title: editingId ? "✅ Efeito atualizado!" : "✅ Efeito criado!" });
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["products"] });
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
        <div className="container max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-6 h-6 text-primary neon-text-pink" />
              <h1 className="font-display font-black text-xl tracking-tight">
                <span className="text-foreground">LIVE</span>
                <span className="neon-gradient-text-pink-cyan">FX</span>
              </h1>
            </div>
            {user ? (
              <div className="flex items-center gap-4">
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Admin
                  </Link>
                )}
                <button
                  onClick={signOut}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sair
                </button>
              </div>
            ) : (
              <Link
                to="/auth"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-display font-semibold text-foreground bg-muted/50 hover:bg-muted/80 transition-all"
              >
                <LogIn className="w-4 h-4" />
                Entrar
              </Link>
            )}
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
      <section ref={productsRef} className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="font-display font-black text-3xl sm:text-4xl neon-gradient-text mb-4">
              Todos os Efeitos
            </h2>
            <p className="text-muted-foreground font-body text-lg mb-10">
              Explore nossa coleção completa de efeitos visuais
            </p>
          </div>

          <div className="mb-10">
            <CategoryTabs active={activeCategory} onChange={setActiveCategory} showDownloads={!!user} />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              <p className="font-display font-semibold">Carregando efeitos...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
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
                  ? "Você ainda não comprou nenhum efeito"
                  : "Nenhum efeito nesta categoria"}
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
            © 2025 LiveFX. Todos os direitos reservados.
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
                />
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
                placeholder="ID do arquivo .webm no Google Drive"
                className="bg-muted/30 border-border/30 rounded-xl"
              />
              <p className="text-[10px] text-muted-foreground">
                Cole o ID do link de compartilhamento do Google Drive (entre /d/ e /view)
              </p>
            </div>

            {/* Preview Video URL (optional fallback) */}
            <div className="space-y-1.5">
              <Label className="font-display text-xs uppercase tracking-wider text-muted-foreground">Preview Video URL (opcional)</Label>
              <Input
                value={form.preview_video_url}
                onChange={(e) => setForm({ ...form, preview_video_url: e.target.value })}
                placeholder="Preenchido automaticamente pelo Drive"
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
    </div>
  );
};

export default Index;
