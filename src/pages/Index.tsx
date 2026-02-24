import { useState } from "react";
import { Sparkles } from "lucide-react";
import CategoryTabs from "@/components/CategoryTabs";
import ProductCard from "@/components/ProductCard";
import { products, type Category } from "@/data/products";

const Index = () => {
  const [activeCategory, setActiveCategory] = useState<Category>("ALL");

  const filtered =
    activeCategory === "ALL"
      ? products
      : products.filter((p) => p.category === activeCategory);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-6 h-6 text-primary neon-text-pink" />
            <h1 className="font-display font-black text-xl tracking-tight text-foreground">
              LIVE<span className="text-primary">FX</span>
            </h1>
          </div>
          <CategoryTabs active={activeCategory} onChange={setActiveCategory} />
        </div>
      </header>

      {/* Product Grid */}
      <main className="container max-w-5xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {filtered.length === 0 && (
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
