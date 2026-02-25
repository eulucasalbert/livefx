import { Package, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const bundles = [
  {
    name: "Starter Pack",
    effects: "3 efeitos TAP",
    originalPrice: 12.97,
    price: 9.99,
    discount: 23,
    color: "neon-cyan",
    glowClass: "neon-glow-cyan",
  },
  {
    name: "Pro Bundle",
    effects: "5 efeitos + 1 Glove",
    originalPrice: 32.95,
    price: 24.99,
    discount: 24,
    color: "neon-pink",
    glowClass: "neon-glow-pink",
    popular: true,
  },
  {
    name: "Ultimate Pack",
    effects: "Todos os efeitos",
    originalPrice: 69.90,
    price: 49.99,
    discount: 28,
    color: "neon-purple",
    glowClass: "neon-glow-purple",
  },
];

const BundlesSection = () => {
  return (
    <section className="py-16 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-4">
            <Package className="w-4 h-4 text-neon-cyan" />
            <span className="text-sm font-body text-muted-foreground">Economize com bundles</span>
          </div>
          <h2 className="font-display font-black text-3xl sm:text-4xl text-foreground mb-3">
            Bundle Packs
          </h2>
          <p className="text-muted-foreground font-body">
            Combine efeitos e economize até 28%
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {bundles.map((bundle) => (
            <div
              key={bundle.name}
              className={`relative glass-card rounded-2xl p-6 flex flex-col items-center text-center transition-all duration-300 hover:scale-[1.02] ${
                bundle.popular ? "border-primary/40 animate-glow-pulse" : ""
              }`}
            >
              {bundle.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-primary-foreground text-xs font-display font-bold uppercase tracking-wider neon-glow-pink">
                  Mais Popular
                </div>
              )}

              <div className={`w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4 mt-2`}>
                <Zap className={`w-8 h-8 text-${bundle.color}`} />
              </div>

              <h3 className="font-display font-bold text-xl text-foreground mb-1">
                {bundle.name}
              </h3>
              <p className="text-sm text-muted-foreground font-body mb-4">
                {bundle.effects}
              </p>

              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-sm text-muted-foreground line-through">
                  R${bundle.originalPrice.toFixed(2)}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-neon-green/10 text-neon-green text-xs font-display font-bold">
                  -{bundle.discount}%
                </span>
              </div>
              <span className={`font-display font-black text-3xl text-${bundle.color} neon-text-${bundle.color === "neon-pink" ? "pink" : bundle.color === "neon-cyan" ? "cyan" : "purple"} mb-6`}>
                R${bundle.price.toFixed(2)}
              </span>

              <Button
                className={`w-full font-display font-bold uppercase tracking-wider ${
                  bundle.popular ? "neon-glow-pink" : ""
                }`}
                variant={bundle.popular ? "default" : "outline"}
              >
                Comprar Bundle
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BundlesSection;
