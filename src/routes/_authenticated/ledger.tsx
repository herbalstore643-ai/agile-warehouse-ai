import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FileSpreadsheet, Printer } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useLocalName, useProducts, useWarehouses } from "@/hooks/useWms";
import { PageHeader } from "@/components/AppLayout";
import { exportToExcel, printReport } from "@/lib/export";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/ledger")({
  head: () => ({
    meta: [
      { title: "حساب الصنف | مخازن هيربل سبا" },
      { name: "description", content: "كشف حساب لكل صنف يعرض رصيد أول المدة والوارد والصادر والرصيد الحالي." },
      { property: "og:title", content: "حساب الصنف | مخازن هيربل سبا" },
      { property: "og:description", content: "كشف حساب الصنف قابل للطباعة والتصدير." },
    ],
  }),
  component: Ledger,
});

function Ledger() {
  const { t, lang } = useI18n();
  const localName = useLocalName();
  const { data: products = [] } = useProducts();
  const { data: warehouses = [] } = useWarehouses();
  const [productId, setProductId] = useState("");
  const [warehouseId, setWarehouseId] = useState("all");

  const { data } = useQuery({
    queryKey: ["ledger", productId, warehouseId],
    enabled: !!productId,
    queryFn: async () => {
      let bq = supabase.from("stock_balances").select("qty, opening_qty, warehouse_id").eq("product_id", productId);
      if (warehouseId !== "all") bq = bq.eq("warehouse_id", warehouseId);
      let mq = supabase
        .from("stock_movements")
        .select("*, warehouses!stock_movements_warehouse_id_fkey(name_ar,name_en)")
        .eq("product_id", productId)
        .order("created_at", { ascending: true })
        .limit(1000);
      if (warehouseId !== "all") mq = mq.eq("warehouse_id", warehouseId);
      const [balances, movements] = await Promise.all([bq, mq]);
      if (balances.error) throw balances.error;
      if (movements.error) throw movements.error;
      return { balances: balances.data ?? [], movements: movements.data ?? [] };
    },
  });

  const opening = (data?.balances ?? []).reduce((s, b) => s + Number(b.opening_qty), 0);
  const closing = (data?.balances ?? []).reduce((s, b) => s + Number(b.qty), 0);
  const movements = data?.movements ?? [];
  const totalIn = movements.filter((m) => Number(m.qty) > 0).reduce((s, m) => s + Number(m.qty), 0);
  const totalOut = movements.filter((m) => Number(m.qty) < 0).reduce((s, m) => s + Math.abs(Number(m.qty)), 0);

  const rows = movements.map((m) => {
    const w = m.warehouses as { name_ar: string; name_en: string } | null;
    return {
      [t("date")]: new Date(m.created_at).toLocaleString(),
      [t("warehouse")]: (lang === "ar" ? w?.name_ar : w?.name_en) ?? "",
      [t("type")]: t(m.type as never) ?? m.type,
      [t("qty")]: Number(m.qty),
      [t("runningBalance")]: Number(m.qty_after),
      [t("reason")]: m.reason ?? "",
    };
  });

  const product = products.find((p) => p.id === productId);
  const title = product ? `${t("ledger")} — ${product.sku} ${localName(product)}` : t("ledger");

  return (
    <>
      <PageHeader
        title={t("ledger")}
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={!rows.length} onClick={() => exportToExcel("item-ledger", rows)}>
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </Button>
            <Button variant="outline" size="sm" disabled={!rows.length} onClick={() => printReport(title, rows)}>
              <Printer className="h-4 w-4" />
              PDF
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label>{t("products")}</Label>
          <Select value={productId} onValueChange={setProductId}>
            <SelectTrigger className="w-72"><SelectValue placeholder={t("selectProduct")} /></SelectTrigger>
            <SelectContent className="max-h-64">
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.sku} — {localName(p)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>{t("warehouse")}</Label>
          <Select value={warehouseId} onValueChange={setWarehouseId}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-64">
              <SelectItem value="all">{t("allWarehouses")}</SelectItem>
              {warehouses.map((w) => (
                <SelectItem key={w.id} value={w.id}>{w.code} — {localName(w)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <Stat label={t("openingBalance")} value={opening} />
        <Stat label={t("totalIn")} value={totalIn} />
        <Stat label={t("totalOut")} value={totalOut} />
        <Stat label={t("closingBalance")} value={closing} />
      </div>

      <Card className="overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("date")}</TableHead>
              <TableHead>{t("warehouse")}</TableHead>
              <TableHead>{t("type")}</TableHead>
              <TableHead>{t("qty")}</TableHead>
              <TableHead>{t("runningBalance")}</TableHead>
              <TableHead>{t("reason")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">{t("noData")}</TableCell>
              </TableRow>
            )}
            {rows.map((r, i) => (
              <TableRow key={i}>
                {Object.values(r).map((v, j) => (
                  <TableCell key={j} className={j === 3 && Number(v) < 0 ? "font-semibold text-destructive" : ""}>
                    {String(v)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </Card>
  );
}
