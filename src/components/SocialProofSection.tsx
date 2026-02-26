import { Users, Star, Zap, Download } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { useLanguage } from "@/contexts/LanguageContext";

const SocialProofSection = () => {
  const { data: products = [] } = useProducts();
  const { t } = useLanguage();

  const stats = [
    { icon: Users, value: "200+", label: t("social.streamers"), color: "text-neon-pink", textGlow: "neon-text-pink" },
    { icon: Star, value: "4.9", label: t("social.rating"), color: "text-neon-cyan", textGlow: "neon-text-cyan" },
    { icon: Zap, value: `${products.length}+`, label: t("social.effects"), color: "text-neon-purple", textGlow: "neon-text-purple" },
    { icon: Download, value: "500+", label: t("social.downloads"), color: "text-neon-green", textGlow: "" },
  ];

  return (
    <section className="py-20 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="glass-card-strong rounded-3xl p-10 sm:p-14 gradient-border">
          <div className="text-center mb-12">
            <h2 className="font-display font-black text-3xl sm:text-4xl neon-gradient-text mb-4">
              {t("social.title")}
            </h2>
            <p className="text-muted-foreground font-body max-w-lg mx-auto text-lg">
              {t("social.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-muted/40 flex items-center justify-center mx-auto mb-4">
                  <stat.icon className={`w-7 h-7 ${stat.color}`} />
                </div>
                <div className={`font-display font-black text-3xl sm:text-4xl ${stat.color} ${stat.textGlow}`}>
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground font-body mt-2">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SocialProofSection;
