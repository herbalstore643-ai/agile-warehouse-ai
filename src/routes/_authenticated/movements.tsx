import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FileSpreadsheet, Printer } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { PageHeader } from "@/components/AppLayout";
import { exportToExcel, printReport } from "@/lib/export";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/movements")({
  head: () => ({
    meta: [
      { title: "حركة المخزون | مخازن هيربل سبا" },
      { name: "description", content: "سجل كامل لكل حركة مخزون بالرصيد قبل وبعد والتاريخ والمستخدم." },
      { property: "og:title", content: "حركة المخزون | مخازن هيربل سبا" },
      { property: "og:description", content: "سجل حركات المخزون بالفترات." },
    ],
  }),
  component: Movements,
});

function Movements() {
  const { t, lang } = useI18n();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data } = useQuery({
    queryKey: ["movements", from, to],
    queryFn: async () => {
      let q = supabase
        .from("stock_movements")
        .select("*, products(name_ar,name_en,sku), warehouses!stock_movements_warehouse_id_fkey(name_ar,name_en)")
        .order("created_at", { ascending: false })
        .limit(500);
      if (from) q = q.gte("created_at", from);
      if (to) q = q.lte("created_at", `${to}T23:59:59`);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const rows = (data ?? []).map((m) => {
    const p = m.products as { name_ar: string; name_en: string | null; sku: string } | null;
    const w = m.warehouses as { name_ar: string; name_en: string } | null;
    return {
      [t("sku")]: p?.sku ?? "",
      [lang === "ar" ? t("nameAr") : t("nameEn")]: (lang === "ar" ? p?.name_ar : p?.name_en) ?? p?.name_ar ?? "",
      [t("warehouses")]: (lang === "ar" ? w?.name_ar : w?.name_en) ?? "",
      [t("type")]: m.type,
      qty: Number(m.qty),
      before: Number(m.qty_before),
      after: Number(m.qty_after),
      date: new Date(m.created_at).toLocaleString(),
    };
  });

  return (
    <>
      <PageHeader
        title={t("movements")}
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => exportToExcel("movements", rows)}>
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => printReport(t("movements"), rows)}>
              <Printer className="h-4 w-4" />
              PDF
            </Button>
          </div>
        }
      />
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label>{lang === "ar" ? "من تاريخ" : "From"}</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>{lang === "ar" ? "إلى تاريخ" : "To"}</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>
      <Card className="overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              {rows[0] ? (
                Object.keys(rows[0]).map((h) => <TableHead key={h}>{h}</TableHead>)
              ) : (
                <TableHead>{t("movements")}</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell className="py-10 text-center text-muted-foreground">{t("noData")}</TableCell>
              </TableRow>
            )}
            {rows.map((r, i) => (
              <TableRow key={i}>
                {Object.values(r).map((v, j) => (
                  <TableCell key={j}>{String(v)}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}