import { categories, type Category } from "@/data/products";
import { cn } from "@/lib/utils";

interface CategoryTabsProps {
  active: Category;
  onChange: (cat: Category) => void;
}

const CategoryTabs = ({ active, onChange }: CategoryTabsProps) => {
  return (
    <nav className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none px-1">
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => onChange(cat)}
          className={cn(
            "relative px-5 py-2.5 rounded-lg font-display font-bold text-sm tracking-wider uppercase whitespace-nowrap transition-all duration-300",
            active === cat
              ? "bg-primary text-primary-foreground neon-glow-pink animate-tab-glow"
              : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
          )}
        >
          {cat}
        </button>
      ))}
    </nav>
  );
};

export default CategoryTabs;
