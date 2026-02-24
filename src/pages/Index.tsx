import { useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, LogIn, LogOut } from "lucide-react";
import CategoryTabs from "@/components/CategoryTabs";
import ProductCard from "@/components/ProductCard";
import { useProducts } from "@/hooks/useProducts";
import { useAuth } from "@/hooks/useAuth";
import type { Category } from "@/data/products";

const Index = () => {
  const [activeCategory, setActiveCategory] = useState<Category>("ALL");
  const { data: products = [], isLoading } = useProducts();
  const { user, signOut } = useAuth();

  const filtered =
    activeCategory === "ALL"
      ? products
      : products.filter((p: any) => p.category === activeCategory);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary neon-text-pink" />
              <h1 className="font-display font-black text-xl tracking-tight text-foreground">
                LIVE<span className="text-primary">FX</span>
              </h1>
            </div>
            {user ? (
              <button
                onClick={signOut}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            ) : (
              <Link
                to="/auth"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </Link>
            )}
          </div>
          <CategoryTabs active={activeCategory} onChange={setActiveCategory} />
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <p className="font-display font-semibold">Loading effects...</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {filtered.map((product: any) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Sparkles className="w-10 h-10 mb-3 opacity-40" />
            <p className="font-display font-semibold">No effects in this category yet</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
