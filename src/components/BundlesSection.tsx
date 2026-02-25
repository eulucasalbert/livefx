import { Package, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const bundles = [
  {
    name: "Starter Pack",
    effects: "3 efeitos TAP",
    originalPrice: 12.97,
    price: 9.99,
    discount: 23,
    colorClass: "text-neon-cyan",
    textGlow: "neon-text-cyan",
    glowClass: "neon-glow-cyan",
  },
  {
    name: "Pro Bundle",
    effects: "5 efeitos + 1 Glove",
    originalPrice: 32.95,
    price: 24.99,
    discount: 24,
    colorClass: "text-neon-pink",
    textGlow: "neon-text-pink",
    glowClass: "neon-glow-pink",
    popular: true,
  },
  {
    name: "Ultimate Pack",
    effects: "Todos os efeitos",
    originalPrice: 69.90,
    price: 49.99,
    discount: 28,
    colorClass: "text-neon-purple",
    textGlow: "neon-text-purple",
    glowClass: "neon-glow-purple",
  },
];

const BundlesSection = () => {
  return (
    <section className="py-20 px-4 relative">
      {/* Background orb */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-neon-purple/4 blur-[200px] pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full glass-card-strong mb-5">
            <Package className="w-4 h-4 text-neon-cyan" />
            <span className="text-sm font-body text-muted-foreground tracking-wide">Economize com bundles</span>
          </div>
          <h2 className="font-display font-black text-3xl sm:text-4xl neon-gradient-text-pink-cyan mb-4">
            Bundle Packs
          </h2>
          <p className="text-muted-foreground font-body text-lg">
            Combine efeitos e economize até 28%
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {bundles.map((bundle) => (
            <div
              key={bundle.name}
              className={`relative glass-card-strong rounded-3xl p-8 flex flex-col items-center text-center transition-all duration-300 hover:scale-[1.03] ${
                bundle.popular ? "border-primary/40 animate-glow-pulse" : "gradient-border"
              }`}
            >
              {bundle.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-5 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-display font-bold uppercase tracking-widest neon-glow-pink">
                  Mais Popular
                </div>
              )}

              <div className="w-18 h-18 w-[72px] h-[72px] rounded-2xl bg-muted/40 flex items-center justify-center mb-5 mt-2">
                <Zap className={`w-9 h-9 ${bundle.colorClass}`} />
              </div>

              <h3 className="font-display font-bold text-xl text-foreground mb-2">
                {bundle.name}
              </h3>
              <p className="text-sm text-muted-foreground font-body mb-5">
                {bundle.effects}
              </p>

              <div className="flex items-baseline gap-2.5 mb-2">
                <span className="text-sm text-muted-foreground line-through">
                  R${bundle.originalPrice.toFixed(2)}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-neon-green/10 text-neon-green text-xs font-display font-bold">
                  -{bundle.discount}%
                </span>
              </div>
              <span className={`font-display font-black text-4xl ${bundle.colorClass} ${bundle.textGlow} mb-7`}>
                R${bundle.price.toFixed(2)}
              </span>

              <Button
                className={`w-full font-display font-bold uppercase tracking-widest rounded-xl py-6 ${
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
