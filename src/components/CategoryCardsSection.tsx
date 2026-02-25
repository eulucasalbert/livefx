import { Fingerprint, Layers, Box, Hand, Heart, Sparkles } from "lucide-react";
import type { Category } from "@/data/products";

interface CategoryCardsSectionProps {
  onSelect: (cat: Category) => void;
}

const categoryData: { id: Category; label: string; icon: React.ElementType; color: string; glowClass: string; description: string }[] = [
  { id: "TAP", label: "TAP", icon: Fingerprint, color: "text-neon-pink", glowClass: "neon-glow-pink", description: "Efeitos de toque" },
  { id: "X2", label: "X2", icon: Layers, color: "text-neon-cyan", glowClass: "neon-glow-cyan", description: "Multiplicador duplo" },
  { id: "X3", label: "X3", icon: Sparkles, color: "text-neon-purple", glowClass: "neon-glow-purple", description: "Multiplicador triplo" },
  { id: "GLOVE", label: "GLOVE", icon: Hand, color: "text-neon-green", glowClass: "neon-glow-cyan", description: "Efeitos de luva" },
  { id: "HEART-ME", label: "HEART-ME", icon: Heart, color: "text-neon-pink", glowClass: "neon-glow-pink", description: "Efeitos de coração" },
];

const CategoryCardsSection = ({ onSelect }: CategoryCardsSectionProps) => {
  return (
    <section className="py-16 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-display font-black text-3xl sm:text-4xl text-foreground mb-3">
            Categorias
          </h2>
          <p className="text-muted-foreground font-body">
            Escolha o tipo de efeito perfeito para sua live
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {categoryData.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id)}
              className="group glass-card rounded-2xl p-6 flex flex-col items-center gap-3 hover:scale-105 transition-all duration-300 hover:border-primary/30"
            >
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center bg-muted/50 group-hover:${cat.glowClass} transition-all duration-300`}>
                <cat.icon className={`w-7 h-7 ${cat.color} transition-all group-hover:scale-110`} />
              </div>
              <span className="font-display font-bold text-sm text-foreground tracking-wider">
                {cat.label}
              </span>
              <span className="text-[11px] text-muted-foreground font-body">
                {cat.description}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoryCardsSection;
