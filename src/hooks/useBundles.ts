import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useBundles = () => {
  return useQuery({
    queryKey: ["bundles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bundles")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });
};
