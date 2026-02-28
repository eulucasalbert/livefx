import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Trash2, Loader2, Package } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";

interface CartSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CartSheet = ({ open, onOpenChange }: CartSheetProps) => {
  const { items, removeFromCart, clearCart, totalPrice } = useCart();
  const { t, formatPrice, language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const usePayPal = language === "en" || language === "es";

  const handleCheckout = async () => {
    if (!user) {
      onOpenChange(false);
      navigate("/auth");
      return;
    }
    if (items.length === 0) return;

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const endpoint = usePayPal ? "create-checkout-paypal" : "create-checkout";
      const productIds = items.map((i) => i.productId);

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/${endpoint}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ productIds }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout failed");

      clearCart();
      window.location.href = usePayPal ? data.approve_url : data.init_point;
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="bg-[#0F0F12] border-l border-border/30 flex flex-col w-full sm:max-w-md"
      >
        <SheetHeader>
          <SheetTitle className="font-display font-bold text-lg neon-gradient-text-pink-cyan flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-neon-cyan" />
            {t("cart.title")}
          </SheetTitle>
          <SheetDescription className="sr-only">
            {t("cart.title")}
          </SheetDescription>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center">
              <Package className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <div>
              <p className="font-display font-semibold text-foreground">{t("cart.empty")}</p>
              <p className="text-sm text-muted-foreground">{t("cart.empty_sub")}</p>
            </div>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl border-border/30 font-display"
            >
              {t("cart.continue")}
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto space-y-3 py-4">
              {items.map((item) => (
                <div
                  key={item.productId}
                  className="flex items-center gap-3 p-3 rounded-xl glass-card border border-border/30"
                >
                  {item.coverImage ? (
                    <img
                      src={item.coverImage}
                      alt={item.name}
                      className="w-14 h-14 rounded-lg object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-muted/30 flex items-center justify-center shrink-0">
                      <Package className="w-6 h-6 text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-sm text-foreground truncate">
                      {item.name}
                    </p>
                    <span className="text-xs text-muted-foreground uppercase font-display tracking-wider">
                      {item.category}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-neon-cyan font-display font-extrabold text-sm neon-text-cyan">
                      {formatPrice(item.price)}
                    </span>
                    <button
                      onClick={() => removeFromCart(item.productId)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      title={t("cart.remove")}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-border/30 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-display font-semibold text-foreground">
                  {t("cart.total")}
                </span>
                <span className="font-display font-extrabold text-xl text-neon-cyan neon-text-cyan">
                  {formatPrice(totalPrice)}
                </span>
              </div>
              <Button
                onClick={handleCheckout}
                disabled={loading}
                className="w-full font-display font-bold uppercase tracking-wider neon-glow-pink rounded-xl py-6 gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ShoppingCart className="w-4 h-4" />
                )}
                {loading ? t("cart.checkout_processing") : t("cart.checkout")}
              </Button>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="w-full font-display font-bold uppercase tracking-wider rounded-xl border-border/30"
              >
                {t("cart.continue")}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default CartSheet;
