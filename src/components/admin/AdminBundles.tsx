import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2, Package, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface BundleForm {
  name: string;
  effects: string;
  original_price: string;
  price: string;
  discount: string;
  color_theme: string;
  popular: boolean;
  sort_order: string;
  selectedProductIds: string[];
}

const emptyForm: BundleForm = {
  name: "",
  effects: "",
  original_price: "",
  price: "",
  discount: "",
  color_theme: "cyan",
  popular: false,
  sort_order: "0",
  selectedProductIds: [],
};

const AdminBundles = () => {
  const queryClient = useQueryClient();
  const [bundles, setBundles] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [bundleProducts, setBundleProducts] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BundleForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const [bundlesRes, productsRes, bpRes] = await Promise.all([
      supabase.from("bundles").select("*").order("sort_order"),
      supabase.from("products").select("id, name, price, category").order("name"),
      supabase.from("bundle_products").select("bundle_id, product_id"),
    ]);
    setBundles(bundlesRes.data || []);
    setProducts(productsRes.data || []);

    // Group by bundle_id
    const grouped: Record<string, string[]> = {};
    (bpRes.data || []).forEach((bp: any) => {
      if (!grouped[bp.bundle_id]) grouped[bp.bundle_id] = [];
      grouped[bp.bundle_id].push(bp.product_id);
    });
    setBundleProducts(grouped);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openNew = () => {
    setEditingId(null);
    setForm({ ...emptyForm, sort_order: String((bundles.length + 1)) });
    setDialogOpen(true);
  };

  const openEdit = (b: any) => {
    setEditingId(b.id);
    setForm({
      name: b.name,
      effects: b.effects || "",
      original_price: String(b.original_price),
      price: String(b.price),
      discount: String(b.discount),
      color_theme: b.color_theme || "cyan",
      popular: b.popular || false,
      sort_order: String(b.sort_order ?? 0),
      selectedProductIds: bundleProducts[b.id] || [],
    });
    setDialogOpen(true);
  };

  const toggleProduct = (productId: string) => {
    setForm((prev) => {
      const selected = prev.selectedProductIds.includes(productId)
        ? prev.selectedProductIds.filter((id) => id !== productId)
        : [...prev.selectedProductIds, productId];
      
      // Auto-calculate original_price from selected products
      const totalOriginal = products
        .filter((p) => selected.includes(p.id))
        .reduce((sum, p) => sum + Number(p.price), 0);
      
      const currentPrice = parseFloat(prev.price) || 0;
      const discountPct = totalOriginal > 0 && currentPrice > 0
        ? Math.round((1 - currentPrice / totalOriginal) * 100)
        : parseInt(prev.discount) || 0;

      return {
        ...prev,
        selectedProductIds: selected,
        original_price: totalOriginal.toFixed(2),
        discount: String(discountPct),
      };
    });
  };

  const handleSave = async () => {
    if (!form.name || !form.price) {
      toast({ title: "Preencha nome e preço", variant: "destructive" });
      return;
    }
    if (form.selectedProductIds.length === 0) {
      toast({ title: "Selecione ao menos um efeito para o combo", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        effects: form.effects,
        original_price: parseFloat(form.original_price) || 0,
        price: parseFloat(form.price) || 0,
        discount: parseInt(form.discount) || 0,
        color_theme: form.color_theme,
        popular: form.popular,
        sort_order: parseInt(form.sort_order) || 0,
      };

      let bundleId = editingId;

      if (editingId) {
        const { error } = await supabase.from("bundles").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("bundles").insert(payload).select("id").single();
        if (error) throw error;
        bundleId = data.id;
      }

      // Sync bundle_products: delete all, then re-insert
      if (bundleId) {
        await supabase.from("bundle_products").delete().eq("bundle_id", bundleId);
        if (form.selectedProductIds.length > 0) {
          const rows = form.selectedProductIds.map((pid) => ({
            bundle_id: bundleId!,
            product_id: pid,
          }));
          const { error: bpError } = await supabase.from("bundle_products").insert(rows);
          if (bpError) throw bpError;
        }
      }

      toast({ title: editingId ? "✅ Combo atualizado!" : "✅ Combo criado!" });
      setDialogOpen(false);
      fetchData();
      queryClient.invalidateQueries({ queryKey: ["bundles"] });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Excluir combo "${name}"?`)) return;
    setDeleting(id);
    const { error } = await supabase.from("bundles").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "🗑️ Combo excluído" });
      fetchData();
      queryClient.invalidateQueries({ queryKey: ["bundles"] });
    }
    setDeleting(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-black text-2xl sm:text-3xl neon-gradient-text-pink-cyan">Combos / Bundles</h1>
          <p className="text-muted-foreground font-body mt-1 text-sm">
            {bundles.length} combo{bundles.length !== 1 ? "s" : ""} cadastrado{bundles.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={openNew} className="gap-2 neon-glow-pink font-display font-bold uppercase tracking-wider rounded-xl w-full sm:w-auto">
          <Plus className="w-4 h-4" />
          Novo Combo
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground font-body">Carregando combos…</span>
        </div>
      ) : bundles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 glass-card-strong rounded-2xl gradient-border">
          <Package className="w-12 h-12 text-muted-foreground/50" />
          <p className="text-muted-foreground font-body text-center">Nenhum combo cadastrado ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {bundles.map((b) => {
            const linkedProducts = (bundleProducts[b.id] || [])
              .map((pid) => products.find((p) => p.id === pid))
              .filter(Boolean);
            return (
              <div key={b.id} className="glass-card-strong rounded-2xl p-5 gradient-border space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className={`w-5 h-5 ${b.color_theme === 'pink' ? 'text-neon-pink' : b.color_theme === 'purple' ? 'text-neon-purple' : 'text-neon-cyan'}`} />
                    <h3 className="font-display font-bold text-foreground">{b.name}</h3>
                  </div>
                  {b.popular && <Badge className="bg-primary/20 text-primary border-0 text-[10px] font-display">Popular</Badge>}
                </div>
                <p className="text-sm text-muted-foreground font-body">{b.effects}</p>
                
                {/* Linked products */}
                {linkedProducts.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-display">Efeitos incluídos:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {linkedProducts.map((p: any) => (
                        <Badge key={p.id} variant="secondary" className="text-[10px] font-body">
                          {p.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-baseline gap-2">
                  <span className="text-sm text-muted-foreground line-through">R${Number(b.original_price).toFixed(2)}</span>
                  <span className="font-display font-bold text-neon-cyan">R${Number(b.price).toFixed(2)}</span>
                  <Badge className="bg-neon-green/10 text-neon-green border-0 text-[10px] font-display">-{b.discount}%</Badge>
                </div>
                <div className="flex gap-2 pt-2 border-t border-border/20">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(b)} className="flex-1 gap-1.5 text-xs hover:bg-primary/10 hover:text-primary">
                    <Pencil className="w-3.5 h-3.5" /> Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(b.id, b.name)}
                    disabled={deleting === b.id}
                    className="flex-1 gap-1.5 text-xs text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
                  >
                    {deleting === b.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    Excluir
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass-card-strong border-border/30 sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-lg">
              {editingId ? "Editar Combo" : "Novo Combo"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="font-display text-xs uppercase tracking-wider text-muted-foreground">Nome *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Starter Pack" className="mt-1.5" />
            </div>
            <div>
              <Label className="font-display text-xs uppercase tracking-wider text-muted-foreground">Descrição</Label>
              <Input value={form.effects} onChange={(e) => setForm({ ...form, effects: e.target.value })} placeholder="Ex: 3 efeitos TOP para lives" className="mt-1.5" />
            </div>

            {/* Product selector */}
            <div>
              <Label className="font-display text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
                Efeitos do combo * ({form.selectedProductIds.length} selecionado{form.selectedProductIds.length !== 1 ? "s" : ""})
              </Label>
              <div className="max-h-48 overflow-y-auto space-y-1 rounded-xl bg-muted/20 p-3 border border-border/20">
                {products.map((p) => (
                  <label
                    key={p.id}
                    className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={form.selectedProductIds.includes(p.id)}
                      onCheckedChange={() => toggleProduct(p.id)}
                    />
                    <span className="text-sm font-body text-foreground flex-1">{p.name}</span>
                    <span className="text-xs text-muted-foreground font-mono">R${Number(p.price).toFixed(2)}</span>
                    <Badge variant="secondary" className="text-[9px]">{p.category}</Badge>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="font-display text-xs uppercase tracking-wider text-muted-foreground">Preço original (auto)</Label>
                <Input type="number" step="0.01" value={form.original_price} readOnly className="mt-1.5 opacity-60" />
              </div>
              <div>
                <Label className="font-display text-xs uppercase tracking-wider text-muted-foreground">Preço do combo (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => {
                    const newPrice = parseFloat(e.target.value) || 0;
                    const orig = parseFloat(form.original_price) || 0;
                    const disc = orig > 0 ? Math.round((1 - newPrice / orig) * 100) : 0;
                    setForm({ ...form, price: e.target.value, discount: String(disc) });
                  }}
                  className="mt-1.5"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="font-display text-xs uppercase tracking-wider text-muted-foreground">Desconto (auto)</Label>
                <Input type="number" value={form.discount} readOnly className="mt-1.5 opacity-60" />
              </div>
              <div>
                <Label className="font-display text-xs uppercase tracking-wider text-muted-foreground">Ordem</Label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} className="mt-1.5" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 items-end">
              <div>
                <Label className="font-display text-xs uppercase tracking-wider text-muted-foreground">Cor do tema</Label>
                <Select value={form.color_theme} onValueChange={(v) => setForm({ ...form, color_theme: v })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cyan">Ciano</SelectItem>
                    <SelectItem value="pink">Rosa</SelectItem>
                    <SelectItem value="purple">Roxo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3 pb-2">
                <Switch checked={form.popular} onCheckedChange={(v) => setForm({ ...form, popular: v })} />
                <Label className="font-display text-xs uppercase tracking-wider text-muted-foreground">Popular</Label>
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full gap-2 neon-glow-pink font-display font-bold uppercase tracking-wider rounded-xl">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {editingId ? "Salvar Combo" : "Criar Combo"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminBundles;
