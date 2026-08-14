import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

export function useProducts() {
  return useQuery({
    queryKey: ["wms-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, sku, barcode, name_ar, name_en, unit, purchase_price, category_id")
        .eq("is_active", true)
        .order("name_ar");
      if (error) throw error;
      return data;
    },
  });
}

export function useWarehouses() {
  return useQuery({
    queryKey: ["wms-warehouses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warehouses")
        .select("id, code, name_ar, name_en, type")
        .eq("is_active", true)
        .order("code");
      if (error) throw error;
      return data;
    },
  });
}

export function useSuppliers() {
  return useQuery({
    queryKey: ["wms-suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("id, name_ar, name_en")
        .eq("is_active", true)
        .order("name_ar");
      if (error) throw error;
      return data;
    },
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["wms-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id, name_ar, name_en").order("name_ar");
      if (error) throw error;
      return data;
    },
  });
}

export function useMyWarehouses() {
  return useQuery({
    queryKey: ["wms-my-warehouses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_warehouses").select("warehouse_id");
      if (error) throw error;
      return (data ?? []).map((r) => r.warehouse_id);
    },
  });
}

export function useLocalName() {
  const { lang } = useI18n();
  return (row: { name_ar: string; name_en?: string | null } | null | undefined) =>
    !row ? "" : lang === "ar" ? row.name_ar : (row.name_en ?? row.name_ar);
}

export async function nextDocNo(prefix: string) {
  const { data, error } = await supabase.rpc("next_doc_no", { _prefix: prefix });
  if (error) throw error;
  return data as string;
}
