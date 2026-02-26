import { categories, type Category } from "@/data/products";
import { cn } from "@/lib/utils";
import { Download } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface CategoryTabsProps {
  active: Category;
  onChange: (cat: Category) => void;
  showDownloads?: boolean;
}

const CategoryTabs = ({ active, onChange, showDownloads = false }: CategoryTabsProps) => {
  const { t } = useLanguage();
  const visibleCategories = showDownloads
    ? categories
    : categories.filter((c) => c !== "DOWNLOADS");

  return (
    <nav className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none px-1">
      {visibleCategories.map((cat) => (
        <button
          key={cat}
          onClick={() => onChange(cat)}
          className={cn(
            "relative flex items-center gap-1.5 px-5 py-2.5 rounded-lg font-display font-bold text-sm tracking-wider uppercase whitespace-nowrap transition-all duration-300",
            active === cat
              ? cat === "DOWNLOADS"
                ? "bg-secondary text-secondary-foreground neon-glow-cyan animate-tab-glow"
                : "bg-primary text-primary-foreground neon-glow-pink animate-tab-glow"
              : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
          )}
        >
          {cat === "DOWNLOADS" && <Download className="w-3.5 h-3.5" />}
          {cat === "DOWNLOADS" ? t("products.downloads_tab") : cat}
        </button>
      ))}
    </nav>
  );
};

export default CategoryTabs;
