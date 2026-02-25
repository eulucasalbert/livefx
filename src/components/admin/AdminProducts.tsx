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
import { Plus, Pencil, Trash2, Loader2, Upload, Video, Save, Package, FileDown, FileArchive, Link, FolderOpen } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const CATEGORIES = ["TAP", "X2", "X3", "GLOVE", "HEART-ME", "OUTROS"];

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
  const downloadInputRef = useRef<HTMLInputElement>(null);

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingDownload, setUploadingDownload] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [downloadFile, setDownloadFile] = useState<File | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [existingVideos, setExistingVideos] = useState<{ name: string; url: string }[]>([]);
  const [showVideoPicker, setShowVideoPicker] = useState(false);
  const [loadingVideos, setLoadingVideos] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    const { data } = await supabase.from("products").select("*").order("created_at");
    setProducts(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchExistingVideos = async () => {
    setLoadingVideos(true);
    try {
      const { data, error } = await supabase.storage.from("preview-videos").list("", { limit: 200, sortBy: { column: "created_at", order: "desc" } });
      if (error) throw error;
      const videos = (data || [])
        .filter((f) => f.name && !f.name.startsWith("."))
        .map((f) => {
          const { data: urlData } = supabase.storage.from("preview-videos").getPublicUrl(f.name);
          return { name: f.name, url: urlData.publicUrl };
        });
      setExistingVideos(videos);
    } catch {
      toast({ title: "Erro ao carregar vídeos", variant: "destructive" });
    } finally {
      setLoadingVideos(false);
    }
  };

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setVideoFile(null);
    setDownloadFile(null);
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
    setDownloadFile(null);
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

  const uploadDownloadFile = async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop() || "zip";
    const fileName = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("downloads")
      .upload(fileName, file, { contentType: file.type, upsert: false });
    if (error) throw new Error(`Upload do arquivo falhou: ${error.message}`);
    const { data: urlData } = supabase.storage.from("downloads").getPublicUrl(fileName);
    return urlData.publicUrl;
  };

  const handleDownloadFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      toast({ title: "O arquivo deve ter no maximo 100MB", variant: "destructive" });
      return;
    }
    setDownloadFile(file);
    setForm((prev) => ({ ...prev, download_file_url: "" }));
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

      let downloadUrl = form.download_file_url;
      if (downloadFile) {
        setUploadingDownload(true);
        downloadUrl = await uploadDownloadFile(downloadFile);
        setUploadingDownload(false);
      }

      const payload: any = {
        name: form.name,
        price: parseFloat(form.price),
        category: form.category,
        description: form.description,
        preview_video_url: videoUrl,
        download_file_url: downloadUrl || "#",
        google_drive_file_id: form.google_drive_file_id || "",
        stock: parseInt(form.stock) || -1,
      };

      if (editingId) {
        const { error } = await supabase.from("products").update(payload).eq("id", editingId);
        if (error) throw error;
        toast({ title: "✅ Efeito atualizado com sucesso!" });
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
        toast({ title: "✅ Efeito criado com sucesso!" });
      }
      setDialogOpen(false);
      setVideoFile(null);
      setDownloadFile(null);
      fetchProducts();
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
      setUploading(false);
      setUploadingDownload(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir "${name}"? Esta ação não pode ser desfeita.`)) return;
    setDeleting(id);
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "🗑️ Efeito excluído" });
      fetchProducts();
      queryClient.invalidateQueries({ queryKey: ["products"] });
    }
    setDeleting(null);
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

  const getStockBadge = (stock: number) => {
    if (stock === -1) return <Badge className="bg-secondary/20 text-secondary border-0 text-[10px] font-display">∞ Ilimitado</Badge>;
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
          {/* ── Desktop Table ── */}
          <div className="hidden md:block glass-card-strong rounded-2xl overflow-hidden gradient-border">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30">
                    <th className="text-left py-3.5 px-4 font-display text-muted-foreground font-semibold text-xs uppercase tracking-wider">Preview</th>
                    <th className="text-left py-3.5 px-4 font-display text-muted-foreground font-semibold text-xs uppercase tracking-wider">Nome</th>
                    <th className="text-left py-3.5 px-4 font-display text-muted-foreground font-semibold text-xs uppercase tracking-wider">Categoria</th>
                    <th className="text-left py-3.5 px-4 font-display text-muted-foreground font-semibold text-xs uppercase tracking-wider">Preço</th>
                    <th className="text-left py-3.5 px-4 font-display text-muted-foreground font-semibold text-xs uppercase tracking-wider">Arquivo</th>
                    <th className="text-left py-3.5 px-4 font-display text-muted-foreground font-semibold text-xs uppercase tracking-wider">Estoque</th>
                    <th className="text-right py-3.5 px-4 font-display text-muted-foreground font-semibold text-xs uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className="border-b border-border/10 hover:bg-muted/10 transition-colors group">
                      <td className="py-3 px-4">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-muted/30 ring-1 ring-border/20">
                          <video
                            src={p.preview_video_url}
                            className="w-full h-full object-cover"
                            autoPlay
                            muted
                            loop
                            playsInline
                          />
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
                        ) : p.download_file_url && p.download_file_url !== "#" ? (
                          <Badge className="bg-neon-cyan/15 text-neon-cyan border-0 text-[10px] font-display">Arquivo</Badge>
                        ) : (
                          <Badge className="bg-destructive/15 text-destructive border-0 text-[10px] font-display">Sem arquivo</Badge>
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

          {/* ── Mobile Cards ── */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {products.map((p) => (
              <div key={p.id} className="glass-card-strong rounded-2xl overflow-hidden gradient-border">
                <div className="flex gap-4 p-4">
                  {/* Video thumbnail */}
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-muted/30 ring-1 ring-border/20 flex-shrink-0">
                    <video
                      src={p.preview_video_url}
                      className="w-full h-full object-cover"
                      autoPlay
                      muted
                      loop
                      playsInline
                    />
                  </div>
                  {/* Info */}
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
                      ) : p.download_file_url && p.download_file_url !== "#" ? (
                        <Badge className="bg-neon-cyan/15 text-neon-cyan border-0 text-[10px] font-display">Arquivo</Badge>
                      ) : (
                        <Badge className="bg-destructive/15 text-destructive border-0 text-[10px] font-display">Sem arquivo</Badge>
                      )}
                    </div>
                  </div>
                </div>
                {/* Actions */}
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
                placeholder="Descrição do efeito…"
                className="bg-muted/30 border-border/30 rounded-xl min-h-[80px]"
              />
            </div>

            {/* Video Upload */}
            <div className="space-y-2">
              <Label className="font-display text-xs uppercase tracking-wider text-muted-foreground">Vídeo Preview *</Label>
              <div className="glass-card rounded-xl p-4 space-y-3">
                <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoFileChange} />
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2 rounded-xl border-border/30 border-dashed"
                    onClick={() => videoInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4" />
                    {videoFile ? "Trocar" : "Upload"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2 rounded-xl border-border/30"
                    onClick={() => { fetchExistingVideos(); setShowVideoPicker(true); }}
                  >
                    <FolderOpen className="w-4 h-4" />
                    Existentes
                  </Button>
                </div>
                {videoFile && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Video className="w-3.5 h-3.5 text-neon-cyan" />
                    <span>{videoFile.name} — {(videoFile.size / 1024 / 1024).toFixed(1)} MB</span>
                  </div>
                )}
                {!videoFile && form.preview_video_url && (
                  <div className="flex items-center gap-2 text-xs text-neon-cyan">
                    <Video className="w-3.5 h-3.5" />
                    <span className="truncate">Vídeo selecionado</span>
                  </div>
                )}

                {/* Video Picker */}
                {showVideoPicker && (
                  <div className="border border-border/30 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 bg-muted/20 border-b border-border/20">
                      <span className="text-[10px] text-muted-foreground uppercase font-display">Selecionar vídeo existente</span>
                      <button onClick={() => setShowVideoPicker(false)} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
                    </div>
                    {loadingVideos ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : existingVideos.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-6">Nenhum vídeo encontrado</p>
                    ) : (
                      <ScrollArea className="max-h-48">
                        <div className="grid grid-cols-3 gap-1.5 p-2">
                          {existingVideos.map((v) => (
                            <button
                              key={v.name}
                              type="button"
                              onClick={() => {
                                setForm((prev) => ({ ...prev, preview_video_url: v.url }));
                                setVideoFile(null);
                                setShowVideoPicker(false);
                              }}
                              className={`relative aspect-[9/16] rounded-lg overflow-hidden bg-black ring-1 transition-all hover:ring-primary/60 ${form.preview_video_url === v.url ? "ring-2 ring-primary" : "ring-border/20"}`}
                            >
                              <video src={v.url} muted playsInline preload="metadata" className="w-full h-full object-cover" />
                              {form.preview_video_url === v.url && (
                                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                  <span className="text-[10px] font-display font-bold text-primary-foreground bg-primary px-2 py-0.5 rounded">Selecionado</span>
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-border/30" />
                  <span className="text-[10px] text-muted-foreground uppercase font-display">ou cole a URL</span>
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

            {/* Download File */}
            <div className="space-y-2">
              <Label className="font-display text-xs uppercase tracking-wider text-muted-foreground">Arquivo de Download</Label>
              <div className="glass-card rounded-xl p-4 space-y-3">
                {/* File Upload */}
                <input ref={downloadInputRef} type="file" className="hidden" onChange={handleDownloadFileChange} />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2 rounded-xl border-border/30 border-dashed"
                  onClick={() => downloadInputRef.current?.click()}
                >
                  <FileArchive className="w-4 h-4" />
                  {downloadFile ? downloadFile.name : "Upload do arquivo (.zip, .rar, etc) (max 100MB)"}
                </Button>
                {downloadFile && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <FileDown className="w-3.5 h-3.5 text-neon-cyan" />
                    <span>{(downloadFile.size / 1024 / 1024).toFixed(1)} MB</span>
                  </div>
                )}

                {/* Current file indicator */}
                {!downloadFile && form.download_file_url && form.download_file_url !== "#" && (
                  <div className="flex items-center gap-2 text-xs text-neon-cyan">
                    <Link className="w-3.5 h-3.5" />
                    <span className="truncate">Arquivo atual configurado</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-border/30" />
                  <span className="text-[10px] text-muted-foreground uppercase font-display">ou cole a URL</span>
                  <div className="h-px flex-1 bg-border/30" />
                </div>
                <Input
                  value={form.download_file_url === "#" ? "" : form.download_file_url}
                  onChange={(e) => { setForm({ ...form, download_file_url: e.target.value }); if (e.target.value) setDownloadFile(null); }}
                  placeholder="https://link-direto-do-arquivo.com/efeito.zip"
                  disabled={!!downloadFile}
                  className="bg-muted/30 border-border/30 rounded-xl"
                />

                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-border/30" />
                  <span className="text-[10px] text-muted-foreground uppercase font-display">ou Google Drive</span>
                  <div className="h-px flex-1 bg-border/30" />
                </div>
                <Input
                  value={form.google_drive_file_id}
                  onChange={(e) => setForm({ ...form, google_drive_file_id: e.target.value })}
                  placeholder="ID do Google Drive (ex: 1BxiMVs0XRA5nF...)"
                  className="bg-muted/30 border-border/30 rounded-xl"
                />
                <p className="text-[10px] text-muted-foreground font-body">
                  Prioridade: Google Drive &gt; Upload/URL. Se tiver Google Drive configurado, o download seguro usa ele.
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
              {uploading ? "Enviando video…" : uploadingDownload ? "Enviando arquivo…" : saving ? "Salvando…" : editingId ? "Salvar Alteracoes" : "Criar Efeito"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminProducts;
