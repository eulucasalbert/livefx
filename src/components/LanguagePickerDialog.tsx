import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useLanguage, type Language } from "@/contexts/LanguageContext";

const languages: { code: Language; flag: string; label: string }[] = [
  { code: "pt", flag: "🇧🇷", label: "Português" },
  { code: "es", flag: "🇪🇸", label: "Español" },
  { code: "en", flag: "🇺🇸", label: "English" },
];

const LanguagePickerDialog = () => {
  const { showPicker, setLanguage, t } = useLanguage();

  return (
    <Dialog open={showPicker} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-sm glass-card-strong border-border/30"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center items-center">
          <DialogTitle className="font-display text-2xl font-black neon-gradient-text-pink-cyan">
            {t("lang.title")}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground font-body text-sm">
            {t("lang.subtitle")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-4">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className="flex items-center gap-4 px-6 py-4 rounded-2xl bg-muted/30 border border-border/30 hover:border-primary/50 hover:bg-muted/50 transition-all duration-200 group"
            >
              <span className="text-3xl">{lang.flag}</span>
              <span className="font-display font-bold text-foreground text-lg group-hover:text-primary transition-colors">
                {lang.label}
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LanguagePickerDialog;
