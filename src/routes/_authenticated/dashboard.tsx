import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Package, Warehouse, AlertTriangle, Coins } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { PageHeader } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "لوحة التحكم | مخازن هيربل سبا" },
      { name: "description", content: "نظرة عامة على أرصدة المخازن والحركات والتنبيهات." },
      { property: "og:title", content: "لوحة التحكم | مخازن هيربل سبا" },
      { property: "og:description", content: "نظرة عامة على أرصدة المخازن والحركات." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { t, lang } = useI18n();

  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [warehouses, products, balances, movements] = await Promise.all([
        supabase.from("warehouses").select("id, name_ar, name_en, type, is_active"),
        supabase.from("products").select("id, name_ar, name_en, min_qty, purchase_price, is_active"),
        supabase.from("stock_balances").select("product_id, warehouse_id, qty"),
        supabase
          .from("stock_movements")
          .select("id, type, qty, created_at, product_id, warehouse_id")
          .order("created_at", { ascending: false })
          .limit(10),
      ]);
      return {
        warehouses: warehouses.data ?? [],
        products: products.data ?? [],
        balances: balances.data ?? [],
        movements: movements.data ?? [],
      };
    },
  });

  const warehouses = data?.warehouses ?? [];
  const products = data?.products ?? [];
  const balances = data?.balances ?? [];
  const priceOf = new Map(products.map((p) => [p.id, Number(p.purchase_price)]));
  const nameOf = new Map(products.map((p) => [p.id, lang === "ar" ? p.name_ar : (p.name_en ?? p.name_ar)]));
  const whName = new Map(warehouses.map((w) => [w.id, lang === "ar" ? w.name_ar : w.name_en]));

  const totalQty = balances.reduce((s, b) => s + Number(b.qty), 0);
  const totalValue = balances.reduce((s, b) => s + Number(b.qty) * (priceOf.get(b.product_id) ?? 0), 0);
  const perProduct = new Map<string, number>();
  balances.forEach((b) => perProduct.set(b.product_id, (perProduct.get(b.product_id) ?? 0) + Number(b.qty)));
  const lowStock = products.filter((p) => (perProduct.get(p.id) ?? 0) <= Number(p.min_qty));

  const chart = warehouses
    .map((w) => ({
      name: (lang === "ar" ? w.name_ar : w.name_en).slice(0, 14),
      qty: balances.filter((b) => b.warehouse_id === w.id).reduce((s, b) => s + Number(b.qty), 0),
    }))
    .filter((r) => r.qty > 0)
    .slice(0, 12);

  return (
    <>
      <PageHeader title={t("dashboard")} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={Package} label={t("totalStock")} value={totalQty.toLocaleString()} />
        <Kpi icon={Coins} label={t("stockValue")} value={totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })} />
        <Kpi icon={Warehouse} label={t("warehouses")} value={String(warehouses.length)} />
        <Kpi icon={AlertTriangle} label={t("lowStock")} value={String(lowStock.length)} tone="warn" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("stockByWarehouse")}</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {chart.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="qty" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Empty text={t("noData")} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("recentMovements")}</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.movements.length ? (
              <ul className="divide-y text-sm">
                {data.movements.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-2 py-2.5">
                    <span className="truncate">{nameOf.get(m.product_id) ?? "-"}</span>
                    <span className="text-xs text-muted-foreground">{whName.get(m.warehouse_id)}</span>
                    <span className={Number(m.qty) < 0 ? "font-semibold text-destructive" : "font-semibold text-primary"}>
                      {Number(m.qty) > 0 ? "+" : ""}
                      {Number(m.qty)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty text={t("noData")} />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Package;
  label: string;
  value: string;
  tone?: "warn";
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-6">
        <div className={`rounded-xl p-3 ${tone === "warn" ? "bg-destructive/10 text-destructive" : "bg-accent text-accent-foreground"}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-12 text-center text-sm text-muted-foreground">{text}</p>;
}