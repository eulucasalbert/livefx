import { Fingerprint, Layers, Box, Hand, Heart, Sparkles, MoreHorizontal } from "lucide-react";
import type { Category } from "@/data/products";

interface CategoryCardsSectionProps {
  onSelect: (cat: Category) => void;
}

const categoryData: { id: Category; label: string; icon: React.ElementType; color: string; description: string }[] = [
  { id: "TAP", label: "TAP", icon: Fingerprint, color: "text-neon-pink", description: "Efeitos de toque" },
  { id: "X2", label: "X2", icon: Layers, color: "text-neon-cyan", description: "Multiplicador duplo" },
  { id: "X3", label: "X3", icon: Sparkles, color: "text-neon-purple", description: "Multiplicador triplo" },
  { id: "GLOVE", label: "GLOVE", icon: Hand, color: "text-neon-green", description: "Efeitos de luva" },
  { id: "HEART-ME", label: "HEART-ME", icon: Heart, color: "text-neon-pink", description: "Efeitos de coração" },
  { id: "OUTROS", label: "OUTROS", icon: MoreHorizontal, color: "text-neon-cyan", description: "Outros efeitos" },
];

const CategoryCardsSection = ({ onSelect }: CategoryCardsSectionProps) => {
  return (
    <section className="py-20 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="font-display font-black text-3xl sm:text-4xl neon-gradient-text-pink-cyan mb-4">
            Categorias
          </h2>
          <p className="text-muted-foreground font-body text-lg">
            Escolha o tipo de efeito perfeito para sua live
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-5">
          {categoryData.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id)}
              className="group glass-card-strong rounded-2xl p-7 flex flex-col items-center gap-4 hover:scale-105 transition-all duration-300 hover:border-primary/30 gradient-border"
            >
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-muted/40 transition-all duration-300 group-hover:bg-muted/60">
                <cat.icon className={`w-8 h-8 ${cat.color} transition-all group-hover:scale-110`} />
              </div>
              <span className="font-display font-bold text-sm text-foreground tracking-wider">
                {cat.label}
              </span>
              <span className="text-[11px] text-muted-foreground font-body leading-snug">
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
