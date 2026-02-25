import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface Order {
  id: string;
  created_at: string;
  status: string;
  user_id: string;
  product_name: string;
  price: number;
}

const statusLabel: Record<string, string> = {
  completed: "Concluído",
  pending: "Pendente",
  failed: "Falhou",
};

const statusColor: Record<string, string> = {
  completed: "bg-neon-green/15 text-neon-green",
  pending: "bg-yellow-500/15 text-yellow-400",
  failed: "bg-destructive/15 text-destructive",
};

const AdminOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("purchases")
        .select("id, created_at, status, user_id, product_id, products(name, price)")
        .order("created_at", { ascending: false })
        .limit(100);

      setOrders(
        (data || []).map((p: any) => ({
          id: p.id,
          created_at: p.created_at,
          status: p.status,
          user_id: p.user_id,
          product_name: p.products?.name || "—",
          price: p.products?.price || 0,
        }))
      );
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-black text-3xl neon-gradient-text-pink-cyan">Pedidos</h1>
        <p className="text-muted-foreground font-body mt-1">{orders.length} pedido{orders.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="glass-card-strong rounded-2xl overflow-hidden gradient-border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30">
                <th className="text-left py-3 px-4 font-display text-muted-foreground font-semibold text-xs">Produto</th>
                <th className="text-left py-3 px-4 font-display text-muted-foreground font-semibold text-xs">User ID</th>
                <th className="text-left py-3 px-4 font-display text-muted-foreground font-semibold text-xs">Valor</th>
                <th className="text-left py-3 px-4 font-display text-muted-foreground font-semibold text-xs">Status</th>
                <th className="text-left py-3 px-4 font-display text-muted-foreground font-semibold text-xs">Data</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-border/10 hover:bg-muted/10 transition-colors">
                  <td className="py-3 px-4 font-body text-foreground">{order.product_name}</td>
                  <td className="py-3 px-4 font-mono text-[10px] text-muted-foreground max-w-[120px] truncate">{order.user_id}</td>
                  <td className="py-3 px-4 font-mono text-neon-cyan text-xs">R${order.price.toFixed(2)}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-display font-bold uppercase ${statusColor[order.status] || "bg-muted text-muted-foreground"}`}>
                      {statusLabel[order.status] || order.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground font-body text-xs">
                    {new Date(order.created_at).toLocaleDateString("pt-BR")}
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={5} className="py-10 text-center text-muted-foreground">Nenhum pedido encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminOrders;
