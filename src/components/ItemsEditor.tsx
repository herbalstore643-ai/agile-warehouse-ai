import { Trash2, Plus } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useLocalName, useProducts } from "@/hooks/useWms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type DocItem = {
  product_id: string;
  qty: string;
  unit_price?: string;
  batch_no?: string;
  expiry_date?: string;
  notes?: string;
};

export const emptyItem: DocItem = { product_id: "", qty: "1", unit_price: "0" };

export function ItemsEditor({
  items,
  setItems,
  showPrice = false,
  showBatch = false,
}: {
  items: DocItem[];
  setItems: (i: DocItem[]) => void;
  showPrice?: boolean;
  showBatch?: boolean;
}) {
  const { t } = useI18n();
  const { data: products = [] } = useProducts();
  const localName = useLocalName();

  const patch = (i: number, p: Partial<DocItem>) =>
    setItems(items.map((it, idx) => (idx === i ? { ...it, ...p } : it)));

  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="grid grid-cols-[1fr_auto] gap-2 rounded-lg border p-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <Select value={it.product_id} onValueChange={(v) => patch(i, { product_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder={t("selectProduct")} />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.sku} — {localName(p)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              min="0"
              step="any"
              placeholder={t("qty")}
              value={it.qty}
              onChange={(e) => patch(i, { qty: e.target.value })}
            />
            {showPrice && (
              <Input
                type="number"
                min="0"
                step="any"
                placeholder={t("price")}
                value={it.unit_price ?? "0"}
                onChange={(e) => patch(i, { unit_price: e.target.value })}
              />
            )}
            {showBatch && (
              <>
                <Input
                  placeholder={t("batchNo")}
                  value={it.batch_no ?? ""}
                  onChange={(e) => patch(i, { batch_no: e.target.value })}
                />
                <Input
                  type="date"
                  placeholder={t("expiry")}
                  value={it.expiry_date ?? ""}
                  onChange={(e) => patch(i, { expiry_date: e.target.value })}
                />
              </>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setItems(items.filter((_, idx) => idx !== i))}
            aria-label={t("remove")}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => setItems([...items, { ...emptyItem }])}>
        <Plus className="h-4 w-4" />
        {t("addItem")}
      </Button>
    </div>
  );
}

export function StatusBadgeClass(status: string) {
  switch (status) {
    case "approved":
    case "completed":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300";
    case "rejected":
    case "cancelled":
      return "bg-destructive/10 text-destructive";
    case "shipped":
    case "preparing":
      return "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300";
    default:
      return "bg-muted text-muted-foreground";
  }
}
