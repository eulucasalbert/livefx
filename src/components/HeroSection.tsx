import { Sparkles, Zap, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

interface HeroSectionProps {
  onExplore: () => void;
}

const HeroSection = ({ onExplore }: HeroSectionProps) => {
  const { t } = useLanguage();

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden gradient-bg-animated">
      {/* Animated orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[15%] left-[20%] w-[500px] h-[500px] rounded-full bg-neon-pink/8 blur-[140px] animate-orb-float" />
        <div className="absolute bottom-[15%] right-[15%] w-[400px] h-[400px] rounded-full bg-neon-purple/8 blur-[120px] animate-orb-float" style={{ animationDelay: "3s" }} />
        <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-neon-cyan/4 blur-[180px] animate-pulse-neon" />
      </div>

      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: "50px 50px",
        }}
      />

      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#0F0F12] to-transparent z-[1]" />

      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full glass-card-strong mb-10 animate-slide-up">
          <Zap className="w-4 h-4 text-neon-cyan" />
          <span className="text-sm font-body text-muted-foreground tracking-wide">
            {t("hero.badge")}
          </span>
          <span className="w-2 h-2 rounded-full bg-neon-green pulse-dot" />
        </div>

        <h1 className="font-display font-black text-5xl sm:text-7xl md:text-[5.5rem] leading-[0.88] tracking-tight mb-8 animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <span className="text-foreground">{t("hero.title1")}</span>
          <br />
          <span className="neon-gradient-text">{t("hero.title2")}</span>
          <span className="text-foreground">{t("hero.title3")}</span>
          <br />
          <span className="text-foreground">{t("hero.title4")}</span>
          <span className="neon-gradient-text">{t("hero.title5")}</span>
        </h1>

        <p className="text-lg sm:text-xl text-muted-foreground font-body max-w-lg mx-auto mb-12 animate-slide-up leading-relaxed" style={{ animationDelay: "0.2s" }}>
          {t("hero.subtitle")}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: "0.3s" }}>
          <Button
            size="lg"
            onClick={onExplore}
            className="px-10 py-7 text-lg font-display font-bold uppercase tracking-widest neon-glow-pink hover:brightness-110 transition-all rounded-2xl"
          >
            <Sparkles className="w-5 h-5 mr-2.5" />
            {t("hero.cta")}
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={onExplore}
            className="px-10 py-7 text-lg font-display font-bold uppercase tracking-widest border-border/60 hover:neon-border-pink transition-all rounded-2xl"
          >
            {t("hero.cta2")}
          </Button>
        </div>

        <div className="mt-20 animate-float">
          <ArrowDown className="w-5 h-5 text-muted-foreground/50 mx-auto" />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
