import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, LayoutDashboard, Package, ShoppingBag, Users, ArrowLeft, Sparkles, Layers } from "lucide-react";
import AdminDashboard from "@/components/admin/AdminDashboard";
import AdminProducts from "@/components/admin/AdminProducts";
import AdminOrders from "@/components/admin/AdminOrders";
import AdminUsers from "@/components/admin/AdminUsers";
import AdminBundles from "@/components/admin/AdminBundles";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "products", label: "Produtos", icon: Package },
  { id: "bundles", label: "Bundles", icon: Layers },
  { id: "orders", label: "Pedidos", icon: ShoppingBag },
  { id: "users", label: "Usuários", icon: Users },
] as const;

type TabId = (typeof tabs)[number]["id"];

const Admin = () => {
  const { user, loading: authLoading } = useAuth();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");

  const stillLoading = authLoading || adminLoading;

  useEffect(() => {
    if (!stillLoading && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, stillLoading, navigate]);

  if (stillLoading || !isAdmin) {
    return (
      <div className="min-h-screen bg-[#0F0F12] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F0F12] flex">
      {/* Sidebar */}
      <aside className="fixed top-0 left-0 bottom-0 w-64 glass-card-strong border-r border-border/30 flex flex-col z-50">
        {/* Logo */}
        <div className="p-6 border-b border-border/20">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-6 h-6 text-primary neon-text-pink" />
            <span className="font-display font-black text-lg">
              <span className="text-foreground">LIVE</span>
              <span className="neon-gradient-text-pink-cyan">FX</span>
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 font-body">Admin Panel</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-display font-semibold text-sm transition-all duration-200",
                activeTab === tab.id
                  ? "bg-primary/15 text-primary neon-border-pink"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Back */}
        <div className="p-4 border-t border-border/20">
          <button
            onClick={() => navigate("/")}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-display font-semibold text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar ao site
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8">
        {activeTab === "dashboard" && <AdminDashboard />}
        {activeTab === "products" && <AdminProducts />}
        {activeTab === "bundles" && <AdminBundles />}
        {activeTab === "orders" && <AdminOrders />}
        {activeTab === "users" && <AdminUsers />}
      </main>
    </div>
  );
};

export default Admin;
