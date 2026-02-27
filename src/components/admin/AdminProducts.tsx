import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2, Package, Video, Link } from "lucide-react";

const CATEGORIES = ["TAP", "X2", "X3", "GLOVE", "HEART-ME", "OUTROS"];

interface ProductForm {
  name: string;
  price: string;
  category: string;
  description: string;
  google_drive_file_id: string;
  preview_video_url: string;
  stock: string;
}

const emptyForm: ProductForm = {
  name: "",
  price: "",
  category: "",
  description: "",
  google_drive_file_id: "",
  preview_video_url: "",
  stock: "-1",
};

const AdminProducts = () => {
  const queryClient = useQueryClient();

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [dbValues, setDbValues] = useState<{ google_drive_file_id: string; preview_video_url: string } | null>(null);

  const fetchProducts = async () => {
    setLoading(true);
    const { data } = await supabase.from("products").select("*").order("created_at");
    setProducts(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDbValues(null);
    setDialogOpen(true);
  };

  const openEdit = (product: any) => {
    setEditingId(product.id);
    const driveId = product.google_drive_file_id || "";
    const previewUrl = product.preview_video_url || "";
    setDbValues({ google_drive_file_id: driveId, preview_video_url: previewUrl });
    setForm({
      name: product.name,
      price: String(product.price),
      category: product.category,
      description: product.description || "",
      google_drive_file_id: driveId,
      preview_video_url: previewUrl,
      stock: String(product.stock ?? -1),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.price || !form.category) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    if (!form.google_drive_file_id) {
      toast({ title: "Adicione o Google Drive File ID", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        name: form.name,
        price: parseFloat(form.price),
        category: form.category,
        description: form.description,
        google_drive_file_id: form.google_drive_file_id.trim(),
        preview_video_url: form.preview_video_url.trim(),
        stock: parseInt(form.stock) || -1,
      };

      if (editingId) {
        const { data: updated, error } = await supabase.from("products").update(payload).eq("id", editingId).select();
        if (error) throw error;
        if (!updated || updated.length === 0) throw new Error("Nenhum produto foi atualizado. Verifique as permissões.");
        const saved = updated[0];
        const driveOk = saved.google_drive_file_id === payload.google_drive_file_id;
        const previewOk = saved.preview_video_url === payload.preview_video_url;
        if (!driveOk || !previewOk) {
          const problems: string[] = [];
          if (!driveOk) problems.push(`Drive ID: esperado "${payload.google_drive_file_id}" mas salvou "${saved.google_drive_file_id}"`);
          if (!previewOk) problems.push(`Preview: esperado "${payload.preview_video_url}" mas salvou "${saved.preview_video_url}"`);
          toast({ title: "ERRO: valores não foram salvos!", description: problems.join(" | "), variant: "destructive" });
        } else {
          toast({
            title: "Salvo com sucesso!",
            description: `Drive ID: ${saved.google_drive_file_id ? saved.google_drive_file_id.substring(0, 40) + "..." : "(vazio)"} | Preview: ${saved.preview_video_url ? "OK" : "(vazio)"}`,
          });
        }
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
        toast({ title: "Efeito criado com sucesso!" });
      }
      setDialogOpen(false);
      fetchProducts();
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir "${name}"? Esta ação não pode ser desfeita.`)) return;
    setDeleting(id);
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Efeito excluído" });
      fetchProducts();
      queryClient.invalidateQueries({ queryKey: ["products"] });
    }
    setDeleting(null);
  };

  const getStockBadge = (stock: number) => {
    if (stock === -1) return <Badge className="bg-secondary/20 text-secondary border-0 text-[10px] font-display">Ilimitado</Badge>;
    if (stock === 0) return <Badge className="bg-destructive/20 text-destructive border-0 text-[10px] font-display">Esgotado</Badge>;
    return <Badge className="bg-muted/40 text-muted-foreground border-0 text-[10px] font-display">{stock} un.</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-black text-2xl sm:text-3xl neon-gradient-text-pink-cyan">Efeitos</h1>
          <p className="text-muted-foreground font-body mt-1 text-sm">
            {products.length} efeito{products.length !== 1 ? "s" : ""} cadastrado{products.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={openNew} className="gap-2 neon-glow-pink font-display font-bold uppercase tracking-wider rounded-xl w-full sm:w-auto">
          <Plus className="w-4 h-4" />
          Novo Efeito
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground font-body">Carregando efeitos…</span>
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 glass-card-strong rounded-2xl gradient-border">
          <Package className="w-12 h-12 text-muted-foreground/50" />
          <p className="text-muted-foreground font-body text-center">Nenhum efeito cadastrado ainda.<br />Clique em "+ Novo Efeito" para começar.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block glass-card-strong rounded-2xl overflow-hidden gradient-border">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30">
                    <th className="text-left py-3.5 px-4 font-display text-muted-foreground font-semibold text-xs uppercase tracking-wider">Preview</th>
                    <th className="text-left py-3.5 px-4 font-display text-muted-foreground font-semibold text-xs uppercase tracking-wider">Nome</th>
                    <th className="text-left py-3.5 px-4 font-display text-muted-foreground font-semibold text-xs uppercase tracking-wider">Categoria</th>
                    <th className="text-left py-3.5 px-4 font-display text-muted-foreground font-semibold text-xs uppercase tracking-wider">Preço</th>
                    <th className="text-left py-3.5 px-4 font-display text-muted-foreground font-semibold text-xs uppercase tracking-wider">Drive ID</th>
                    <th className="text-left py-3.5 px-4 font-display text-muted-foreground font-semibold text-xs uppercase tracking-wider">Estoque</th>
                    <th className="text-right py-3.5 px-4 font-display text-muted-foreground font-semibold text-xs uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className="border-b border-border/10 hover:bg-muted/10 transition-colors group">
                      <td className="py-3 px-4">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-muted/30 ring-1 ring-border/20">
                          {p.preview_video_url ? (
                            <video
                              src={p.preview_video_url}
                              className="w-full h-full object-cover"
                              autoPlay
                              muted
                              loop
                              playsInline
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Video className="w-4 h-4 text-muted-foreground/40" />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-display font-semibold text-foreground text-sm">{p.name}</span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className="bg-primary/15 text-primary border-0 text-[10px] font-display">{p.category}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-neon-cyan text-sm font-semibold">R${Number(p.price).toFixed(2)}</span>
                      </td>
                      <td className="py-3 px-4">
                        {p.google_drive_file_id ? (
                          <Badge className="bg-neon-green/15 text-neon-green border-0 text-[10px] font-display">Drive</Badge>
                        ) : (
                          <Badge className="bg-destructive/15 text-destructive border-0 text-[10px] font-display">Sem ID</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4">{getStockBadge(p.stock ?? -1)}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(p)} className="h-8 w-8 hover:bg-primary/10 hover:text-primary">
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDelete(p.id, p.name)}
                            disabled={deleting === p.id}
                            className="h-8 w-8 hover:bg-destructive/10 text-destructive/70 hover:text-destructive"
                          >
                            {deleting === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {products.map((p) => (
              <div key={p.id} className="glass-card-strong rounded-2xl overflow-hidden gradient-border">
                <div className="flex gap-4 p-4">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-muted/30 ring-1 ring-border/20 flex-shrink-0">
                    {p.preview_video_url ? (
                      <video
                        src={p.preview_video_url}
                        className="w-full h-full object-cover"
                        autoPlay
                        muted
                        loop
                        playsInline
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video className="w-5 h-5 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-display font-bold text-foreground text-sm truncate">{p.name}</h3>
                      <Badge className="bg-primary/15 text-primary border-0 text-[10px] font-display flex-shrink-0">{p.category}</Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="font-mono text-neon-cyan text-sm font-semibold">R${Number(p.price).toFixed(2)}</span>
                      {getStockBadge(p.stock ?? -1)}
                      {p.google_drive_file_id ? (
                        <Badge className="bg-neon-green/15 text-neon-green border-0 text-[10px] font-display">Drive</Badge>
                      ) : (
                        <Badge className="bg-destructive/15 text-destructive border-0 text-[10px] font-display">Sem ID</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex border-t border-border/20">
                  <button
                    onClick={() => openEdit(p)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 text-xs font-display font-semibold text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Editar
                  </button>
                  <div className="w-px bg-border/20" />
                  <button
                    onClick={() => handleDelete(p.id, p.name)}
                    disabled={deleting === p.id}
                    className="flex-1 flex items-center justify-center gap-2 py-3 text-xs font-display font-semibold text-destructive/70 hover:text-destructive hover:bg-destructive/5 transition-colors disabled:opacity-50"
                  >
                    {deleting === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Create/Edit Modal */}
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
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Neon Glow Tap"
                className="bg-muted/30 border-border/30 rounded-xl"
              />
            </div>

            {/* Category + Price + Stock */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="font-display text-xs uppercase tracking-wider text-muted-foreground">Categoria *</Label>
                <Select value={form.category} onValueChange={(v) => setForm((prev) => ({ ...prev, category: v }))}>
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
                  onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                  placeholder="29.90"
                  className="bg-muted/30 border-border/30 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="font-display text-xs uppercase tracking-wider text-muted-foreground">Estoque</Label>
                <Input
                  type="number"
                  value={form.stock}
                  onChange={(e) => setForm((prev) => ({ ...prev, stock: e.target.value }))}
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
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição do efeito…"
                className="bg-muted/30 border-border/30 rounded-xl min-h-[80px]"
              />
            </div>

            {/* Google Drive File ID (download) */}
            <div className="space-y-2">
              <Label className="font-display text-xs uppercase tracking-wider text-muted-foreground">
                Google Drive File ID *
              </Label>
              <div className="glass-card rounded-xl p-4 space-y-2">
                {editingId && dbValues && (
                  <div className="rounded-lg bg-muted/20 p-2 space-y-1">
                    <span className="text-[10px] text-muted-foreground font-display uppercase">Valor atual no banco:</span>
                    <p className="text-[11px] text-foreground font-mono break-all">
                      {dbValues.google_drive_file_id || <span className="text-destructive">(vazio)</span>}
                    </p>
                  </div>
                )}
                <Input
                  value={form.google_drive_file_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, google_drive_file_id: e.target.value }))}
                  placeholder="Cole o ID ou link do arquivo no Google Drive"
                  className="bg-muted/30 border-border/30 rounded-xl"
                />
                <p className="text-[10px] text-muted-foreground font-body">
                  Arquivo que o cliente recebe após o pagamento. Cole o link completo ou ID do Google Drive.
                </p>
              </div>
            </div>

            {/* Preview Video URL (optional) */}
            <div className="space-y-2">
              <Label className="font-display text-xs uppercase tracking-wider text-muted-foreground">
                Preview Video URL (opcional)
              </Label>
              <div className="glass-card rounded-xl p-4 space-y-2">
                {editingId && dbValues && (
                  <div className="rounded-lg bg-muted/20 p-2 space-y-1">
                    <span className="text-[10px] text-muted-foreground font-display uppercase">Valor atual no banco:</span>
                    <p className="text-[11px] text-foreground font-mono break-all">
                      {dbValues.preview_video_url || <span className="text-destructive">(vazio)</span>}
                    </p>
                  </div>
                )}
                <Input
                  value={form.preview_video_url}
                  onChange={(e) => setForm((prev) => ({ ...prev, preview_video_url: e.target.value }))}
                  placeholder="Cole o link do vídeo de preview do Google Drive"
                  className="bg-muted/30 border-border/30 rounded-xl"
                />
                <p className="text-[10px] text-muted-foreground font-body">
                  Link do vídeo de preview exibido na loja. Pode ser link do Google Drive.
                </p>
              </div>
            </div>

            {/* Save */}
            <Button
              onClick={handleSave}
              className="w-full neon-glow-pink font-display font-bold uppercase tracking-wider rounded-xl py-6"
              disabled={saving}
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {saving ? "Salvando…" : editingId ? "Salvar Alterações" : "Criar Efeito"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminProducts;
