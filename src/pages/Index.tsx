import { useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Sparkles, LogIn, LogOut, Settings } from "lucide-react";
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
import type { Category } from "@/data/products";

const Index = () => {
  const [activeCategory, setActiveCategory] = useState<Category>("ALL");
  const { data: products = [], isLoading } = useProducts();
  const { data: purchasedIds = [] } = usePurchases();
  const { user, signOut } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const [searchParams, setSearchParams] = useSearchParams();
  const productsRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/60 backdrop-blur-xl">
        <div className="container max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary neon-text-pink" />
              <h1 className="font-display font-black text-xl tracking-tight text-foreground">
                LIVE<span className="text-primary">FX</span>
              </h1>
            </div>
            {user ? (
              <div className="flex items-center gap-3">
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
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
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
      <MostUsedSection products={products} purchasedIds={purchasedIds} />

      {/* Bundles */}
      <BundlesSection />

      {/* All Products */}
      <section ref={productsRef} className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="font-display font-black text-3xl sm:text-4xl text-foreground mb-3">
              Todos os Efeitos
            </h2>
            <p className="text-muted-foreground font-body mb-8">
              Explore nossa coleção completa de efeitos visuais
            </p>
          </div>

          <div className="mb-8">
            <CategoryTabs active={activeCategory} onChange={setActiveCategory} showDownloads={!!user} />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              <p className="font-display font-semibold">Carregando efeitos...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filtered.map((product: any) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  purchased={purchasedIds.includes(product.id)}
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
      <footer className="border-t border-border/50 py-8 px-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="font-display font-bold text-foreground">
              LIVE<span className="text-primary">FX</span>
            </span>
          </div>
          <p className="text-sm text-muted-foreground font-body">
            © 2025 LiveFX. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
