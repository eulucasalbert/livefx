import { Sparkles, Zap, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeroSectionProps {
  onExplore: () => void;
}

const HeroSection = ({ onExplore }: HeroSectionProps) => {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden gradient-bg-animated">
      {/* Animated orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[15%] left-[20%] w-[500px] h-[500px] rounded-full bg-neon-pink/8 blur-[140px] animate-orb-float" />
        <div className="absolute bottom-[15%] right-[15%] w-[400px] h-[400px] rounded-full bg-neon-purple/8 blur-[120px] animate-orb-float" style={{ animationDelay: "3s" }} />
        <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-neon-cyan/4 blur-[180px] animate-pulse-neon" />
      </div>

      {/* Fine grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: "50px 50px",
        }}
      />

      {/* Top fade for seamless header blend */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#0F0F12] to-transparent z-[1]" />

      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        {/* Badge */}
        <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full glass-card-strong mb-10 animate-slide-up">
          <Zap className="w-4 h-4 text-neon-cyan" />
          <span className="text-sm font-body text-muted-foreground tracking-wide">
            Efeitos exclusivos para TikTok Live
          </span>
          <span className="w-2 h-2 rounded-full bg-neon-green pulse-dot" />
        </div>

        {/* Title */}
        <h1 className="font-display font-black text-5xl sm:text-7xl md:text-[5.5rem] leading-[0.88] tracking-tight mb-8 animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <span className="text-foreground">ELEVE SUA</span>
          <br />
          <span className="neon-gradient-text">LIVE</span>
          <span className="text-foreground"> AO</span>
          <br />
          <span className="text-foreground">PRÓXIMO </span>
          <span className="neon-gradient-text">NÍVEL</span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg sm:text-xl text-muted-foreground font-body max-w-lg mx-auto mb-12 animate-slide-up leading-relaxed" style={{ animationDelay: "0.2s" }}>
          Efeitos visuais premium que transformam suas lives em espetáculos.
          Tap effects, gloves, hearts e muito mais.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: "0.3s" }}>
          <Button
            size="lg"
            onClick={onExplore}
            className="px-10 py-7 text-lg font-display font-bold uppercase tracking-widest neon-glow-pink hover:brightness-110 transition-all rounded-2xl"
          >
            <Sparkles className="w-5 h-5 mr-2.5" />
            Explorar Efeitos
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={onExplore}
            className="px-10 py-7 text-lg font-display font-bold uppercase tracking-widest border-border/60 hover:neon-border-pink transition-all rounded-2xl"
          >
            Ver Bundles
          </Button>
        </div>

        {/* Scroll indicator */}
        <div className="mt-20 animate-float">
          <ArrowDown className="w-5 h-5 text-muted-foreground/50 mx-auto" />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
