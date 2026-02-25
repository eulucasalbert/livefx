import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Package, ShoppingBag, Users, DollarSign, Loader2 } from "lucide-react";

interface Stats {
  totalProducts: number;
  totalSales: number;
  totalRevenue: number;
  totalUsers: number;
}

interface RecentOrder {
  id: string;
  created_at: string;
  status: string;
  user_id: string;
  product_name: string;
  price: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats>({ totalProducts: 0, totalSales: 0, totalRevenue: 0, totalUsers: 0 });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);

      const [productsRes, purchasesRes] = await Promise.all([
        supabase.from("products").select("id, price", { count: "exact" }),
        supabase.from("purchases").select("id, created_at, status, user_id, product_id, products(name, price)").order("created_at", { ascending: false }).limit(10),
      ]);

      const products = productsRes.data || [];
      const purchases = purchasesRes.data || [];
      const completedPurchases = purchases.filter((p: any) => p.status === "completed");

      const uniqueUsers = new Set(purchases.map((p: any) => p.user_id));

      setStats({
        totalProducts: productsRes.count || products.length,
        totalSales: completedPurchases.length,
        totalRevenue: completedPurchases.reduce((sum: number, p: any) => sum + (p.products?.price || 0), 0),
        totalUsers: uniqueUsers.size,
      });

      setRecentOrders(
        purchases.slice(0, 8).map((p: any) => ({
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

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const statCards = [
    { label: "Produtos", value: stats.totalProducts, icon: Package, color: "text-neon-cyan", glow: "neon-text-cyan" },
    { label: "Vendas", value: stats.totalSales, icon: ShoppingBag, color: "text-neon-pink", glow: "neon-text-pink" },
    { label: "Receita", value: `R$${stats.totalRevenue.toFixed(2)}`, icon: DollarSign, color: "text-neon-green", glow: "" },
    { label: "Usuários", value: stats.totalUsers, icon: Users, color: "text-neon-purple", glow: "neon-text-purple" },
  ];

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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display font-black text-3xl neon-gradient-text-pink-cyan">Dashboard</h1>
        <p className="text-muted-foreground font-body mt-1">Visão geral do marketplace</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((s) => (
          <div key={s.label} className="glass-card-strong rounded-2xl p-6 gradient-border">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-muted/40 flex items-center justify-center">
                <s.icon className={`w-6 h-6 ${s.color}`} />
              </div>
            </div>
            <p className={`font-display font-black text-3xl ${s.color} ${s.glow}`}>{s.value}</p>
            <p className="text-sm text-muted-foreground font-body mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="glass-card-strong rounded-2xl p-6 gradient-border">
        <h2 className="font-display font-bold text-lg text-foreground mb-5">Pedidos Recentes</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30">
                <th className="text-left py-3 px-3 font-display text-muted-foreground font-semibold">Produto</th>
                <th className="text-left py-3 px-3 font-display text-muted-foreground font-semibold">Valor</th>
                <th className="text-left py-3 px-3 font-display text-muted-foreground font-semibold">Status</th>
                <th className="text-left py-3 px-3 font-display text-muted-foreground font-semibold">Data</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order.id} className="border-b border-border/10 hover:bg-muted/10 transition-colors">
                  <td className="py-3 px-3 font-body text-foreground">{order.product_name}</td>
                  <td className="py-3 px-3 font-mono text-neon-cyan">R${order.price.toFixed(2)}</td>
                  <td className="py-3 px-3">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-display font-bold ${statusColor[order.status] || "bg-muted text-muted-foreground"}`}>
                      {statusLabel[order.status] || order.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-muted-foreground font-body text-xs">
                    {new Date(order.created_at).toLocaleDateString("pt-BR")}
                  </td>
                </tr>
              ))}
              {recentOrders.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-muted-foreground">Nenhum pedido ainda</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
