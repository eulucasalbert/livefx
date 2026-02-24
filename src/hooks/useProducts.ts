import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useProducts = () => {
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("created_at");
      if (error) throw error;
      return data;
    },
  });
};

export const usePurchases = () => {
  return useQuery({
    queryKey: ["purchases"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("purchases")
        .select("product_id")
        .eq("user_id", user.id)
        .eq("status", "completed");
      if (error) throw error;
      return data.map((p: any) => p.product_id as string);
    },
  });
};
