import { Sparkles, Zap, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeroSectionProps {
  onExplore: () => void;
}

const HeroSection = ({ onExplore }: HeroSectionProps) => {
  return (
    <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden gradient-bg-animated">
      {/* Animated orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-neon-pink/10 blur-[120px] animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-neon-purple/10 blur-[100px] animate-float" style={{ animationDelay: "2s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-neon-cyan/5 blur-[150px] animate-pulse-neon" />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-8 animate-slide-up">
          <Zap className="w-4 h-4 text-neon-cyan" />
          <span className="text-sm font-body text-muted-foreground">
            Efeitos exclusivos para TikTok Live
          </span>
          <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse-neon" />
        </div>

        {/* Title */}
        <h1 className="font-display font-black text-5xl sm:text-7xl md:text-8xl leading-[0.9] tracking-tight mb-6 animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <span className="text-foreground">ELEVE SUA</span>
          <br />
          <span className="neon-gradient-text">LIVE</span>
          <span className="text-foreground"> AO</span>
          <br />
          <span className="text-foreground">PRÓXIMO </span>
          <span className="neon-gradient-text">NÍVEL</span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg sm:text-xl text-muted-foreground font-body max-w-xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: "0.2s" }}>
          Efeitos visuais premium que transformam suas lives em espetáculos. 
          Tap effects, gloves, hearts e muito mais.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: "0.3s" }}>
          <Button
            size="lg"
            onClick={onExplore}
            className="px-8 py-6 text-lg font-display font-bold uppercase tracking-wider neon-glow-pink hover:brightness-110 transition-all"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Explorar Efeitos
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={onExplore}
            className="px-8 py-6 text-lg font-display font-bold uppercase tracking-wider border-border hover:neon-border-pink transition-all"
          >
            Ver Bundles
          </Button>
        </div>

        {/* Scroll indicator */}
        <div className="mt-16 animate-float">
          <ArrowDown className="w-6 h-6 text-muted-foreground mx-auto" />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
