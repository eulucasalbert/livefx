import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, Upload, Video, Package } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

const CATEGORIES = ["TAP", "X2", "X3", "GLOVE", "HEART-ME"];

interface ProductForm {
  name: string;
  price: string;
  category: string;
  description: string;
  preview_video_url: string;
  download_file_url: string;
  stock: string;
}

const emptyForm: ProductForm = {
  name: "",
  price: "",
  category: "",
  description: "",
  preview_video_url: "",
  download_file_url: "#",
  stock: "-1",
};

const Admin = () => {
  const { user } = useAuth();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const navigate = useNavigate();
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

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, adminLoading, navigate]);

  const fetchProducts = async () => {
    setLoading(true);
    const { data } = await supabase.from("products").select("*").order("created_at");
    setProducts(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) fetchProducts();
  }, [isAdmin]);

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

    const { data: urlData } = supabase.storage
      .from("preview-videos")
      .getPublicUrl(fileName);

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

      // Upload video if a file was selected
      if (videoFile) {
        setUploading(true);
        videoUrl = await uploadVideo(videoFile);
        setUploading(false);
      }

      const payload = {
        name: form.name,
        price: parseFloat(form.price),
        category: form.category,
        description: form.description,
        preview_video_url: videoUrl,
        download_file_url: form.download_file_url || "#",
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
    if (stock === -1) return <Badge variant="secondary" className="text-xs">Ilimitado</Badge>;
    if (stock === 0) return <Badge variant="destructive" className="text-xs">Esgotado</Badge>;
    return <Badge variant="outline" className="text-xs">{stock} un.</Badge>;
  };

  if (adminLoading || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-display font-black text-xl text-foreground">
                Admin — Produtos
              </h1>
              <p className="text-xs text-muted-foreground">
                {products.length} produto{products.length !== 1 ? "s" : ""} cadastrado{products.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <Button onClick={openNew} className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Produto
          </Button>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Preview</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Estoque</TableHead>
                  <TableHead>Download</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="w-10 h-10 rounded-md overflow-hidden bg-muted">
                        <video
                          src={p.preview_video_url}
                          className="w-full h-full object-cover"
                          muted
                          playsInline
                          onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
                          onMouseLeave={(e) => {
                            const v = e.target as HTMLVideoElement;
                            v.pause();
                            v.currentTime = 0;
                          }}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{p.category}</Badge>
                    </TableCell>
                    <TableCell className="font-mono">R${Number(p.price).toFixed(2)}</TableCell>
                    <TableCell>{getStockLabel(p.stock ?? -1)}</TableCell>
                    <TableCell className="max-w-[150px] truncate text-xs text-muted-foreground">
                      {p.download_file_url === "#" ? (
                        <span className="text-destructive">Não configurado</span>
                      ) : (
                        "✓ Configurado"
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingId ? "Editar Produto" : "Novo Produto"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Preço (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Categoria *</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Estoque</Label>
                <Input
                  type="number"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  placeholder="-1 = ilimitado"
                />
                <p className="text-[10px] text-muted-foreground">-1 = ilimitado</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>

            {/* Video Upload Section */}
            <div className="space-y-2">
              <Label>Vídeo Preview *</Label>
              <div className="glass-card rounded-lg p-4 space-y-3">
                {/* Upload button */}
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={handleVideoFileChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => videoInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4" />
                  {videoFile ? videoFile.name : "Upload de vídeo (max 50MB)"}
                </Button>

                {videoFile && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Video className="w-3.5 h-3.5 text-neon-cyan" />
                    <span>{(videoFile.size / 1024 / 1024).toFixed(1)} MB</span>
                  </div>
                )}

                {/* Or URL input */}
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[10px] text-muted-foreground uppercase">ou cole a URL</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <Input
                  value={form.preview_video_url}
                  onChange={(e) => {
                    setForm({ ...form, preview_video_url: e.target.value });
                    if (e.target.value) setVideoFile(null);
                  }}
                  placeholder="https://..."
                  disabled={!!videoFile}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>URL de Download (Google Drive)</Label>
              <Input
                value={form.download_file_url}
                onChange={(e) => setForm({ ...form, download_file_url: e.target.value })}
                placeholder="https://drive.google.com/uc?export=download&id=..."
              />
            </div>

            <Button onClick={handleSave} className="w-full" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {uploading ? "Enviando vídeo..." : saving ? "Salvando..." : editingId ? "Salvar Alterações" : "Criar Produto"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
