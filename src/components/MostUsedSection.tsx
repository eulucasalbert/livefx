import { TrendingUp } from "lucide-react";
import ProductCard from "@/components/ProductCard";

interface MostUsedSectionProps {
  products: any[];
  purchasedIds: string[];
  isAdmin?: boolean;
  onEdit?: (product: any) => void;
  onDelete?: (product: any) => void;
}

const MostUsedSection = ({ products, purchasedIds, isAdmin, onEdit, onDelete }: MostUsedSectionProps) => {
  const featured = products.slice(0, 4);

  if (featured.length === 0) return null;

  return (
    <section className="py-20 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-10">
          <div className="w-12 h-12 rounded-2xl bg-neon-pink/10 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-neon-pink" />
          </div>
          <div>
            <h2 className="font-display font-black text-2xl sm:text-3xl neon-gradient-text-pink-cyan">
              Mais usados nas lives
            </h2>
            <p className="text-sm text-muted-foreground font-body mt-1">
              Os efeitos favoritos dos streamers
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
          {featured.map((product: any) => (
            <ProductCard
              key={product.id}
              product={product}
              purchased={purchasedIds.includes(product.id)}
              isAdmin={!!isAdmin}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default MostUsedSection;
