import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Tag, Percent, Copy, Check } from "lucide-react";

const AdminCoupons = () => {
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");

  const { data: coupons, isLoading } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const trimmedCode = code.trim().toUpperCase();
      if (!trimmedCode || !discountPercent) throw new Error("Preencha todos os campos");
      const percent = parseInt(discountPercent);
      if (isNaN(percent) || percent < 1 || percent > 100) throw new Error("Desconto deve ser entre 1% e 100%");
      const { error } = await supabase.from("coupons").insert({ code: trimmedCode, discount_percent: percent });
      if (error) {
        if (error.message.includes("duplicate")) throw new Error("Esse código de cupom já existe");
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      setCode("");
      setDiscountPercent("");
      toast({ title: "Cupom criado!", description: "O cupom está pronto para uso." });
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coupons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast({ title: "Cupom excluído" });
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copyCode = (couponCode: string, id: string) => {
    navigator.clipboard.writeText(couponCode);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-display font-black text-foreground">Cupons de Desconto</h1>
        <p className="text-muted-foreground text-sm mt-1">Cada cupom pode ser usado apenas uma vez.</p>
      </div>

      {/* Create coupon form */}
      <div className="glass-card-strong rounded-2xl p-6 border border-border/30 space-y-4">
        <h2 className="font-display font-bold text-foreground flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" /> Criar Cupom
        </h2>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1.5 flex-1 min-w-[180px]">
            <label className="text-xs font-display text-muted-foreground flex items-center gap-1">
              <Tag className="w-3 h-3" /> Código do Cupom
            </label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="EX: DESCONTO20"
              className="bg-background/50 border-border/30 uppercase font-mono"
              maxLength={30}
            />
          </div>
          <div className="space-y-1.5 w-[140px]">
            <label className="text-xs font-display text-muted-foreground flex items-center gap-1">
              <Percent className="w-3 h-3" /> Desconto (%)
            </label>
            <Input
              type="number"
              value={discountPercent}
              onChange={(e) => setDiscountPercent(e.target.value)}
              placeholder="20"
              min={1}
              max={100}
              className="bg-background/50 border-border/30"
            />
          </div>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !code.trim() || !discountPercent}
            className="neon-glow-pink"
          >
            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Criar
          </Button>
        </div>
        {code.trim() && discountPercent && (
          <p className="text-xs text-muted-foreground">
            Prévia: Cupom <span className="text-primary font-bold">{code.trim().toUpperCase()}</span> — <span className="text-secondary font-bold">{discountPercent}% de desconto</span>
          </p>
        )}
      </div>

      {/* Coupons list */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !coupons?.length ? (
          <p className="text-center text-muted-foreground py-12">Nenhum cupom criado ainda.</p>
        ) : (
          coupons.map((coupon) => (
            <div
              key={coupon.id}
              className={`glass-card rounded-xl p-4 border border-border/20 flex items-center justify-between gap-4 ${coupon.used ? "opacity-50" : ""}`}
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                  <Tag className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-foreground text-sm">{coupon.code}</span>
                    <button onClick={() => copyCode(coupon.code, coupon.id)} className="text-muted-foreground hover:text-foreground transition-colors">
                      {copiedId === coupon.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {coupon.discount_percent}% de desconto
                    {coupon.used ? " • Usado" : " • Disponível"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-display font-bold uppercase ${coupon.used ? "bg-destructive/20 text-destructive" : "bg-green-500/20 text-green-400"}`}>
                  {coupon.used ? "Usado" : "Ativo"}
                </span>
                <button
                  onClick={() => deleteMutation.mutate(coupon.id)}
                  disabled={deleteMutation.isPending}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminCoupons;
