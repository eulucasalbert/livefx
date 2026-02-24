import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const productId = searchParams.get("product_id");
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [product, setProduct] = useState<any>(null);

  useEffect(() => {
    const verify = async () => {
      if (!sessionId) {
        setStatus("error");
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("verify-payment", {
          body: { sessionId },
        });
        if (error || !data?.success) throw new Error("Verification failed");

        if (productId) {
          const { data: prod } = await supabase
            .from("products")
            .select("*")
            .eq("id", productId)
            .single();
          setProduct(prod);
        }

        setStatus("success");
      } catch {
        setStatus("error");
      }
    };
    verify();
  }, [sessionId, productId]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="bg-card border border-border rounded-xl p-8 max-w-md w-full text-center space-y-4">
        {status === "verifying" && (
          <>
            <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin" />
            <p className="font-display font-bold text-foreground">Verifying payment...</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle className="w-12 h-12 text-neon-green mx-auto" />
            <h2 className="font-display font-bold text-xl text-foreground">Payment Successful!</h2>
            {product && (
              <div className="space-y-3">
                <p className="text-muted-foreground">{product.name} is now yours</p>
                {product.download_file_url && product.download_file_url !== "#" && (
                  <a href={product.download_file_url} target="_blank" rel="noopener noreferrer">
                    <Button className="neon-glow-cyan font-display font-bold uppercase tracking-wider bg-secondary text-secondary-foreground">
                      <Download className="w-4 h-4 mr-2" />
                      Download Now
                    </Button>
                  </a>
                )}
              </div>
            )}
            <Link to="/">
              <Button variant="ghost" className="text-muted-foreground mt-2">
                ← Back to Store
              </Button>
            </Link>
          </>
        )}
        {status === "error" && (
          <>
            <p className="font-display font-bold text-destructive">Something went wrong</p>
            <Link to="/">
              <Button variant="ghost">← Back to Store</Button>
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccess;
