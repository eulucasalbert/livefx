import type { Product } from "@/data/products";
import { ShoppingCart } from "lucide-react";

const ProductCard = ({ product }: { product: Product }) => {
  return (
    <div className="group relative rounded-xl overflow-hidden bg-card border border-border card-hover">
      {/* Video Preview */}
      <div className="relative aspect-[9/16] max-h-[280px] overflow-hidden bg-background">
        <video
          src={product.preview_video_url}
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
        />
        {/* Category badge */}
        <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-display font-bold uppercase tracking-widest bg-primary/80 text-primary-foreground backdrop-blur-sm">
          {product.category}
        </span>
      </div>

      {/* Info */}
      <div className="p-4 space-y-3">
        <h3 className="font-display font-bold text-foreground text-sm truncate">
          {product.name}
        </h3>
        <div className="flex items-center justify-between">
          <span className="text-neon-cyan font-display font-extrabold text-lg neon-text-cyan">
            ${product.price.toFixed(2)}
          </span>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-display font-bold text-xs uppercase tracking-wider neon-glow-pink hover:brightness-110 transition-all duration-200">
            <ShoppingCart className="w-3.5 h-3.5" />
            Buy
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
