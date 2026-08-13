import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileSpreadsheet, Printer } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { PageHeader } from "@/components/AppLayout";
import { exportToCsv, exportToExcel, printReport } from "@/lib/export";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "التقارير | مخازن هيربل سبا" },
      { name: "description", content: "تقرير المخزون الحالي وقيمته لكل مخزن مع تصدير Excel و PDF وطباعة." },
      { property: "og:title", content: "التقارير | مخازن هيربل سبا" },
      { property: "og:description", content: "تقارير المخزون والقيمة والتصدير." },
    ],
  }),
  component: Reports,
});

function Reports() {
  const { t, lang } = useI18n();

  const { data } = useQuery({
    queryKey: ["stock-report"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_balances")
        .select("qty, products(sku,name_ar,name_en,purchase_price,min_qty), warehouses(name_ar,name_en,code)");
      if (error) throw error;
      return data;
    },
  });

  const rows = (data ?? []).map((b) => {
    const p = b.products as { sku: string; name_ar: string; name_en: string | null; purchase_price: number; min_qty: number } | null;
    const w = b.warehouses as { name_ar: string; name_en: string; code: string } | null;
    return {
      [t("code")]: w?.code ?? "",
      [t("warehouses")]: (lang === "ar" ? w?.name_ar : w?.name_en) ?? "",
      [t("sku")]: p?.sku ?? "",
      [lang === "ar" ? t("nameAr") : t("nameEn")]: (lang === "ar" ? p?.name_ar : p?.name_en) ?? p?.name_ar ?? "",
      [t("balance")]: Number(b.qty),
      [t("minQty")]: Number(p?.min_qty ?? 0),
      [t("stockValue")]: Number(b.qty) * Number(p?.purchase_price ?? 0),
    };
  });

  return (
    <>
      <PageHeader
        title={t("reports")}
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => exportToExcel("stock-report", rows)}>
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportToCsv("stock-report", rows)}>
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => printReport(t("totalStock"), rows)}>
              <Printer className="h-4 w-4" />
              PDF
            </Button>
          </div>
        }
      />
      <Card className="overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              {rows[0] ? (
                Object.keys(rows[0]).map((h) => <TableHead key={h}>{h}</TableHead>)
              ) : (
                <TableHead>{t("totalStock")}</TableHead>
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