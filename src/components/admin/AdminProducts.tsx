import { useState, useEffect, useRef } from "react";
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
import { Plus, Pencil, Trash2, Loader2, Upload, Video, Save } from "lucide-react";

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
};

const AdminProducts = () => {
  const queryClient = useQueryClient();
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);

  // Inline editing state
  const [inlineEdits, setInlineEdits] = useState<Record<string, { name: string; price: string; stock: string; category: string }>>({});
  const [inlineSaving, setInlineSaving] = useState<Record<string, boolean>>({});

  const fetchProducts = async () => {
    setLoading(true);
    const { data } = await supabase.from("products").select("*").order("created_at");
    setProducts(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const startInlineEdit = (p: any) => {
    setInlineEdits((prev) => ({
      ...prev,
      [p.id]: { name: p.name, price: String(p.price), stock: String(p.stock ?? -1), category: p.category },
    }));
  };

  const updateInlineField = (id: string, field: string, value: string) => {
    setInlineEdits((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const saveInline = async (id: string) => {
    const edit = inlineEdits[id];
    if (!edit) return;
    setInlineSaving((prev) => ({ ...prev, [id]: true }));
    const { error } = await supabase.from("products").update({
      name: edit.name,
      price: parseFloat(edit.price),
      stock: parseInt(edit.stock) || -1,
      category: edit.category,
    }).eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Produto atualizado!" });
      setInlineEdits((prev) => { const n = { ...prev }; delete n[id]; return n; });
      fetchProducts();
      queryClient.invalidateQueries({ queryKey: ["products"] });
    }
    setInlineSaving((prev) => ({ ...prev, [id]: false }));
  };

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setVideoFile(null);
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
    });
    setVideoFile(null);
    setDialogOpen(true);
  };

  const uploadVideo = async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop() || "mp4";
    const fileName = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("preview-videos")
      .upload(fileName, file, { contentType: file.type, upsert: false });
    if (error) throw new Error(`Upload falhou: ${error.message}`);
    const { data: urlData } = supabase.storage.from("preview-videos").getPublicUrl(fileName);
    return urlData.publicUrl;
  };

  const handleSave = async () => {
    if (!form.name || !form.price || !form.category) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    if (!form.preview_video_url && !videoFile) {
      toast({ title: "Adicione um vídeo preview", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      let videoUrl = form.preview_video_url;
      if (videoFile) {
        setUploading(true);
        videoUrl = await uploadVideo(videoFile);
        setUploading(false);
      }
      const payload: any = {
        name: form.name,
        price: parseFloat(form.price),
        category: form.category,
        description: form.description,
        preview_video_url: videoUrl,
        download_file_url: form.download_file_url || "#",
        google_drive_file_id: form.google_drive_file_id || "",
        stock: parseInt(form.stock) || -1,
      };

      if (editingId) {
        const { error } = await supabase.from("products").update(payload).eq("id", editingId);
        if (error) throw error;
        toast({ title: "Produto atualizado!" });
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
        toast({ title: "Produto criado!" });
      }
      setDialogOpen(false);
      setVideoFile(null);
      fetchProducts();
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Produto excluído" });
      fetchProducts();
      queryClient.invalidateQueries({ queryKey: ["products"] });
    }
  };

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      toast({ title: "Selecione um arquivo de vídeo", variant: "destructive" });
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast({ title: "O vídeo deve ter no máximo 50MB", variant: "destructive" });
      return;
    }
    setVideoFile(file);
    setForm((prev) => ({ ...prev, preview_video_url: "" }));
  };

  const getStockLabel = (stock: number) => {
    if (stock === -1) return <Badge className="bg-secondary/20 text-secondary text-[10px]">Ilimitado</Badge>;
    if (stock === 0) return <Badge className="bg-destructive/20 text-destructive text-[10px]">Esgotado</Badge>;
    return <Badge className="bg-muted text-muted-foreground text-[10px]">{stock} un.</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-black text-3xl neon-gradient-text-pink-cyan">Produtos</h1>
          <p className="text-muted-foreground font-body mt-1">{products.length} produto{products.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={openNew} className="gap-2 neon-glow-pink font-display font-bold uppercase tracking-wider rounded-xl">
          <Plus className="w-4 h-4" />
          Novo Produto
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="glass-card-strong rounded-2xl overflow-hidden gradient-border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left py-3 px-4 font-display text-muted-foreground font-semibold text-xs">Preview</th>
                  <th className="text-left py-3 px-4 font-display text-muted-foreground font-semibold text-xs">Nome</th>
                  <th className="text-left py-3 px-4 font-display text-muted-foreground font-semibold text-xs">Categoria</th>
                  <th className="text-left py-3 px-4 font-display text-muted-foreground font-semibold text-xs">Preço</th>
                  <th className="text-left py-3 px-4 font-display text-muted-foreground font-semibold text-xs">Estoque</th>
                  <th className="text-left py-3 px-4 font-display text-muted-foreground font-semibold text-xs">Drive ID</th>
                  <th className="text-left py-3 px-4 font-display text-muted-foreground font-semibold text-xs">Ações</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const edit = inlineEdits[p.id];
                  const isSaving = inlineSaving[p.id];
                  return (
                    <tr key={p.id} className="border-b border-border/10 hover:bg-muted/10 transition-colors">
                      <td className="py-2.5 px-4">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted/30">
                          <video
                            src={p.preview_video_url}
                            className="w-full h-full object-cover"
                            muted
                            playsInline
                            onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
                            onMouseLeave={(e) => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
                          />
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        {edit ? (
                          <Input
                            value={edit.name}
                            onChange={(e) => updateInlineField(p.id, "name", e.target.value)}
                            className="h-8 text-xs bg-muted/30 border-border/30"
                          />
                        ) : (
                          <span className="font-body text-foreground cursor-pointer" onClick={() => startInlineEdit(p)}>
                            {p.name}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        {edit ? (
                          <Select value={edit.category} onValueChange={(v) => updateInlineField(p.id, "category", v)}>
                            <SelectTrigger className="h-8 text-xs bg-muted/30 border-border/30 w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge className="bg-primary/15 text-primary text-[10px] cursor-pointer" onClick={() => startInlineEdit(p)}>
                            {p.category}
                          </Badge>
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        {edit ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={edit.price}
                            onChange={(e) => updateInlineField(p.id, "price", e.target.value)}
                            className="h-8 text-xs bg-muted/30 border-border/30 w-24"
                          />
                        ) : (
                          <span className="font-mono text-neon-cyan text-xs cursor-pointer" onClick={() => startInlineEdit(p)}>
                            R${Number(p.price).toFixed(2)}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        {edit ? (
                          <Input
                            type="number"
                            value={edit.stock}
                            onChange={(e) => updateInlineField(p.id, "stock", e.target.value)}
                            className="h-8 text-xs bg-muted/30 border-border/30 w-20"
                          />
                        ) : (
                          <span className="cursor-pointer" onClick={() => startInlineEdit(p)}>
                            {getStockLabel(p.stock ?? -1)}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 max-w-[120px] truncate text-xs text-muted-foreground">
                        {p.google_drive_file_id ? (
                          <span className="text-neon-green text-[10px]">✓ Configurado</span>
                        ) : (
                          <span className="text-destructive/70 text-[10px]">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-1">
                          {edit ? (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => saveInline(p.id)}
                              disabled={isSaving}
                              className="h-8 w-8 text-neon-green hover:text-neon-green"
                            >
                              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            </Button>
                          ) : null}
                          <Button size="icon" variant="ghost" onClick={() => openEdit(p)} className="h-8 w-8">
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(p.id)} className="h-8 w-8 text-destructive hover:text-destructive">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto glass-card-strong border-border/30">
          <DialogHeader>
            <DialogTitle className="font-display neon-gradient-text-pink-cyan">
              {editingId ? "Editar Produto" : "Novo Produto"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="font-display text-xs">Nome *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-muted/30 border-border/30 rounded-xl" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="font-display text-xs">Preço (R$) *</Label>
                <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="bg-muted/30 border-border/30 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="font-display text-xs">Categoria *</Label>
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
                <Label className="font-display text-xs">Estoque</Label>
                <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="bg-muted/30 border-border/30 rounded-xl" placeholder="-1 = ilimitado" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="font-display text-xs">Descrição</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-muted/30 border-border/30 rounded-xl" />
            </div>

            {/* Video Upload */}
            <div className="space-y-2">
              <Label className="font-display text-xs">Vídeo Preview *</Label>
              <div className="glass-card rounded-xl p-4 space-y-3">
                <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoFileChange} />
                <Button type="button" variant="outline" className="w-full gap-2 rounded-xl border-border/30" onClick={() => videoInputRef.current?.click()}>
                  <Upload className="w-4 h-4" />
                  {videoFile ? videoFile.name : "Upload de vídeo (max 50MB)"}
                </Button>
                {videoFile && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Video className="w-3.5 h-3.5 text-neon-cyan" />
                    <span>{(videoFile.size / 1024 / 1024).toFixed(1)} MB</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-border/30" />
                  <span className="text-[10px] text-muted-foreground uppercase">ou cole a URL</span>
                  <div className="h-px flex-1 bg-border/30" />
                </div>
                <Input
                  value={form.preview_video_url}
                  onChange={(e) => { setForm({ ...form, preview_video_url: e.target.value }); if (e.target.value) setVideoFile(null); }}
                  placeholder="https://..."
                  disabled={!!videoFile}
                  className="bg-muted/30 border-border/30 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="font-display text-xs">Google Drive File ID</Label>
              <Input
                value={form.google_drive_file_id}
                onChange={(e) => setForm({ ...form, google_drive_file_id: e.target.value })}
                placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgV..."
                className="bg-muted/30 border-border/30 rounded-xl"
              />
              <p className="text-[10px] text-muted-foreground">ID do arquivo no Google Drive para download seguro</p>
            </div>

            <Button onClick={handleSave} className="w-full neon-glow-pink font-display font-bold uppercase tracking-wider rounded-xl py-6" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {uploading ? "Enviando vídeo..." : saving ? "Salvando..." : editingId ? "Salvar Alterações" : "Criar Produto"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminProducts;
