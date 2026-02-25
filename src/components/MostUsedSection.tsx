import { TrendingUp } from "lucide-react";
import ProductCard from "@/components/ProductCard";

interface MostUsedSectionProps {
  products: any[];
  purchasedIds: string[];
}

const MostUsedSection = ({ products, purchasedIds }: MostUsedSectionProps) => {
  // Show top 4 products as "most used"
  const featured = products.slice(0, 4);

  if (featured.length === 0) return null;

  return (
    <section className="py-16 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-neon-pink/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-neon-pink" />
          </div>
          <div>
            <h2 className="font-display font-black text-2xl sm:text-3xl text-foreground">
              Mais usados nas lives
            </h2>
            <p className="text-sm text-muted-foreground font-body">
              Os efeitos favoritos dos streamers
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {featured.map((product: any) => (
            <ProductCard
              key={product.id}
              product={product}
              purchased={purchasedIds.includes(product.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default MostUsedSection;
