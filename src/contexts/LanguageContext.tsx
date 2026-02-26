import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export type Language = "pt" | "es" | "en";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  formatPrice: (priceInBRL: number) => string;
  showPicker: boolean;
  setShowPicker: (show: boolean) => void;
}

const BRL_TO_USD = 0.18; // ~5.5 BRL per USD

const translations: Record<Language, Record<string, string>> = {
  pt: {
    // Header
    "header.enter": "Entrar",
    "header.exit": "Sair",
    // Hero
    "hero.badge": "Efeitos exclusivos para TikTok Live",
    "hero.title1": "ELEVE SUA",
    "hero.title2": "LIVE",
    "hero.title3": " AO",
    "hero.title4": "PRÓXIMO ",
    "hero.title5": "NÍVEL",
    "hero.subtitle": "Efeitos visuais premium que transformam suas lives em espetáculos. Tap effects, gloves, hearts e muito mais.",
    "hero.cta": "Explorar Efeitos",
    "hero.cta2": "Ver Bundles",
    // Social Proof
    "social.title": "Confiado pelos melhores streamers",
    "social.subtitle": "Junte-se a milhares de criadores que já transformaram suas lives",
    "social.streamers": "Streamers",
    "social.rating": "Avaliação",
    "social.effects": "Efeitos",
    "social.downloads": "Downloads",
    // Categories
    "cat.title": "Categorias",
    "cat.subtitle": "Escolha o tipo de efeito perfeito para sua live",
    "cat.TAP": "Efeitos de toque",
    "cat.X2": "Multiplicador duplo",
    "cat.X3": "Multiplicador triplo",
    "cat.GLOVE": "Efeitos de luva",
    "cat.HEART-ME": "Efeitos de coração",
    "cat.OUTROS": "Outros efeitos",
    // Most Used
    "most.title": "Mais usados nas lives",
    "most.subtitle": "Os efeitos favoritos dos streamers",
    // Bundles
    "bundles.badge": "Economize com combos",
    "bundles.title": "Combos de Efeitos",
    "bundles.subtitle": "Combine efeitos e pague menos",
    "bundles.popular": "Mais Popular",
    "bundles.buy": "Comprar Combo",
    "bundles.processing": "Processando...",
    // Products
    "products.title": "Todos os Efeitos",
    "products.subtitle": "Explore nossa coleção completa de efeitos visuais",
    "products.loading": "Carregando efeitos...",
    "products.empty": "Nenhum efeito nesta categoria",
    "products.empty_downloads": "Você ainda não comprou nenhum efeito",
    "products.downloads_tab": "Meus Downloads",
    "products.download_info": "Após a compra, faça o download direto desta página assim que o pagamento for confirmado.",
    // Product Card
    "card.preview": "Preview indisponível",
    "card.sold_out": "Esgotado",
    "card.download": "Download",
    "card.buy": "Comprar",
    // Footer
    "footer.rights": "© 2025 LiveFX. Todos os direitos reservados.",
    // Toasts
    "toast.purchase_success": "Compra realizada!",
    "toast.purchase_success_desc": "Seu efeito estará disponível em instantes.",
    "toast.purchase_fail": "Pagamento não aprovado",
    "toast.purchase_fail_desc": "Tente novamente.",
    "toast.purchase_pending": "Pagamento pendente",
    "toast.purchase_pending_desc": "Aguardando confirmação do pagamento.",
    "toast.download_prep": "Preparando download",
    "toast.download_prep_desc": "Seu download inicia em alguns segundos...",
    // Language picker
    "lang.title": "Escolha seu idioma",
    "lang.subtitle": "Choose your language / Elige tu idioma",
  },
  en: {
    "header.enter": "Sign In",
    "header.exit": "Sign Out",
    "hero.badge": "Exclusive effects for TikTok Live",
    "hero.title1": "TAKE YOUR",
    "hero.title2": "LIVE",
    "hero.title3": " TO THE",
    "hero.title4": "NEXT ",
    "hero.title5": "LEVEL",
    "hero.subtitle": "Premium visual effects that turn your lives into spectacles. Tap effects, gloves, hearts and much more.",
    "hero.cta": "Explore Effects",
    "hero.cta2": "See Bundles",
    "social.title": "Trusted by the best streamers",
    "social.subtitle": "Join thousands of creators who already transformed their lives",
    "social.streamers": "Streamers",
    "social.rating": "Rating",
    "social.effects": "Effects",
    "social.downloads": "Downloads",
    "cat.title": "Categories",
    "cat.subtitle": "Choose the perfect effect type for your live",
    "cat.TAP": "Tap effects",
    "cat.X2": "Double multiplier",
    "cat.X3": "Triple multiplier",
    "cat.GLOVE": "Glove effects",
    "cat.HEART-ME": "Heart effects",
    "cat.OUTROS": "Other effects",
    "most.title": "Most used in lives",
    "most.subtitle": "Streamers' favorite effects",
    "bundles.badge": "Save with combos",
    "bundles.title": "Effect Combos",
    "bundles.subtitle": "Combine effects and pay less",
    "bundles.popular": "Most Popular",
    "bundles.buy": "Buy Combo",
    "bundles.processing": "Processing...",
    "products.title": "All Effects",
    "products.subtitle": "Explore our complete collection of visual effects",
    "products.loading": "Loading effects...",
    "products.empty": "No effects in this category",
    "products.empty_downloads": "You haven't purchased any effects yet",
    "products.downloads_tab": "My Downloads",
    "products.download_info": "After purchase, download directly from this page once your payment is confirmed.",
    "card.preview": "Preview unavailable",
    "card.sold_out": "Sold Out",
    "card.download": "Download",
    "card.buy": "Buy PayPal",
    "footer.rights": "© 2025 LiveFX. All rights reserved.",
    "toast.purchase_success": "Purchase completed!",
    "toast.purchase_success_desc": "Your effect will be available shortly.",
    "toast.purchase_fail": "Payment not approved",
    "toast.purchase_fail_desc": "Please try again.",
    "toast.purchase_pending": "Payment pending",
    "toast.purchase_pending_desc": "Waiting for payment confirmation.",
    "toast.download_prep": "Preparing download",
    "toast.download_prep_desc": "Your download will start in a few seconds...",
    "lang.title": "Choose your language",
    "lang.subtitle": "Choose your language / Elige tu idioma",
  },
  es: {
    "header.enter": "Iniciar sesión",
    "header.exit": "Salir",
    "hero.badge": "Efectos exclusivos para TikTok Live",
    "hero.title1": "LLEVA TU",
    "hero.title2": "LIVE",
    "hero.title3": " AL",
    "hero.title4": "SIGUIENTE ",
    "hero.title5": "NIVEL",
    "hero.subtitle": "Efectos visuales premium que transforman tus lives en espectáculos. Tap effects, gloves, hearts y mucho más.",
    "hero.cta": "Explorar Efectos",
    "hero.cta2": "Ver Combos",
    "social.title": "Confiado por los mejores streamers",
    "social.subtitle": "Únete a miles de creadores que ya transformaron sus lives",
    "social.streamers": "Streamers",
    "social.rating": "Calificación",
    "social.effects": "Efectos",
    "social.downloads": "Descargas",
    "cat.title": "Categorías",
    "cat.subtitle": "Elige el tipo de efecto perfecto para tu live",
    "cat.TAP": "Efectos de toque",
    "cat.X2": "Multiplicador doble",
    "cat.X3": "Multiplicador triple",
    "cat.GLOVE": "Efectos de guante",
    "cat.HEART-ME": "Efectos de corazón",
    "cat.OUTROS": "Otros efectos",
    "most.title": "Más usados en lives",
    "most.subtitle": "Los efectos favoritos de los streamers",
    "bundles.badge": "Ahorra con combos",
    "bundles.title": "Combos de Efectos",
    "bundles.subtitle": "Combina efectos y paga menos",
    "bundles.popular": "Más Popular",
    "bundles.buy": "Comprar Combo",
    "bundles.processing": "Procesando...",
    "products.title": "Todos los Efectos",
    "products.subtitle": "Explora nuestra colección completa de efectos visuales",
    "products.loading": "Cargando efectos...",
    "products.empty": "Ningún efecto en esta categoría",
    "products.empty_downloads": "Aún no has comprado ningún efecto",
    "products.downloads_tab": "Mis Descargas",
    "products.download_info": "Después de la compra, descarga directamente desde esta página una vez confirmado el pago.",
    "card.preview": "Vista previa no disponible",
    "card.sold_out": "Agotado",
    "card.download": "Descargar",
    "card.buy": "Buy PayPal",
    "footer.rights": "© 2025 LiveFX. Todos los derechos reservados.",
    "toast.purchase_success": "¡Compra realizada!",
    "toast.purchase_success_desc": "Tu efecto estará disponible en instantes.",
    "toast.purchase_fail": "Pago no aprobado",
    "toast.purchase_fail_desc": "Inténtalo de nuevo.",
    "toast.purchase_pending": "Pago pendiente",
    "toast.purchase_pending_desc": "Esperando confirmación del pago.",
    "toast.download_prep": "Preparando descarga",
    "toast.download_prep_desc": "Tu descarga iniciará en unos segundos...",
    "lang.title": "Elige tu idioma",
    "lang.subtitle": "Choose your language / Elige tu idioma",
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>("pt");
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("livefx-lang") as Language | null;
    if (saved && ["pt", "es", "en"].includes(saved)) {
      setLanguageState(saved);
    } else {
      setShowPicker(true);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("livefx-lang", lang);
    setShowPicker(false);
  };

  const t = (key: string): string => {
    return translations[language]?.[key] || translations.pt[key] || key;
  };

  const formatPrice = (priceInBRL: number): string => {
    if (language === "pt") {
      return `R$${priceInBRL.toFixed(2)}`;
    }
    const usd = priceInBRL * BRL_TO_USD;
    return `$${usd.toFixed(2)}`;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, formatPrice, showPicker, setShowPicker }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
};
