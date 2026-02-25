import { Users, Star, Zap, Download } from "lucide-react";

const stats = [
  { icon: Users, value: "2.5K+", label: "Streamers", color: "text-neon-pink" },
  { icon: Star, value: "4.9", label: "Avaliação", color: "text-neon-cyan" },
  { icon: Zap, value: "50+", label: "Efeitos", color: "text-neon-purple" },
  { icon: Download, value: "10K+", label: "Downloads", color: "text-neon-green" },
];

const SocialProofSection = () => {
  return (
    <section className="py-16 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="glass-card rounded-2xl p-8 sm:p-12">
          <div className="text-center mb-10">
            <h2 className="font-display font-black text-3xl sm:text-4xl text-foreground mb-3">
              Confiado pelos melhores streamers
            </h2>
            <p className="text-muted-foreground font-body max-w-lg mx-auto">
              Junte-se a milhares de criadores que já transformaram suas lives com nossos efeitos
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div className={`font-display font-black text-3xl sm:text-4xl ${stat.color}`}>
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground font-body mt-1">
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
